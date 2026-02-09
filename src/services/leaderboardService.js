const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('./db');
const { getUserPrestige } = require('./prestigeManager');

/**
 * Updates or creates the leaderboard message
 */
async function updateLeaderboard(client) {
    try {
        const channelIdRow = await db.get('SELECT value FROM system_settings WHERE key = "leaderboard_channel_id"');
        const messageIdRow = await db.get('SELECT value FROM system_settings WHERE key = "leaderboard_message_id"');

        if (!channelIdRow) return; // Not set up yet

        const channel = await client.channels.fetch(channelIdRow.value);
        if (!channel) return;

        const { podiumEmbed, listEmbed } = await createLeaderboardEmbeds(client);
        const components = createLeaderboardButtons();

        if (messageIdRow) {
            try {
                const message = await channel.messages.fetch(messageIdRow.value);
                await message.edit({ embeds: [podiumEmbed, listEmbed], components: [components] });
            } catch (err) {
                // Message missing, send new
                const msg = await channel.send({ embeds: [podiumEmbed, listEmbed], components: [components] });
                await db.run('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['leaderboard_message_id', msg.id]);
            }
        } else {
            const msg = await channel.send({ embeds: [podiumEmbed, listEmbed], components: [components] });
            await db.run('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['leaderboard_message_id', msg.id]);
        }

        console.log('[Leaderboard] Updated successfully.');

    } catch (error) {
        console.error('[Leaderboard] Update Error:', error);
    }
}

/**
 * Generates the podium and list embeds
 */
async function createLeaderboardEmbeds(client) {
    const allUsers = await db.all('SELECT * FROM user_stats ORDER BY confirmed_count DESC LIMIT 15');

    // --- PODIUM EMBED (Top 3) ---
    const podiumEmbed = new EmbedBuilder()
        .setTitle('🏆 PRESTİJ ZİRVESİ (TOP 3)')
        .setColor('#FFD700') // Gold
        .setThumbnail('https://render.albiononline.com/v1/spell/PLAYER_PORTRAIT_FARMER.png')
        .setDescription('En yüksek katılım ve güven oranına sahip lider oyuncular.');

    if (allUsers.length > 0) {
        const top3 = allUsers.slice(0, 3);
        let podiumDesc = '';

        for (let i = 0; i < top3.length; i++) {
            const u = top3[i];
            const stats = await getUserPrestige(u.user_id);
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';

            // Fetch name from cache if possible
            let name = `<@${u.user_id}>`;

            podiumDesc += `### ${medal} ${name}\n`;
            podiumDesc += `> ${stats.icon} **${stats.name}**\n`;
            podiumDesc += `> ⚔️ **Toplam:** \`${u.confirmed_count}\` • Oran: \`%${stats.rate}\`\n`;
            podiumDesc += `> 🛡️ **PVE:** \`${u.pve_confirmed}\` • 💀 **PVP:** \`${u.pvp_confirmed}\`\n\n`;
        }
        podiumEmbed.setDescription(podiumDesc);
    } else {
        podiumEmbed.setDescription('Henüz veri yok.');
    }

    // --- LIST EMBED (4-15) ---
    const listEmbed = new EmbedBuilder()
        .setTitle('📜 SIRALAMA LİSTESİ (4-15)')
        .setColor('#2C3E50') // Dark Blue
        .setFooter({ text: 'Veriler anlık olarak güncellenmektedir.' })
        .setTimestamp();

    if (allUsers.length > 3) {
        const others = allUsers.slice(3, 15);
        let listDesc = '';

        for (let i = 0; i < others.length; i++) {
            const u = others[i];
            const stats = await getUserPrestige(u.user_id);
            listDesc += `**${i + 4}.** ${stats.icon} <@${u.user_id}>\n`;
            listDesc += `└ \`Toplam: ${u.confirmed_count}\` (PVE: ${u.pve_confirmed} | PVP: ${u.pvp_confirmed}) • %${stats.rate}\n`;
        }
        listEmbed.setDescription(listDesc);
    } else {
        listEmbed.setDescription('Listelenecek başka oyuncu yok.');
    }

    return { podiumEmbed, listEmbed };
}

function createLeaderboardButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('lb_refresh')
            .setLabel('🔄 Yenile')
            .setStyle(ButtonStyle.Secondary)
    );
}

module.exports = {
    updateLeaderboard
};
