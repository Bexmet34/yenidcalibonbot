const { EmbedBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { EMPTY_SLOT } = require('../constants/constants');
const { updateButtonStates, createClosedButton } = require('../builders/componentBuilder');
const { removeActiveParty } = require('../services/partyManager');
const { getEuropeGuildMembers } = require('../services/albionApiService');
const { createMemberPageEmbed } = require('./commandHandler');
const { createProgressBar } = require('../builders/embedBuilder');
const db = require('../services/db');

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
        const newFields = oldEmbed.fields.filter(f => !f.name.includes('📌') && !f.name.includes('KURALLAR'));
        const closedEmbed = EmbedBuilder.from(oldEmbed)
            .setTitle(`${oldEmbed.title} [KAPALI]`)
            .setColor('#808080')
            .setFields(newFields)
            .setFooter(null)
            .setTimestamp(null);

        const closedRow = createClosedButton();

        // Remove from active parties
        removeActiveParty(ownerId, message.id);

        console.log(`[ButtonHandler] ✅ Party ${message.id} closed by owner.`);
        return await interaction.update({ embeds: [closedEmbed], components: [closedRow] });
    }


    if (customId.startsWith('members_')) {
        const parts = customId.split('_');
        const action = parts[1]; // prev or next
        let currentPage = parseInt(parts[2]);
        const newPage = action === 'next' ? currentPage + 1 : currentPage - 1;

        await interaction.deferUpdate();

        try {
            const guildId = 'qw4DHcDZSz-LOvHAQlsOGw';
            const members = await getEuropeGuildMembers(guildId);
            members.sort((a, b) => a.Name.localeCompare(b.Name));

            const newEmbed = createMemberPageEmbed(members, newPage);
            const totalPages = Math.ceil(members.length / 20);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`members_prev_${newPage}`)
                    .setLabel('⬅️ Geri')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(newPage === 0),
                new ButtonBuilder()
                    .setCustomId(`members_next_${newPage}`)
                    .setLabel('İleri ➡️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(newPage >= totalPages - 1)
            );

            return await interaction.editReply({ embeds: [newEmbed], components: [row] });
        } catch (error) {
            console.error('[ButtonHandler] Uyeler Paging Error:', error);
            return;
        }
    }

    const oldEmbed = message.embeds[0];
    const userId = interaction.user.id;

    let fields = [...oldEmbed.fields];
    const isUserInAnySlot = fields.some(f => f.value.includes(userId));

    // Helper function to check if a slot is empty
    const isEmptySlot = (value) => value === '-' || value === '`Boş Slot`' || value.includes(EMPTY_SLOT);

    if (customId === 'leave') {
        fields = fields.map(f => {
            if (f.value.includes(userId)) {
                return {
                    ...f,
                    name: f.name.replace('🔴', '🟡'),
                    value: '-'
                };
            }
            return f;
        });

        // DB SYNC: Remove user from all roles in this party
        db.run('UPDATE party_members SET user_id = NULL WHERE party_id = (SELECT id FROM parties WHERE message_id = ?) AND user_id = ?', [message.id, userId]).catch(e => console.error(e));
    } else if (customId.startsWith('join_')) {
        // If user is already in a slot, leave it first
        if (isUserInAnySlot) {
            fields = fields.map(f => {
                if (f.value.includes(userId)) {
                    return {
                        ...f,
                        name: f.name.replace('🔴', '🟡'),
                        value: '-'
                    };
                }
                return f;
            });
        }

        let targetIndex = -1;

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
                fields[targetIndex].name = fields[targetIndex].name.replace('🟡', '🔴');

                // DB SYNC: Update user in DB
                const roleName = fields[targetIndex].name.split('. ')[1]?.replace(':', '') || 'Unknown';
                db.run('INSERT INTO party_members (party_id, user_id, role, status) SELECT id, ?, ?, "joined" FROM parties WHERE message_id = ?', [userId, roleName, message.id]).catch(e => console.error(e));
            } else {
                return interaction.reply({ content: '❌ Bu slot dolu!', flags: [MessageFlags.Ephemeral] });
            }
        }
    }

    // Recalculate filled slots for progress bar
    const roleFields = fields.filter(f =>
        !f.name.includes('👥') &&
        !f.name.includes('📌') &&
        f.name !== '\u200b' &&
        !f.name.includes('KURALLAR')
    );
    const filledCount = roleFields.filter(f => !isEmptySlot(f.value)).length;
    const totalCount = roleFields.length;

    const newEmbed = EmbedBuilder.from(oldEmbed)
        .setFields(fields)
        .setFooter({ text: `Doluluk: ${createProgressBar(filledCount, totalCount)}` });

    // Re-generate components to update "DOLU" status
    const newComponents = updateButtonStates(message.components, fields);

    await interaction.update({ embeds: [newEmbed], components: newComponents });
}

/**
 * Handles prestige leaderboard pagination buttons
 */
async function handlePrestigeButtons(interaction) {
    const customId = interaction.customId;

    if (customId === 'prestige_top10') {
        const { createPrestigePageEmbed } = require('./commandHandler');
        const result = await createPrestigePageEmbed(0, true);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prestige_all')
                .setLabel('📋 Tüm Liste')
                .setStyle(ButtonStyle.Primary)
        );

        return await interaction.update({ embeds: [result.embed], components: [row] });
    }
    else if (customId === 'prestige_all') {
        const { createPrestigePageEmbed } = require('./commandHandler');
        const result = await createPrestigePageEmbed(0, false);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prestige_top10')
                .setLabel('🏆 İlk 10')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('prestige_prev_0')
                .setLabel('⬅️ Önceki')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('prestige_next_0')
                .setLabel('Sonraki ➡️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(result.totalPages <= 1)
        );

        return await interaction.update({ embeds: [result.embed], components: [row] });
    }
    else if (customId.startsWith('prestige_next_') || customId.startsWith('prestige_prev_')) {
        const parts = customId.split('_');
        const direction = parts[1];
        const currentPage = parseInt(parts[2]);
        const newPage = direction === 'next' ? currentPage + 1 : currentPage - 1;

        const { createPrestigePageEmbed } = require('./commandHandler');
        const result = await createPrestigePageEmbed(newPage, false);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prestige_top10')
                .setLabel('🏆 İlk 10')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`prestige_prev_${newPage}`)
                .setLabel('⬅️ Önceki')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(newPage === 0),
            new ButtonBuilder()
                .setCustomId(`prestige_next_${newPage}`)
                .setLabel('Sonraki ➡️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(newPage >= result.totalPages - 1)
        );

        return await interaction.update({ embeds: [result.embed], components: [row] });
    }
}

module.exports = {
    handlePartyButtons,
    handlePrestigeButtons
};
