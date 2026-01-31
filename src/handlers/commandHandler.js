const { MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { DEFAULT_CONTENT } = require('../constants/constants');
const config = require('../config/config');
const { createHelpEmbed } = require('../builders/embedBuilder');
const { buildPvePayload } = require('../builders/payloadBuilder');
const { safeReply } = require('../utils/interactionUtils');
const { hasActiveParty, setActiveParty, getActiveParty, removeActiveParty } = require('../services/partyManager');
const { createClosedButton } = require('../builders/componentBuilder');
const { getEuropeGuildMembers } = require('../services/albionApiService');

/**
 * Handles /yardim command
 */
async function handleYardimCommand(interaction) {
    const helpEmbed = createHelpEmbed();
    return await safeReply(interaction, { embeds: [helpEmbed], flags: [MessageFlags.Ephemeral] });
}

/**
 * Handles /pve command
 */
async function handlePveCommand(interaction) {
    const userId = interaction.user.id;

    if (hasActiveParty(userId)) {
        return await safeReply(interaction, {
            content: '❌ **Zaten aktif bir partiniz var!**\n\nYeni bir parti açmadan önce mevcut partinizi kapatmalısınız. Kapatmak için:\n1️⃣ Mevcut partideki **"Partiyi Kapat"** butonuna basabilir,\n2️⃣ Veya `/partikapat` komutunu kullanabilirsiniz.',
            flags: [MessageFlags.Ephemeral]
        });
    }

    const title = interaction.options.getString('başlık');
    const details = interaction.options.getString('detaylar');
    const content = interaction.options.getString('içerik') || DEFAULT_CONTENT;
    const dpsCount = interaction.options.getInteger('dps_sayısı') || 4;

    const payload = buildPvePayload(title, details, content, dpsCount, userId);

    // Explicit return to msg
    const msg = await safeReply(interaction, { content: '@everyone', ...payload });

    // Ensure we have IDs before setting active party
    const msgId = msg?.id;
    const chanId = msg?.channelId || interaction.channelId;

    if (msgId) {
        setActiveParty(userId, msgId, chanId);
        console.log(`[CommandHandler] Registered: User ${userId} -> Party ${msgId}`);
    } else {
        console.log(`[CommandHandler] ⚠️ Failed to register party in DB because message ID was not captured.`);
    }
}

/**
 * Handles /partikapat command
 */
async function handlePartikapatCommand(interaction) {
    const userId = interaction.user.id;
    console.log(`[CommandHandler] /partikapat triggered by ${interaction.user.tag}`);

    try {
        const partyInfo = getActiveParty(userId);

        if (!partyInfo) {
            return await safeReply(interaction, {
                content: '❌ **Aktif bir partiniz bulunmuyor.**',
                flags: [MessageFlags.Ephemeral]
            });
        }

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => { });

        const messageId = typeof partyInfo === 'object' ? partyInfo.messageId : partyInfo;
        const channelId = typeof partyInfo === 'object' ? partyInfo.channelId : null;

        let closedVisually = false;

        if (channelId && messageId) {
            try {
                const channel = await interaction.client.channels.fetch(channelId);
                const message = await channel?.messages.fetch(messageId);

                if (message && message.embeds[0]) {
                    const oldEmbed = message.embeds[0];
                    const newFields = oldEmbed.fields.filter(f => !f.name.includes('📌') && !f.name.includes('KURALLAR'));
                    const closedEmbed = EmbedBuilder.from(oldEmbed)
                        .setTitle(`${oldEmbed.title} [KAPALI]`)
                        .setColor('#808080')
                        .setFields(newFields)
                        .setFooter(null)
                        .setTimestamp(null);

                    const closedRow = createClosedButton();
                    await message.edit({ embeds: [closedEmbed], components: [closedRow] });
                    closedVisually = true;
                }
            } catch (err) {
                console.log(`[CommandHandler] Visual close failed (Message might be deleted): ${err.message}`);
            }
        }

        // ALWAYS CLEAR DB
        removeActiveParty(userId);

        const responseContent = closedVisually
            ? '✅ **Aktif partiniz başarıyla kapatıldı.**'
            : '✅ **Aktif partiniz sistemden temizlendi.** (Not: Mesaj güncellenemedi ama kilit kaldırıldı.)';

        await interaction.editReply({ content: responseContent }).catch(() => { });

    } catch (error) {
        console.error('[CommandHandler] Critical Error:', error);
        removeActiveParty(userId);
        await interaction.followUp({ content: '❌ Bir hata oluştu ama kilidiniz temizlendi.', flags: [MessageFlags.Ephemeral] }).catch(() => { });
    }
}

