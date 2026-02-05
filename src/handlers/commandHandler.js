const { MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { DEFAULT_CONTENT } = require('../constants/constants');
const config = require('../config/config');
const { createHelpEmbed } = require('../builders/embedBuilder');
const { buildPvePayload } = require('../builders/payloadBuilder');
const { safeReply } = require('../utils/interactionUtils');
const { hasActiveParty, setActiveParty, getActiveParty, removeActiveParty } = require('../services/partyManager');
const { createClosedButton } = require('../builders/componentBuilder');
const { getEuropeGuildMembers, searchPlayer, getPlayerStats } = require('../services/albionApiService');

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
 * Handles /me command
 */
async function handleMeCommand(interaction) {
    let ign = interaction.options.getString('isim');

    // Eğer isim girilmediyse, kullanıcının nickname'inden çekmeyi dene (İsim (Gerçek İsim) formatı)
    if (!ign) {
        const nickname = interaction.member.nickname || interaction.member.user.globalName || interaction.member.user.username;
        ign = nickname.split(' ')[0].replace(/[()]/g, '');
    }

    await interaction.deferReply();

    try {
        // 1. Oyuncuyu ara ve ID'sini bul
        const playerData = await searchPlayer(ign);
        if (!playerData) {
            return await interaction.editReply({ content: `❌ **${ign}** isminde bir oyuncu Avrupa sunucusunda bulunamadı.` });
        }

        // 2. ID ile detaylı istatistikleri çek
        const stats = await getPlayerStats(playerData.Id);

        const pve = stats.LifetimeStatistics?.PvE || {};
        const pvp = stats.LifetimeStatistics?.PvP || {};
        const gathering = stats.LifetimeStatistics?.Gathering || {};

        const killFame = pvp.KillFame || 0;
        const deathFame = pvp.DeathFame || 0;
        const kd = deathFame > 0 ? (killFame / deathFame).toFixed(2) : killFame.toFixed(2);

        const embed = new EmbedBuilder()
            .setTitle(`👤 Oyuncu Profili: ${stats.Name}`)
            .setColor('#3498DB')
            .setThumbnail(`https://render.albiononline.com/v1/spell/PLAYER_PORTRAIT_FARMER.png`) // Geçici ikon
            .addFields(
                { name: '🏰 Lonca', value: stats.GuildName || 'Yok', inline: true },
                { name: '🆔 Player-ID', value: `\`${stats.Id}\``, inline: true },
                { name: '⭐ Total Fame', value: (stats.KillFame || 0).toLocaleString(), inline: true },

                { name: '\u200b', value: '⚔️ **PVP İSTATİSTİKLERİ**', inline: false },
                { name: '💀 Kill Fame', value: killFame.toLocaleString(), inline: true },
                { name: '⚰️ Death Fame', value: deathFame.toLocaleString(), inline: true },
                { name: '📊 K/D', value: kd.toString(), inline: true },

                { name: '\u200b', value: '🏹 **PVE İSTATİSTİKLERİ**', inline: false },
                { name: 'Total PVE', value: (pve.Total || 0).toLocaleString(), inline: true },
                { name: 'Royals', value: (pve.Royal || 0).toLocaleString(), inline: true },
                { name: 'Outlands', value: (pve.Outlands || 0).toLocaleString(), inline: true },
                { name: 'Avalon', value: (pve.Avalon || 0).toLocaleString(), inline: true },
                { name: 'Corrupted', value: (pve.CorruptedDungeon || 0).toLocaleString(), inline: true },
                { name: 'Mists', value: (pve.Mists || 0).toLocaleString(), inline: true },

                { name: '\u200b', value: '⛏️ **TOPLAYICILIK & DİĞER**', inline: false },
                { name: 'Gathering Total', value: (gathering.All?.Total || 0).toLocaleString(), inline: true },
                { name: 'Fiber', value: (gathering.Fiber?.Total || 0).toLocaleString(), inline: true },
                { name: 'Hide', value: (gathering.Hide?.Total || 0).toLocaleString(), inline: true },
                { name: 'Ore', value: (gathering.Ore?.Total || 0).toLocaleString(), inline: true },
                { name: 'Stone', value: (gathering.Rock?.Total || 0).toLocaleString(), inline: true },
                { name: 'Wood', value: (gathering.Wood?.Total || 0).toLocaleString(), inline: true },

                { name: 'Crafting', value: (stats.LifetimeStatistics?.Crafting?.Total || 0).toLocaleString(), inline: true },
                { name: 'Fishing', value: (stats.LifetimeStatistics?.FishingFame || 0).toLocaleString(), inline: true },
                { name: 'Farming', value: (stats.LifetimeStatistics?.FarmingFame || 0).toLocaleString(), inline: true }
            )
            .setFooter({ text: 'Veriler Albion Online Avrupa API üzerinden anlık alınmıştır.' })
            .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('[MeCommand] Hata:', error);
        return await interaction.editReply({ content: `❌ İstatistikler çekilirken bir hata oluştu: ${error.message}` });
    }
}

module.exports = {
    handleYardimCommand,
    handlePveCommand,
    handlePartikapatCommand,
    handleUyelerCommand,
    handleMeCommand,
    createMemberPageEmbed
};
