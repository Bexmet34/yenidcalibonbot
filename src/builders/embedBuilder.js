const { EmbedBuilder } = require('discord.js');
const { NOTLAR_METNI, ROLE_ICONS } = require('../constants/constants');

/**
 * Creates a PVE embed
 */
/**
 * Creates a PVE embed
 */
function createEmbed(title, details, content, roles, isClosed = false) {
    const cleanTitle = title.replace(/^🛡️ Turquoise \| /, '').replace(/ \[KAPALI\]$/, '');

    // Build description with better formatting
    let description = `📋 **Detaylar:**\n${details}\n\n`;
    description += `🎯 **İçerik:**\n${content}`;

    const embed = new EmbedBuilder()
        .setTitle(`🛡️ Turquoise | ${cleanTitle}${isClosed ? ' [KAPALI]' : ''}`)
        .setDescription(description)
        .setColor(isClosed ? '#808080' : '#F1C40F')
        .addFields(
            { name: '\u200b', value: '\u200b', inline: false }, // Spacer
            { name: '👥 **PARTİ KADROSU**', value: '\u200b', inline: false },
            {
                name: `${ROLE_ICONS.TANK} Tank`,
                value: roles.tank === '****' ? '`Boş Slot`' : roles.tank,
                inline: false
            },
            {
                name: `${ROLE_ICONS.HEAL} Heal`,
                value: roles.heal === '****' ? '`Boş Slot`' : roles.heal,
                inline: false
            },
            ...roles.dps.map((d, index) => ({
                name: `${ROLE_ICONS.DPS} DPS ${index + 1}`,
                value: d === '****' ? '`Boş Slot`' : d,
                inline: false
            })),
            { name: '\u200b', value: '\u200b', inline: false }
        );

    return embed;
}

/**
 * Creates a custom party embed
 */
function createPartikurEmbed(header, rolesList) {
    let desc = `📋 Parti başvurusu açıldı.`;

    const embed = new EmbedBuilder()
        .setTitle(`🛡️ Turquoise | ${header}`)
        .setDescription(desc)
        .setColor('#F1C40F');

    return embed;
}

/**
 * Creates a help embed
 */
function createHelpEmbed() {
    return new EmbedBuilder()
        .setTitle('🛡️ Albion Content Bot Yardım Menüsü')
        .setColor('#F1C40F')
        .setDescription('Discord sunucunuz için gelişmiş parti kurma ve yönetim botu.')
        .addFields(
            { name: '🚀 /pve', value: 'Hızlıca standart bir PVE (Static, Tracking vb.) başvurusu oluşturur. Başlık, detay ve DPS sayısı girilebilir.', inline: false },
            { name: '🏗️ /partikur', value: 'Tamamen özel roller belirleyebileceğiniz bir parti formu açar.', inline: false },
            { name: 'ℹ️ /yardim', value: 'Bu menüyü görüntüler.', inline: false },
            { name: '💎 Geliştirici', value: '```ansi\n\u001b[31mHakkı\u001b[0m\n```', inline: false }
        );
}

module.exports = {
    createEmbed,
    createPartikurEmbed,
    createHelpEmbed
};
