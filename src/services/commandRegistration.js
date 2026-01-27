const { REST, Routes } = require('discord.js');
const config = require('../config/config');
const commands = require('../commands/commands');

/**
 * Registers slash commands with Discord
 */
async function registerCommands(client) {
    const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);
    try {
        console.log('Slash komutları yükleniyor...');
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, config.GUILD_ID),
            { body: commands },
        );
        console.log('Slash komutları başarıyla yüklendi.');
    } catch (error) {
        if (error.code === 'ERR_SSL_INVALID_SESSION_ID' || error.message?.includes('SSL')) {
            console.log('SSL hatası nedeniyle komutlar yüklenemedi, 5 saniye sonra tekrar denenecek...');
            setTimeout(() => registerCommands(client), 5000);
        } else {
            console.error('Komut yükleme hatası:', error);
        }
    }
}

module.exports = {
    registerCommands
};
