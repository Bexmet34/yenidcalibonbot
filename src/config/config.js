require('dotenv').config();

module.exports = {
    // Discord Configuration
    DISCORD_TOKEN: process.env.DISCORD_TOKEN,
    GUILD_ID: process.env.GUILD_ID,

    // Bot Settings
    MAX_ACTIVE_PARTIES: 3,

    // Activity
    ACTIVITY_TEXT: '/pve & /partikur',

    // Security
    WHITELIST_USERS: ['407234961582587916'], // Kendi ID'nizi buraya ekleyin

    // Log Kanalları (Birden fazla eklenebilir)
    LOG_CHANNELS: [],
};
