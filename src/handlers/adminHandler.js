const db = require('../services/db');
const { isWhitelisted } = require('../services/whitelistManager');
const { MessageFlags } = require('discord.js');

/**
 * Admin-only command to add prestige points
 */
async function handlePrestijEkleCommand(interaction) {
    if (!isWhitelisted(interaction.user.id)) {
        return await interaction.reply({
            content: '❌ Bu komutu kullanma yetkiniz yok.',
            flags: [MessageFlags.Ephemeral]
        });
    }

    const targetUser = interaction.options.getUser('kullanici');
    const amount = interaction.options.getInteger('miktar');
    const type = interaction.options.getString('tur') || 'pve';

    try {
        const stats = await db.get('SELECT * FROM user_stats WHERE user_id = ?', [targetUser.id]);
        const isPve = type === 'pve';

        if (!stats) {
            await db.run(
                'INSERT INTO user_stats (user_id, confirmed_count, pve_confirmed, pvp_confirmed, no_show_count, total_participated) VALUES (?, ?, ?, ?, ?, ?)',
                [targetUser.id, amount, isPve ? amount : 0, isPve ? 0 : amount, 0, amount]
            );
        } else {
            const newConfirmed = stats.confirmed_count + amount;
            const newPve = (stats.pve_confirmed || 0) + (isPve ? amount : 0);
            const newPvp = (stats.pvp_confirmed || 0) + (isPve ? 0 : amount);
            const newTotal = stats.total_participated + amount;

            await db.run(
                'UPDATE user_stats SET confirmed_count = ?, pve_confirmed = ?, pvp_confirmed = ?, total_participated = ?, last_updated = CURRENT_TIMESTAMP WHERE user_id = ?',
                [newConfirmed, newPve, newPvp, newTotal, targetUser.id]
            );
        }

        // Update nickname
        const { updateUserNickname } = require('../services/nicknameManager');
        await updateUserNickname(interaction.guild, targetUser.id);

        await interaction.reply({
            content: `✅ **${targetUser.tag}** kullanıcısına **${amount}** ${type.toUpperCase()} prestij eklendi.`,
            flags: [MessageFlags.Ephemeral]
        });
    } catch (error) {
        console.error('[PrestijEkle] Error:', error);
        await interaction.reply({
            content: '❌ Prestij eklenirken bir hata oluştu.',
            flags: [MessageFlags.Ephemeral]
        });
    }
}

/**
 * Admin-only command to remove prestige points
 */
async function handlePrestijSilCommand(interaction) {
    if (!isWhitelisted(interaction.user.id)) {
        return await interaction.reply({
            content: '❌ Bu komutu kullanma yetkiniz yok.',
            flags: [MessageFlags.Ephemeral]
        });
    }

    const targetUser = interaction.options.getUser('kullanici');
    const amount = interaction.options.getInteger('miktar');
    const type = interaction.options.getString('tur') || 'pve';

    try {
        const stats = await db.get('SELECT * FROM user_stats WHERE user_id = ?', [targetUser.id]);
        if (!stats) {
            return await interaction.reply({
                content: '❌ Bu kullanıcının prestij kaydı bulunmuyor.',
                flags: [MessageFlags.Ephemeral]
            });
        }

        const isPve = type === 'pve';
        const newConfirmed = Math.max(0, stats.confirmed_count - amount);
        const newPve = Math.max(0, (stats.pve_confirmed || 0) - (isPve ? amount : 0));
        const newPvp = Math.max(0, (stats.pvp_confirmed || 0) - (isPve ? 0 : amount));

        await db.run(
            'UPDATE user_stats SET confirmed_count = ?, pve_confirmed = ?, pvp_confirmed = ?, last_updated = CURRENT_TIMESTAMP WHERE user_id = ?',
            [newConfirmed, newPve, newPvp, targetUser.id]
        );

        // Update nickname
        const { updateUserNickname } = require('../services/nicknameManager');
        await updateUserNickname(interaction.guild, targetUser.id);

        await interaction.reply({
            content: `✅ **${targetUser.tag}** kullanıcısından **${amount}** ${type.toUpperCase()} prestij silindi.`,
            flags: [MessageFlags.Ephemeral]
        });
    } catch (error) {
        console.error('[PrestijSil] Error:', error);
        await interaction.reply({
            content: '❌ Prestij silinirken bir hata oluştu.',
            flags: [MessageFlags.Ephemeral]
        });
    }
}

/**
 * Admin-only command to reset user prestige
 */
async function handlePrestijSifirlaCommand(interaction) {
    if (!isWhitelisted(interaction.user.id)) {
        return await interaction.reply({
            content: '❌ Bu komutu kullanma yetkiniz yok.',
            flags: [MessageFlags.Ephemeral]
        });
    }

    const targetUser = interaction.options.getUser('kullanici');

    try {
        await db.run('DELETE FROM user_stats WHERE user_id = ?', [targetUser.id]);

        // Remove prestige icon from nickname
        const { removePrestigeFromNickname } = require('../services/nicknameManager');
        await removePrestigeFromNickname(interaction.guild, targetUser.id);

        await interaction.reply({
            content: `✅ **${targetUser.tag}** kullanıcısının tüm prestij verileri sıfırlandı.`,
            flags: [MessageFlags.Ephemeral]
        });
    } catch (error) {
        console.error('[PrestijSifirla] Error:', error);
        await interaction.reply({
            content: '❌ Prestij sıfırlanırken bir hata oluştu.',
            flags: [MessageFlags.Ephemeral]
        });
    }
}

module.exports = {
    handlePrestijEkleCommand,
    handlePrestijSilCommand,
    handlePrestijSifirlaCommand
};
