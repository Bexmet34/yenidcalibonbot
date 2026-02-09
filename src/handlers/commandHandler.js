const { MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { DEFAULT_CONTENT } = require('../constants/constants');
const config = require('../config/config');
const { createHelpEmbed } = require('../builders/embedBuilder');
const { buildPvePayload } = require('../builders/payloadBuilder');
const { safeReply } = require('../utils/interactionUtils');
const { hasActiveParty, setActiveParty, getActiveParties, removeActiveParty, getActivePartyCount } = require('../services/partyManager');
const { addToWhitelist, removeFromWhitelist, isWhitelisted } = require('../services/whitelistManager');
const { createClosedButton } = require('../builders/componentBuilder');
const { getEuropeGuildMembers, searchPlayer, getPlayerStats } = require('../services/albionApiService');
const { getUserPrestige, updateUserStats } = require('../services/prestigeManager');
const db = require('../services/db');

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
    const whitelisted = isWhitelisted(userId);
    const partyCount = getActivePartyCount(userId);
    const limit = whitelisted ? 3 : 1;

    if (partyCount >= limit) {
        let errorMsg = whitelisted
            ? `❌ **Limitinize ulaştınız!**\n\nWhite list üyesi olarak en fazla **3** aktif parti açabilirsiniz. Yeni bir parti açmadan önce mevcut partilerinizden birini kapatmalısınız.`
            : `❌ **Zaten aktif bir partiniz var!**\n\nYeni bir parti açmadan önce mevcut partinizi kapatmalısınız. Kapatmak için:\n1️⃣ Mevcut partideki **"Partiyi Kapat"** butonuna basabilir,\n2️⃣ Veya \`/partikapat\` komutunu kullanabilirsiniz.`;

        return await safeReply(interaction, {
            content: errorMsg,
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

        // SAVE TO DB
        try {
            await db.run(
                'INSERT INTO parties (message_id, channel_id, owner_id, type, title) VALUES (?, ?, ?, ?, ?)',
                [msgId, chanId, userId, 'pve', `💰 PVE: ${title}`]
            );
            console.log(`[CommandHandler] Registered PVE Log: User ${userId} -> Party ${msgId}`);
        } catch (err) {
            console.error('[CommandHandler] DB Error:', err.message);
        }
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
        const parties = getActiveParties(userId);

        if (!parties || parties.length === 0) {
            return await safeReply(interaction, {
                content: '❌ **Aktif bir partiniz bulunmuyor.**',
                flags: [MessageFlags.Ephemeral]
            });
        }

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => { });

        let totalClosed = 0;
        for (const partyInfo of parties) {
            const messageId = partyInfo.messageId;
            const channelId = partyInfo.channelId;

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
                        totalClosed++;
                    }
                } catch (err) {
                    console.log(`[CommandHandler] Visual close failed for ${messageId}: ${err.message}`);
                }
            }
            // Clear each one from DB
            removeActiveParty(userId, messageId);
        }

        const responseContent = totalClosed > 0
            ? `✅ **Toplam ${totalClosed} aktif partiniz başarıyla kapatıldı.**\n\n⚠️ **ÖNEMLİ:** Katılımcıları onaylamak ve prestij puanlarını dağıtmak için aşağıdaki listeye göz atın.`
            : '✅ **Aktif partileriniz sistemden temizlendi.**';

        await interaction.editReply({ content: responseContent }).catch(() => { });

        // TRIGGER ATTENDANCE VERIFICATION
        if (totalClosed > 0) {
            const { startAttendanceVerification } = require('./attendanceHandler');
            for (const partyInfo of parties) {
                await startAttendanceVerification(interaction, partyInfo.messageId);
            }
        }

    } catch (error) {
        console.error('[CommandHandler] Critical Error:', error);
        // Fallback: try to clear all for this user
        const parties = getActiveParties(userId);
        parties.forEach(p => removeActiveParty(userId, p.messageId));

        await interaction.followUp({ content: '❌ Bir hata oluştu ama kilitleriniz temizlendi.', flags: [MessageFlags.Ephemeral] }).catch(() => { });
    }
}

