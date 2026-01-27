const { buildPartikurPayload } = require('../builders/payloadBuilder');
const { safeReply } = require('../utils/interactionUtils');
const { MessageFlags } = require('discord.js');
const { hasActiveParty, setActiveParty } = require('../services/partyManager');

/**
 * Handles modal submission for custom party creation
 */
async function handlePartiModal(interaction) {
    if (interaction.customId === 'parti_modal') {
        const userId = interaction.user.id;

        if (hasActiveParty(userId)) {
            return await interaction.reply({
                content: '❌ **Zaten aktif bir partiniz var!**\n\nYeni bir parti açmadan önce mevcut partinizi kapatmalısınız. Kapatmak için:\n1️⃣ Mevcut partideki **"Partiyi Kapat"** butonuna basabilir,\n2️⃣ Veya `/partikapat` komutunu kullanabilirsiniz.',
                flags: [MessageFlags.Ephemeral]
            });
        }

        const header = interaction.fields.getTextInputValue('party_header');
        const rolesRaw = interaction.fields.getTextInputValue('party_roles');
        const rolesList = rolesRaw.split('\n').map(r => r.trim()).filter(r => r.length > 0);

        // Send and capture message
        const msg = await safeReply(interaction, { content: '@everyone', ...buildPartikurPayload(header, rolesList, userId) });

        const msgId = msg?.id;
        const chanId = msg?.channelId || interaction.channelId;

        if (msgId) {
            setActiveParty(userId, msgId, chanId);
            console.log(`[ModalHandler] Registered: User ${userId} -> Party ${msgId}`);
        } else {
            console.log(`[ModalHandler] ⚠️ Failed to register party in DB (No ID captured).`);
        }
    }
}

module.exports = {
    handlePartiModal
};
