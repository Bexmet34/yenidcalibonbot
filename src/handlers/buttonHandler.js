const { EmbedBuilder, MessageFlags } = require('discord.js');
const { EMPTY_SLOT } = require('../constants/constants');
const { updateButtonStates, createClosedButton } = require('../builders/componentBuilder');
const { removeActiveParty } = require('../services/partyManager');

/**
 * Handles join and leave button interactions
 */
async function handlePartyButtons(interaction) {
    const customId = interaction.customId;
    const message = interaction.message;
    if (!message.embeds[0]) return;

    if (customId.startsWith('close_party_')) {
        const ownerId = customId.split('_')[2];
        console.log(`[ButtonHandler] Close request from ${interaction.user.tag} for party owned by ${ownerId}`);

        if (interaction.user.id !== ownerId) {
            return await interaction.reply({
                content: '⛔ **Bu partiyi sadece kuran kişi kapatabilir!**',
                flags: [MessageFlags.Ephemeral]
            });
        }

        const oldEmbed = message.embeds[0];
        const closedEmbed = EmbedBuilder.from(oldEmbed)
            .setTitle(`${oldEmbed.title} [KAPALI]`)
            .setColor('#808080')
            .setFooter({ text: '⛔ Bu başvuru parti sahibi tarafından kapatıldı.' });

        const closedRow = createClosedButton();

        // Remove from active parties
        removeActiveParty(ownerId, message.id);

        console.log(`[ButtonHandler] ✅ Party ${message.id} closed by owner.`);
        return await interaction.update({ embeds: [closedEmbed], components: [closedRow] });
    }

    const oldEmbed = message.embeds[0];
    const userId = interaction.user.id;

    let fields = [...oldEmbed.fields];
    const isUserInAnySlot = fields.some(f => f.value.includes(userId));

    // Helper function to check if a slot is empty
    const isEmptySlot = (value) => value === '`Boş Slot`' || value.includes(EMPTY_SLOT);

    if (customId === 'leave') {
        fields = fields.map(f => {
            if (f.value.includes(userId)) {
                return { ...f, value: '`Boş Slot`' };
            }
            return f;
        });
    } else if (customId.startsWith('join_')) {
        // If user is already in a slot, leave it first
        if (isUserInAnySlot) {
            fields = fields.map(f => {
                if (f.value.includes(userId)) {
                    return { ...f, value: '`Boş Slot`' };
                }
                return f;
            });
        }

        let targetIndex = -1;

        // Find the correct field index (skip spacers and headers)
        const roleFields = fields.filter((f, i) =>
            !f.name.includes('👥') &&
            !f.name.includes('📌') &&
            f.name !== '\u200b' &&
            !f.name.includes('KURALLAR')
        );

        if (customId === 'join_tank') {
            targetIndex = fields.findIndex(f => f.name.includes('Tank') && !f.name.includes('👥'));
        } else if (customId === 'join_heal') {
            targetIndex = fields.findIndex(f => f.name.includes('Heal') && !f.name.includes('👥'));
        } else if (customId === 'join_dps') {
            // Find first empty DPS slot
            targetIndex = fields.findIndex(f =>
                f.name.includes('DPS') &&
                !f.name.includes('👥') &&
                isEmptySlot(f.value)
            );
        } else if (customId.startsWith('join_custom_')) {
            const customIndex = parseInt(customId.split('_')[2]);
            // Find the actual field index for custom roles
            let roleCounter = 0;
            for (let i = 0; i < fields.length; i++) {
                if (!fields[i].name.includes('👥') &&
                    !fields[i].name.includes('📌') &&
                    fields[i].name !== '\u200b' &&
                    !fields[i].name.includes('KURALLAR')) {
                    if (roleCounter === customIndex) {
                        targetIndex = i;
                        break;
                    }
                    roleCounter++;
                }
            }
        }

        if (targetIndex !== -1) {
            if (isEmptySlot(fields[targetIndex].value)) {
                fields[targetIndex].value = `<@${userId}>`;
            } else {
                return interaction.reply({ content: '❌ Bu slot dolu!', flags: [MessageFlags.Ephemeral] });
            }
        }
    }

    const newEmbed = EmbedBuilder.from(oldEmbed).setFields(fields);

    // Re-generate components to update "DOLU" status
    const newComponents = updateButtonStates(message.components, fields);

    await interaction.update({ embeds: [newEmbed], components: newComponents });
}

module.exports = {
    handlePartyButtons
};