/**
 * Handles /wladd command
 */
async function handleWladdCommand(interaction) {
    const targetUser = interaction.options.getUser('kullanici');

    if (addToWhitelist(targetUser.id)) {
        return await safeReply(interaction, {
            content: `✅ **${targetUser.tag}** başarıyla beyaz listeye eklendi. Artık aynı anda **3** parti kurabilir.`,
            flags: [MessageFlags.Ephemeral]
        });
    } else {
        return await safeReply(interaction, {
            content: `❌ **${targetUser.tag}** zaten beyaz listede bulunuyor.`,
            flags: [MessageFlags.Ephemeral]
        });
    }
}

/**
 * Handles /wlremove command
 */
async function handleWlremoveCommand(interaction) {
    const targetUser = interaction.options.getUser('kullanici');

    if (removeFromWhitelist(targetUser.id)) {
        return await safeReply(interaction, {
            content: `✅ **${targetUser.tag}** başarıyla beyaz listeden çıkarıldı. Artık sadece **1** parti kurabilir.`,
            flags: [MessageFlags.Ephemeral]
        });
    } else {
        return await safeReply(interaction, {
            content: `❌ **${targetUser.tag}** beyaz listede bulunamadı.`,
            flags: [MessageFlags.Ephemeral]
        });
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

/**
 * Handles /prestij and /prestij-bak commands
 */
async function handlePrestijCommand(interaction) {
    const targetUser = interaction.options.getUser('kullanici') || interaction.user;
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    try {
        const prestige = await getUserPrestige(targetUser.id);

        const embed = new EmbedBuilder()
            .setTitle(`${prestige.icon} Prestij Seviyesi: ${prestige.name}`)
            .setColor(prestige.minRate > 0 ? '#F1C40F' : '#3498DB')
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: '👤 Kullanıcı', value: `<@${targetUser.id}>`, inline: true },
                { name: '⭐ Toplam Onaylı', value: `\`${prestige.confirmed}\``, inline: true },
                { name: '📊 Genel Oran', value: `\`%${prestige.rate}\``, inline: true },
                { name: '\u200b', value: '⚔️ **İÇERİK DETAYLARI**', inline: false },
                { name: '💰 PVE Katılım', value: `\`${prestige.pveConfirmed}\``, inline: true },
                { name: '⚔️ PVP Katılım', value: `\`${prestige.pvpConfirmed}\``, inline: true },
                { name: '❌ Gelmedi', value: `\`${prestige.noShow}\``, inline: true },
                { name: '\u200b', value: '📈 **İLERLEME VE HEDEF**', inline: false },
                { name: 'Hedef Seviye', value: getNextRankInfo(prestige), inline: false }
            )
            .setFooter({ text: 'PVE/PVP katılım oranları toplam onaylı içindeki dağılımı gösterir.' })
            .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('[Prestij] Hata:', error);
        return await interaction.editReply({ content: '❌ Prestij bilgileri alınırken bir hata oluştu.' });
    }
}

function getNextRankInfo(current) {
    const { RANKS } = require('../services/prestigeManager');
    const nextRank = RANKS.find(r => r.minCount > current.confirmed);

    if (!nextRank) return '🏆 **En yüksek seviyeye ulaştınız!**';

    let info = `Sonraki Seviye: **${nextRank.icon} ${nextRank.name}**\n`;
    info += `Gerekli Katılım: \`${current.confirmed}/${nextRank.minCount}\``;
    if (nextRank.minRate > 0) info += `\nGerekli Oran: \`%${nextRank.minRate}\``;

    return info;
}

/**
 * Creates prestige leaderboard page embed
 */
