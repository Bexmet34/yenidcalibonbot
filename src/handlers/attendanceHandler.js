const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../services/db');
const { updateUserStats } = require('../services/prestigeManager');

// Store noshow selections temporarily in memory
const noShowSelections = new Map();

/**
 * Starts the attendance verification process for a party
 */
async function startAttendanceVerification(interaction, messageId) {
    try {
        const party = await db.get('SELECT * FROM parties WHERE message_id = ?', [messageId]);
        if (!party) return;

        // Database Source of Truth: Get participants from DB
        const dbParticipants = await db.all('SELECT DISTINCT user_id, role FROM party_members WHERE party_id = ? AND user_id IS NOT NULL', [party.id]);

        if (dbParticipants.length === 0) {
            return await interaction.followUp({
                content: `ℹ️ **${party.title}** partisinde kimse kayıtlı olmadığı için doğrulama atlandı.`,
                flags: [MessageFlags.Ephemeral]
            });
        }

        const participants = dbParticipants.map(p => ({
            id: p.user_id,
            role: p.role || 'Üye'
        }));

        const verificationEmbed = new EmbedBuilder()
            .setTitle('🎯 Katılım Doğrulama')
            .setDescription(`**${party.title}** partisi için katılımcıları doğrulayın.\n\n` +
                `Aşağıdaki listeden **GELMEYENLERİ** seçin ve ardından 'Doğrulamayı Tamamla' butonuna basın.\n` +
                `Hiç seçim yapmazsanız herkes 'GELDI' olarak işaretlenir.`)
            .setColor('#F1C40F');

        // Check if there are unique participants to avoid duplicates in select menu
        const uniqueParticipants = Array.from(new Map(participants.map(p => [p.id, p])).values());

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`verify_noshow:${messageId}`)
            .setPlaceholder('Gelmedi olarak işaretle (Seçim zorunlu değil)')
            .setMinValues(0)
            .setMaxValues(uniqueParticipants.length)
            .addOptions(uniqueParticipants.map(p => {
                const member = interaction.guild.members.cache.get(p.id);
                const displayName = member ? (member.nickname || member.user.globalName || member.user.username) : `ID: ${p.id.substring(0, 8)}`;
                return {
                    label: `${displayName}`,
                    value: p.id,
                    description: `Rol: ${p.role}`
                };
            }));

        const row1 = new ActionRowBuilder().addComponents(selectMenu);
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`verify_confirm:${messageId}`)
                .setLabel('✅ Doğrulamayı Tamamla')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`verify_cancel:${messageId}`)
                .setLabel('❌ Partiyi İptal Et')
                .setStyle(ButtonStyle.Danger)
        );

        await interaction.followUp({
            embeds: [verificationEmbed],
            components: [row1, row2],
            flags: [MessageFlags.Ephemeral]
        });

    } catch (error) {
        console.error('[Attendance] Start Error:', error);
    }
}

/**
 * Handles interactions for the verification process
 */
async function handleVerificationInteraction(interaction) {
    const customId = interaction.customId;

    if (customId.startsWith('verify_noshow:')) {
        const messageId = customId.split(':')[1];
        noShowSelections.set(`${interaction.user.id}:${messageId}`, interaction.values);
        await interaction.reply({ content: `✅ **${interaction.values.length}** kişi 'GELMEDİ' olarak işaretlendi. Şimdi onaylayın.`, flags: [MessageFlags.Ephemeral] });
    }
    else if (customId.startsWith('verify_confirm:')) {
        const messageId = customId.split(':')[1];
        await interaction.deferUpdate();

        const selectionKey = `${interaction.user.id}:${messageId}`;
        const noshows = noShowSelections.get(selectionKey) || [];

        try {
            const party = await db.get('SELECT * FROM parties WHERE message_id = ?', [messageId]);

            // Database Source of Truth: Get participants from DB
            const dbParticipants = await db.all('SELECT DISTINCT user_id FROM party_members WHERE party_id = ? AND user_id IS NOT NULL', [party.id]);
            const participants = dbParticipants.map(p => p.user_id);

            if (participants.length === 0) {
                await interaction.editReply({
                    content: `⚠️ **Uyarı:** Veritabanında kayıtlı katılımcı bulunamadı.`,
                    embeds: [],
                    components: []
                });
                return;
            }

            // Update DB and Stats
            let confirmedCount = 0;
            let noShowCount = 0;

            for (const userId of participants) {
                const isConfirmed = !noshows.includes(userId);
                if (isConfirmed) confirmedCount++;
                else noShowCount++;

                // Update status in party_members (don't insert duplicates)
                await db.run('UPDATE party_members SET status = ? WHERE party_id = ? AND user_id = ?',
                    [isConfirmed ? 'confirmed' : 'no_show', party.id, userId]);

                // Update User Global Stats
                await updateUserStats(userId, isConfirmed, party.type, interaction.guild);
            }

            // Verification Complete Log
            console.log(`[Attendance] Party ${party.id} verified. Confirmed: ${confirmedCount}, NoShow: ${noShowCount}`);

            await db.run('UPDATE parties SET status = "verified" WHERE id = ?', [party.id]);
            noShowSelections.delete(selectionKey);

            await interaction.editReply({
                content: `✅ **Doğrulama Tamamlandı!**\nToplam **${participants.length}** katılımcı işlendi.\n✅ Gelen: **${confirmedCount}**\n❌ Gelmeyen: **${noShowCount}**`,
                embeds: [],
                components: []
            });

        } catch (error) {
            console.error('[Attendance] Confirm Error:', error);
            await interaction.followUp({ content: '❌ Doğrulama sırasında bir hata oluştu.', flags: [MessageFlags.Ephemeral] });
        }
    }
    else if (customId.startsWith('verify_cancel:')) {
        const messageId = customId.split(':')[1];
        await interaction.deferUpdate();

        await db.run('UPDATE parties SET status = "cancelled" WHERE message_id = ?', [messageId]);
        noShowSelections.delete(`${interaction.user.id}:${messageId}`);

        await interaction.editReply({
            content: `🚫 **Parti İptal Edildi.** Katılım kayıtları işlenmedi.`,
            embeds: [],
            components: []
        });
    }
}

module.exports = {
    startAttendanceVerification,
    handleVerificationInteraction
};
