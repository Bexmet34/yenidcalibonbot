require('dotenv').config({ quiet: true });
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first'); // Force IPv4 to prevent ENETUNREACH errors on VPS
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const config = require('./config/config');
const { registerCommands } = require('./services/commandRegistration');
const { handleYardimCommand, handlePveCommand, handlePartikapatCommand, handleUyelerCommand, handleKayitSistemiCommand, handleMeCommand } = require('./handlers/commandHandler');
const { handlePartikurCommand } = require('./handlers/partikurHandler');
const { handlePartyButtons } = require('./handlers/buttonHandler');
const { handlePartiModal } = require('./handlers/modalHandler');
const { handleInteractionError } = require('./utils/interactionUtils');

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// Error handling to prevent crashes
client.on('error', async error => {
    if (error.code === 'ERR_SSL_INVALID_SESSION_ID' || error.message.includes('SSL')) {
        setTimeout(startBot, 5000);
    } else {
        console.error('Discord client error:', error);
    }
});

process.on('unhandledRejection', error => {
    if (!error.message?.includes('SSL')) {
        console.error('Sistemsel bir hata oluştu (Promise Rejection):', error);
    }
});

process.on('uncaughtException', error => {
    const fs = require('fs');
    fs.writeFileSync('error.log', `Error: ${error.message}\nStack: ${error.stack}\n`);
    if (!error.message?.includes('SSL')) {
        console.error('Sistemsel bir hata oluştu (Uncaught Exception):', error);
    }
});

// Bot startup function
async function startBot() {
    try {
        await client.login(config.DISCORD_TOKEN);
        console.log('[Sistem] Discord bağlantısı kuruldu, hazır olması bekleniyor...');
    } catch (error) {
        console.error('Bot login error:', error);
        setTimeout(startBot, 5000);
    }
}

// Client ready event
client.once('clientReady', async () => {
    console.log(`[Bot] ${client.user.tag} tam anlamıyla aktif!`);

    // GÜNCELLEME BİLDİRİMİ
    try {
        if (config.LOG_CHANNELS && config.LOG_CHANNELS.length > 0) {
            for (const channelId of config.LOG_CHANNELS) {
                if (!channelId || channelId.trim() === '') continue; // Skip empty strings
                try {
                    const notifyChannel = await client.channels.fetch(channelId);
                    if (notifyChannel) {
                        await notifyChannel.send('🚀 **Bot başarıyla yeniden başlatıldı ve güncellemeler uygulandı!**');
                        console.log(`[Sistem] Güncelleme bildirimi gönderildi: ${channelId}`);
                    }
                } catch (err) {
                    console.error(`[Sistem] Kanal ${channelId} bulunamadı veya mesaj gönderilemedi:`, err.message);
                }
            }
        }
    } catch (err) {
        console.error('[Bot] Başlatma mesajı gönderilemedi:', err);
    }

    // Set activity safely with a small delay and error handling
    setTimeout(() => {
        try {
            client.user.setActivity(config.ACTIVITY_TEXT, { type: ActivityType.Listening });
            console.log(`[Bot] Durum güncellendi: ${config.ACTIVITY_TEXT}`);
        } catch (err) {
            console.warn('[Bot] Durum ayarlanırken Shard hatası oluştu, önemsemiyorum.');
        }
    }, 2000);

    registerCommands(client);
});

// Interaction handler
client.on('interactionCreate', async interaction => {
    try {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'yardim') {
                await handleYardimCommand(interaction);
            } else if (interaction.commandName === 'pve') {
                await handlePveCommand(interaction);
            } else if (interaction.commandName === 'partikur') {
                await handlePartikurCommand(interaction);
            } else if (interaction.commandName === 'partikapat') {
                await handlePartikapatCommand(interaction);
            } else if (interaction.commandName === 'uyeler') {
                await handleUyelerCommand(interaction);
            } else if (interaction.commandName === 'kayitsistemi') {
                await handleKayitSistemiCommand(interaction);
            } else if (interaction.commandName === 'me') {
                await handleMeCommand(interaction);
            }
        }
        // Handle button interactions
        else if (interaction.isButton()) {
            await handlePartyButtons(interaction);
        }
        // Handle modal submissions
        else if (interaction.isModalSubmit()) {
            await handlePartiModal(interaction);
        }
    } catch (error) {
        await handleInteractionError(interaction, error);
    }
});

// Start the bot
startBot();