/**
 * Pagination helper for member list
 */
function createMemberPageEmbed(members, page = 0) {
    const pageSize = 20;
    const start = page * pageSize;
    const end = start + pageSize;
    const currentMembers = members.slice(start, end);
    const totalPages = Math.ceil(members.length / pageSize);

    const embed = new EmbedBuilder()
        .setTitle('🛡️ Turquoise Lonca Üyeleri')
        .setColor('#2ECC71')
        .setDescription(`**Toplam Üye:** ${members.length}\n**Sayfa:** ${page + 1} / ${totalPages}\n\n${currentMembers.map(m => `• ${m.Name}`).join('\n')}`);

    return embed;
}

/**
 * Handles /uyeler command
 */
async function handleUyelerCommand(interaction) {
    const guildId = 'qw4DHcDZSz-LOvHAQlsOGw';
    await interaction.deferReply();

    try {
        const { getEuropeGuildMembers } = require('../services/albionApiService');
        const members = await getEuropeGuildMembers(guildId);
        // Sort alphabetically
        members.sort((a, b) => a.Name.localeCompare(b.Name));

        const embed = createMemberPageEmbed(members, 0);

        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('members_prev_0')
                .setLabel('⬅️ Geri')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(`members_next_0`)
                .setLabel('İleri ➡️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(members.length <= 20)
        );

        return await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
        console.error('[Uyeler] Hata:', error);
        return await interaction.editReply({ content: `❌ Üye listesi alınırken bir hata oluştu: ${error.message}` });
    }
}

/**
 * Handles /kayitsistemi command
 */
async function handleKayitSistemiCommand(interaction) {
    // Whitelist check
    if (!config.WHITELIST_USERS.includes(interaction.user.id)) {
        return await interaction.reply({
            content: '❌ **Bu komutu kullanmak için yetkiniz bulunmuyor!**',
            flags: [MessageFlags.Ephemeral]
        });
    }

    const role = interaction.options.getRole('rol');
    const channel = interaction.options.getChannel('kanal');

    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    try {
        const embed = new EmbedBuilder()
            .setTitle('🛡️ Turquoise Lonca Kayıt Sistemi')
            .setDescription('Loncaya kayıt olmak ve yetkilerinizi almak için aşağıdaki butona tıklayın.\n\n**Not:** Kayıt sırasında Albion oyun içi adınızı tam olarak girmeniz gerekmektedir.')
            .setColor('#3498DB');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`setup_register_${role.id}`)
                .setLabel('Kayıt Ol')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📝')
        );

        await channel.send({ embeds: [embed], components: [row] });

        return await interaction.editReply({
            content: `✅ Kayıt sistemi başarıyla kuruldu!\n📍 Kanal: ${channel}\n🛡️ Rol: ${role}`
        });
    } catch (error) {
        console.error('[KayitSistemi] Hata:', error);
        return await interaction.editReply({ content: '❌ Kayıt sistemi kurulurken bir hata oluştu.' });
    }
}

module.exports = {
    handleYardimCommand,
    handlePveCommand,
    handlePartikapatCommand,
    handleUyelerCommand,
    handleKayitSistemiCommand,
    createMemberPageEmbed
};
