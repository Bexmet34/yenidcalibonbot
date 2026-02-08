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
    const entry = data[userId];
    if (!entry) return false;
    if (Array.isArray(entry)) return entry.length > 0;
    return true; // legacy object
}

/**
 * Get active party count for a user
 */
function getActivePartyCount(userId) {
    const data = readData();
    const entry = data[userId];
    if (!entry) return 0;
    if (Array.isArray(entry)) return entry.length;
    return 1; // legacy object
}

/**
 * Get user's active parties info [{ messageId, channelId }]
 */
function getActiveParties(userId) {
    const data = readData();
    const entry = data[userId];
    if (!entry) return [];
    if (Array.isArray(entry)) return entry;
    return [entry]; // legacy object to array
}

/**
 * Set user's active party (Persistent)
 */
function setActiveParty(userId, messageId, channelId) {
    const data = readData();
    const newParty = { messageId, channelId };

    if (!data[userId]) {
        data[userId] = [newParty];
    } else if (Array.isArray(data[userId])) {
        data[userId].push(newParty);
    } else {
        // Migration from legacy single object to array
        data[userId] = [data[userId], newParty];
    }

    writeData(data);
    console.log(`[PartyManager] Database Updated: User ${userId} -> Party ${messageId} in ${channelId}`);
}

/**
 * Remove user's active party (Persistent)
 */
function removeActiveParty(userId, messageId = null) {
    const data = readData();
    const entry = data[userId];

    if (!entry) {
        console.log(`[PartyManager] User ${userId} requested to close a party but no active party found in Database.`);
        return false;
    }

    // If no specific messageId, clear EVERYTHING for this user
    if (!messageId) {
        delete data[userId];
        writeData(data);
        console.log(`[PartyManager] ✅ Database Updated: User ${userId} all status cleared.`);
        return true;
    }

    if (!Array.isArray(entry)) {
        // Legacy single object handling
        const storedId = typeof entry === 'object' ? entry.messageId : entry;
        if (storedId !== messageId) {
            console.log(`[PartyManager] Note: Closing party ${messageId} while DB tracked ${storedId}. Clearing status.`);
        }
        delete data[userId];
        writeData(data);
        console.log(`[PartyManager] ✅ Database Updated: User ${userId} legacy status cleared.`);
        return true;
    }

    // Array handling
    const initialLength = entry.length;
    data[userId] = entry.filter(p => p.messageId !== messageId);

    if (data[userId].length === 0) {
        delete data[userId];
    }

    writeData(data);
    console.log(`[PartyManager] ✅ Database Updated: User ${userId} party ${messageId} removed.`);
    return true;
}

module.exports = {
    hasActiveParty,
    getActivePartyCount,
    getActiveParties,
    setActiveParty,
    removeActiveParty
};
