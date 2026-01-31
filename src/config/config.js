// Load .env first, then .env.local (if exists) to override
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Check if .env.local exists and load it to override .env values
const envLocalPath = path.join(__dirname, '..', '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
    require('dotenv').config({ path: envLocalPath, override: true });
    console.log('✅ .env.local loaded - using local environment configuration');
}

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
    LOG_CHANNELS: [
        '1464080234335703253',
        '1464080234335703253'
    ],
};
