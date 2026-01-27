const { EMPTY_SLOT, DEFAULT_CONTENT, ROLE_ICONS } = require('../constants/constants');
const { createEmbed, createPartikurEmbed } = require('../builders/embedBuilder');
const { createPveButtons, createCustomPartyComponents } = require('../builders/componentBuilder');

/**
 * Builds PVE payload with embed and components
 */
/**
 * Builds PVE payload with embed and components
 */
function buildPvePayload(title, details, content, dpsCount, ownerId) {
    const roles = { tank: EMPTY_SLOT, heal: EMPTY_SLOT, dps: Array(dpsCount).fill(EMPTY_SLOT) };
    const embed = createEmbed(title, details, content, roles, false);

    const row = createPveButtons(ownerId);
    return { embeds: [embed], components: [row] };
}

/**
 * Builds custom party payload with embed and components
 */
function buildPartikurPayload(header, rolesList, ownerId) {
    const embed = createPartikurEmbed(header, rolesList);

    // Add spacer and header
    embed.addFields(
        { name: '\u200b', value: '\u200b', inline: false },
        { name: '👥 **PARTİ KADROSU**', value: '\u200b', inline: false }
    );

    // Add roles with better formatting
    rolesList.forEach((role, index) => {
        let icon = ROLE_ICONS.DEFAULT;
        const lower = role.toLowerCase();
        if (lower.includes('tank')) icon = ROLE_ICONS.TANK;
        else if (lower.includes('heal')) icon = ROLE_ICONS.HEAL;
        else if (lower.includes('dps') || lower.includes('damage') || lower.includes('⚔️')) icon = ROLE_ICONS.DPS;

        embed.addFields({
            name: `${icon} ${role}`,
            value: '`Boş Slot`',
            inline: true
        });
    });

    // Add spacer and notes
    embed.addFields(
        { name: '\u200b', value: '\u200b', inline: false },
        { name: '📌 **KURALLAR VE NOTLAR**', value: require('../constants/constants').NOTLAR_METNI, inline: false }
    );

    const rows = createCustomPartyComponents(rolesList, ownerId);
    return { embeds: [embed], components: rows };
}

module.exports = {
    buildPvePayload,
    buildPartikurPayload
};