async function createPrestigePageEmbed(page = 0, topOnly = false) {
    const pageSize = 10;
    const offset = page * pageSize;

    let allUsers;
    if (topOnly) {
        allUsers = await db.all('SELECT * FROM user_stats ORDER BY confirmed_count DESC LIMIT 10');
    } else {
        allUsers = await db.all('SELECT * FROM user_stats ORDER BY confirmed_count DESC');
    }

    if (allUsers.length === 0) {
        return null;
    }

    const currentPageUsers = topOnly ? allUsers : allUsers.slice(offset, offset + pageSize);
    const totalPages = topOnly ? 1 : Math.ceil(allUsers.length / pageSize);

    const embed = new EmbedBuilder()
        .setTitle('🏆 Prestij Liderlik Tablosu')
        .setColor('#F1C40F')
        .setDescription(topOnly
            ? 'Sunucudaki en aktif ve güvenilir ilk 10 oyuncu:'
            : `Sunucudaki tüm oyuncular (Sayfa ${page + 1}/${totalPages}):`)
        .setTimestamp();

    let listText = '';
    for (let i = 0; i < currentPageUsers.length; i++) {
        const user = currentPageUsers[i];
        const stats = await getUserPrestige(user.user_id);
        const rank = topOnly ? i + 1 : offset + i + 1;
        listText += `**${rank}.** ${stats.icon} <@${user.user_id}> - \`${user.confirmed_count}\` Katılım (%${stats.rate})\n`;
    }

    embed.addFields({ name: 'Sıralama', value: listText });

    return { embed, totalPages, currentPage: page, totalUsers: allUsers.length };
}

/**
 * Handles /prestij-liste command
 */
async function handlePrestijListeCommand(interaction) {
    await interaction.deferReply();

    try {
        const result = await createPrestigePageEmbed(0, false);

        if (!result) {
            return await interaction.editReply({ content: 'ℹ️ Henüz prestij verisi bulunmuyor.' });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prestige_top10')
                .setLabel('🏆 İlk 10')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('prestige_prev_0')
                .setLabel('⬅️ Önceki')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('prestige_next_0')
                .setLabel('Sonraki ➡️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(result.totalPages <= 1)
        );

        return await interaction.editReply({ embeds: [result.embed], components: [row] });
    } catch (error) {
        console.error('[PrestijListe] Hata:', error);
        return await interaction.editReply({ content: '❌ Liste alınırken bir hata oluştu.' });
    }
}

/**
 * Handles /prestij-bilgi command
 */
async function handlePrestijBilgiCommand(interaction) {
    const { RANKS } = require('../services/prestigeManager');

    const embed = new EmbedBuilder()
        .setTitle('⭐ Prestij Sistemi ve Rütbeler')
        .setColor('#F1C40F')
        .setDescription('Sunucumuzda katılım sağladığınız her parti için prestij kazanırsınız. İşte rütbe detayları:')
        .setThumbnail('https://render.albiononline.com/v1/spell/PLAYER_PORTRAIT_FARMER.png');

    let rankInfo = '';
    RANKS.forEach(rank => {
        rankInfo += `**${rank.icon} ${rank.name}**\n`;
        rankInfo += `└ Şart: \`${rank.minCount}\` Katılım`;
        if (rank.minRate > 0) rankInfo += ` + \`%${rank.minRate}\` Oran`;
        rankInfo += '\n\n';
    });

    embed.addFields(
        { name: '📊 Rütbe Listesi', value: rankInfo },
        { name: '⚠️ Bilgilendirme', value: '• **Normal** ile **Enchant III** arası rütbelerden geri düşüş yoktur.\n• **Exceptional** ve üzeri rütbeler için katılım oranınızı yüksek tutmalısınız.\n• Oranınız düşerse rütbeniz de düşer.' }
    );

    return await safeReply(interaction, { embeds: [embed], flags: [MessageFlags.Ephemeral] });
}

module.exports = {
    handleYardimCommand,
    handlePveCommand,
    handlePartikapatCommand,
    handleUyelerCommand,
    handleMeCommand,
    handleWladdCommand,
    handleWlremoveCommand,
    handlePrestijCommand,
    handlePrestijListeCommand,
    handlePrestijBilgiCommand,
    createMemberPageEmbed,
    createPrestigePageEmbed
};
