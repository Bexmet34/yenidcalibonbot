const { buildPartikurPayload } = require('../builders/payloadBuilder');
const { safeReply } = require('../utils/interactionUtils');
const { MessageFlags } = require('discord.js');
const { getActivePartyCount, setActiveParty } = require('../services/partyManager');
const { isWhitelisted } = require('../services/whitelistManager');
const { getEuropeGuildMembers } = require('../services/albionApiService');

/**
 * Handles modal submission for custom party creation
 */
async function handlePartiModal(interaction) {
    if (interaction.customId === 'parti_modal') {
        const userId = interaction.user.id;
        const whitelisted = isWhitelisted(userId);
        const partyCount = getActivePartyCount(userId);
        const limit = whitelisted ? 3 : 1;

        if (partyCount >= limit) {
            let errorMsg = whitelisted
                ? `❌ **Limitinize ulaştınız!**\n\nWhite list üyesi olarak en fazla **3** aktif parti açabilirsiniz. Yeni bir parti açmadan önce mevcut partilerinizden birini kapatmalısınız.`
                : `❌ **Zaten aktif bir partiniz var!**\n\nYeni bir parti açmadan önce mevcut partinizi kapatmalısınız. Kapatmak için:\n1️⃣ Mevcut partideki **"Partiyi Kapat"** butonuna basabilir,\n2️⃣ Veya \`/partikapat\` komutunu kullanabilirsiniz.`;

            return await interaction.reply({
                content: errorMsg,
                flags: [MessageFlags.Ephemeral]
            });
        }

        const header = interaction.fields.getTextInputValue('party_header');
        const content = interaction.fields.getTextInputValue('party_content');
        const rolesRaw = interaction.fields.getTextInputValue('party_roles');
        const description = interaction.fields.getTextInputValue('party_description') || '';
        const rolesList = rolesRaw.split('\n').map(r => r.trim()).filter(r => r.length > 0);

        // Send and capture message
        const msg = await safeReply(interaction, { content: '@everyone', ...buildPartikurPayload(header, rolesList, userId, description, content) });

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
