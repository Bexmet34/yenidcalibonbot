require('dotenv').config({ quiet: true });
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first'); // Force IPv4 to prevent ENETUNREACH errors on VPS
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const config = require('./config/config');
const fs = require('fs');
const path = require('path');
const { registerCommands } = require('./services/commandRegistration');
const { handleYardimCommand, handlePveCommand, handlePartikapatCommand, handleUyelerCommand, handleKayitSistemiCommand, handleMeCommand } = require('./handlers/commandHandler');
const { handlePartikurCommand } = require('./handlers/partikurHandler');
const { handlePartyButtons } = require('./handlers/buttonHandler');
const { handlePartiModal } = require('./handlers/modalHandler');
const { handleInteractionError } = require('./utils/interactionUtils');

const { handleCreateGiveaway, handleJoinGiveaway, checkGiveaways, handleEndCommand, handleRerollCommand } = require('./handlers/giveawayHandler');

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates
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

    // Çekiliş Kontrol Döngüsü (Her 10 saniyede bir)
    setInterval(async () => {
        try {
            await checkGiveaways(client);
        } catch (error) {
            console.error('[Sistem] Çekiliş kontrolü sırasında hata:', error);
        }
    }, 10000);

    // Güncelleme Bildirimi Kontrolü
    const updateFilePath = path.join(process.cwd(), '.update_success');
    if (fs.existsSync(updateFilePath)) {
        try {
            const ownerId = config.WHITELIST_USERS[0];
            if (ownerId) {
                const owner = await client.users.fetch(ownerId);
                if (owner) {
                    await owner.send('🚀 **Bot Başarıyla Güncellendi!**\nGitHub\'dan en son değişiklikler çekildi ve bot yeniden başlatıldı. Sistem şu an aktif.');
                    console.log(`[Bildirim] Güncelleme mesajı ${owner.tag} kullanıcısına gönderildi.`);
                }
            }
            fs.unlinkSync(updateFilePath); // Dosyayı sil
        } catch (err) {
            console.error('[Bildirim] Güncelleme mesajı gönderilirken hata:', err);
        }
    }
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
            } else if (interaction.commandName === 'cekilis') {
                const sub = interaction.options.getSubcommand();
                if (sub === 'baslat') await handleCreateGiveaway(interaction);
                else if (sub === 'bitir') await handleEndCommand(interaction);
                else if (sub === 'yenile') await handleRerollCommand(interaction);
            } else if (interaction.commandName === 'me') {
                await handleMeCommand(interaction);
            }
        }
        // Handle button interactions
        else if (interaction.isButton()) {
            if (interaction.customId === 'giveaway_join') {
                await handleJoinGiveaway(interaction);
            } else {
                await handlePartyButtons(interaction);
            }
        }
        // Handle modal submissions
        else if (interaction.isModalSubmit()) {
            await handlePartiModal(interaction);
        }
    } catch (error) {
        await handleInteractionError(interaction, error);
    }
});

// Voice state handler removed per user request

// Start the bot
startBot();
