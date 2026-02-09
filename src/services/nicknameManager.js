const { getUserPrestige } = require('./prestigeManager');

/**
 * Updates user's nickname with their prestige icon
 */
async function updateUserNickname(guild, userId) {
    try {
        const member = await guild.members.fetch(userId);
        if (!member) return;

        // Skip if member is server owner (can't change owner's nickname)
        if (member.id === guild.ownerId) {
            console.log(`[Nickname] Skipping ${member.user.tag} - Server owner`);
            return;
        }

        // Skip if member has higher role than bot
        const botMember = await guild.members.fetch(guild.client.user.id);
        if (member.roles.highest.position >= botMember.roles.highest.position) {
            console.log(`[Nickname] Skipping ${member.user.tag} - Higher role than bot`);
            return;
        }

        const prestige = await getUserPrestige(userId);
        const currentNickname = member.nickname || member.user.username;

        // Remove existing prestige icons from nickname
        const cleanNickname = currentNickname.replace(/^[✧☆★✩✪✦✭]\s+/, '');

        // Add new prestige icon
        const newNickname = `${prestige.icon} ${cleanNickname}`;

        // Only update if different
        if (currentNickname !== newNickname) {
            await member.setNickname(newNickname);
            console.log(`[Nickname] Updated ${member.user.tag}: "${currentNickname}" → "${newNickname}"`);
        }
    } catch (error) {
        console.error(`[Nickname] Error updating ${userId}:`, error.message);
    }
}

/**
 * Removes prestige icon from user's nickname
 */
async function removePrestigeFromNickname(guild, userId) {
    try {
        const member = await guild.members.fetch(userId);
        if (!member) return;

        if (member.id === guild.ownerId) return;

        const currentNickname = member.nickname || member.user.username;
        const cleanNickname = currentNickname.replace(/^[✧☆★✩✪✦✭]\s+/, '');

        if (currentNickname !== cleanNickname) {
            await member.setNickname(cleanNickname);
            console.log(`[Nickname] Removed prestige from ${member.user.tag}`);
        }
    } catch (error) {
        console.error(`[Nickname] Error removing prestige from ${userId}:`, error.message);
    }
}

module.exports = {
    updateUserNickname,
    removePrestigeFromNickname
};
