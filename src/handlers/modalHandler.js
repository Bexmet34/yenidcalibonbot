const { buildPartikurPayload } = require('../builders/payloadBuilder');
const { safeReply } = require('../utils/interactionUtils');
const { MessageFlags } = require('discord.js');
const { hasActiveParty, setActiveParty } = require('../services/partyManager');
const { getEuropeGuildMembers } = require('../services/albionApiService');

/**
 * Handles modal submission for custom party creation
 */
async function handlePartiModal(interaction) {
    if (interaction.customId === 'parti_modal') {
        const userId = interaction.user.id;

        if (hasActiveParty(userId)) {
            return await interaction.reply({
                content: '❌ **Zaten aktif bir partiniz var!**\n\nYeni bir parti açmadan önce mevcut partinizi kapatmalısınız. Kapatmak için:\n1️⃣ Mevcut partideki **"Partiyi Kapat"** butonuna basabilir,\n2️⃣ Veya `/partikapat` komutunu kullanabilirsiniz.',
                flags: [MessageFlags.Ephemeral]
            });
        }

        const header = interaction.fields.getTextInputValue('party_header');
        const rolesRaw = interaction.fields.getTextInputValue('party_roles');
        const rolesList = rolesRaw.split('\n').map(r => r.trim()).filter(r => r.length > 0);

        // Send and capture message
        const msg = await safeReply(interaction, { content: '@everyone', ...buildPartikurPayload(header, rolesList, userId) });

        const msgId = msg?.id;
        const chanId = msg?.channelId || interaction.channelId;

        if (msgId) {
            setActiveParty(userId, msgId, chanId);
            console.log(`[ModalHandler] Registered: User ${userId} -> Party ${msgId}`);
        } else {
            console.log(`[ModalHandler] ⚠️ Failed to register party in DB (No ID captured).`);
        }
    }

    // Handles registration modal
    if (interaction.customId.startsWith('modal_register_')) {
        const roleId = interaction.customId.split('_')[2];
        const ign = interaction.fields.getTextInputValue('register_ign');
        const realName = interaction.fields.getTextInputValue('register_realname');

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            const guildId = 'qw4DHcDZSz-LOvHAQlsOGw';
            const members = await getEuropeGuildMembers(guildId);

            // Check if IGN exists in guild members (Case-sensitive as requested)
            const isMember = members.some(m => m.Name === ign);

            if (isMember) {
                const role = interaction.guild.roles.cache.get(roleId);
                if (role) {
                    await interaction.member.roles.add(role);

                    // Optional: Change nickname to [IGN] RealName
                    try {
                        await interaction.member.setNickname(`${ign} (${realName})`);
                    } catch (e) {
                        console.log('Yetki yetersizliği nedeniyle takma ad değiştirilemedi.');
                    }

                    return await interaction.editReply({
                        content: `✅ **Kayıt Başarılı!**\n\nHoş geldin **${ign}**! Loncada olduğun teyit edildi ve <@&${roleId}> rolün verildi.`
                    });
                } else {
                    return await interaction.editReply({ content: '❌ Kayıt rolü sunucuda bulunamadı. Lütfen yetkililere bildirin.' });
                }
            } else {
                return await interaction.editReply({
                    content: `❌ **Kayıt Reddedildi!**\n\n**${ign}** ismiyle bir oyuncu loncamızda bulunamadı. Lütfen isminizi büyük-küçük harf dikkat ederek tekrar girin veya önce loncaya katılın.`
                });
            }
        } catch (error) {
            console.error('[Registration] Error:', error);
            return await interaction.editReply({ content: '❌ Kayıt işlemi sırasında bir hata oluştu.' });
        }
    }
}

module.exports = {
    handlePartiModal
};
