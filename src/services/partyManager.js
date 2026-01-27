const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'parties.json');

// Ensure data directory and file exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2));
}

/**
 * Reads the parties data from JSON file
 */
function readData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('[PartyManager] Error reading database:', error.message);
        return {};
    }
}

/**
 * Writes the parties data to JSON file
 */
function writeData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('[PartyManager] Error writing to database:', error.message);
    }
}

/**
 * Check if user has an active party
 */
function hasActiveParty(userId) {
    const data = readData();
    return !!data[userId];
}

/**
 * Get user's active party info { messageId, channelId }
 */
function getActiveParty(userId) {
    const data = readData();
    return data[userId];
}

/**
 * Set user's active party (Persistent)
 */
function setActiveParty(userId, messageId, channelId) {
    const data = readData();
    data[userId] = { messageId, channelId };
    writeData(data);
    console.log(`[PartyManager] Database Updated: User ${userId} -> Party ${messageId} in ${channelId}`);
}

/**
 * Remove user's active party (Persistent)
 */
function removeActiveParty(userId, messageId = null) {
    const data = readData();

    if (data[userId]) {
        const stored = data[userId];
        const storedId = typeof stored === 'object' ? stored.messageId : stored;

        // Log mismatch for debugging but proceed anyway
        if (messageId && storedId !== messageId) {
            console.log(`[PartyManager] Note: Closing party ${messageId} while DB tracked ${storedId}. Clearing status.`);
        }

        delete data[userId];
        writeData(data);
        console.log(`[PartyManager] ✅ Database Updated: User ${userId} status cleared.`);
        return true;
    }

    console.log(`[PartyManager] User ${userId} requested to close a party but no active party found in Database.`);
    return false;
}

module.exports = {
    hasActiveParty,
    getActiveParty,
    setActiveParty,
    removeActiveParty
};
