require('dotenv').config();

module.exports = {
    // Discord Configuration
    DISCORD_TOKEN: process.env.DISCORD_TOKEN,
    GUILD_ID: process.env.GUILD_ID,

    // Bot Settings
    MAX_ACTIVE_PARTIES: 3,

    // Activity
    ACTIVITY_TEXT: '/partikur',

    // Security
    WHITELIST_USERS: ['407234961582587916'], // Kendi ID'nizi buraya ekleyin

    // Log Kanalları (Birden fazla eklenebilir)
    // Log Kanalları (Birden fazla eklenebilir, .env dosyasından virgülle ayrılmış liste olarak okunur)
    LOG_CHANNELS: process.env.LOG_CHANNELS ? process.env.LOG_CHANNELS.split(',') : [],
};
