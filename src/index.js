require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const config = require('./config/config');
const { registerCommands } = require('./services/commandRegistration');
const { handleYardimCommand, handlePveCommand, handlePartikapatCommand } = require('./handlers/commandHandler');
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
    } catch (error) {
        setTimeout(startBot, 5000);
    }
}

// Client ready event
client.once('clientReady', async () => {
    console.log(`[Bot] ${client.user.tag} aktif!`);

    // Set activity safely with a small delay and error handling
    setTimeout(() => {
        try {
            client.user.setActivity(config.ACTIVITY_TEXT, { type: ActivityType.Listening });
            console.log(`[Bot] Durum güncellendi: ${config.ACTIVITY_TEXT}`);
        } catch (err) {
            console.warn('[Bot] Durum ayarlanırken Shard hatası oluştu, önemsemiyorum.');
        }
    }, 2000);

    // No party manager initialization needed (parties are unlimited and permanent)
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
