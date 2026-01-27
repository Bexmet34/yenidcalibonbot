const { MessageFlags, EmbedBuilder } = require('discord.js');
const { DEFAULT_CONTENT } = require('../constants/constants');
const { createHelpEmbed } = require('../builders/embedBuilder');
const { buildPvePayload } = require('../builders/payloadBuilder');
const { safeReply } = require('../utils/interactionUtils');
const { hasActiveParty, setActiveParty, getActiveParty, removeActiveParty } = require('../services/partyManager');
const { createClosedButton } = require('../builders/componentBuilder');

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
                    const closedEmbed = EmbedBuilder.from(message.embeds[0])
                        .setTitle(`${message.embeds[0].title} [KAPALI]`)
                        .setColor('#808080')
                        .setFooter({ text: '⛔ Bu başvuru komut ile kapatıldı.' });

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

module.exports = {
    handleYardimCommand,
    handlePveCommand,
    handlePartikapatCommand
};
