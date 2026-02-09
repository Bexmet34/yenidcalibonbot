const db = require('./db');

const RANKS = [
    { name: 'Normal', icon: '✧', minCount: 0, minRate: 0 },
    { name: 'Enchant I', icon: '☆', minCount: 5, minRate: 0 },
    { name: 'Enchant II', icon: '★', minCount: 15, minRate: 0 },
    { name: 'Enchant III', icon: '✩', minCount: 30, minRate: 0 },
    { name: 'Exceptional', icon: '✪', minCount: 60, minRate: 85 },
    { name: 'Masterpiece', icon: '✦', minCount: 100, minRate: 90 },
    { name: 'Legendary', icon: '✭', minCount: 160, minRate: 95 }
];

/**
 * Calculate user rank based on stats
 */
function calculateRank(confirmed, noShow, pveConfirmed = 0, pvpConfirmed = 0) {
    const total = confirmed + noShow;
    const rate = total > 0 ? (confirmed / total) * 100 : 100;

    let currentRank = RANKS[0];

    for (const rank of RANKS) {
        if (confirmed >= rank.minCount) {
            if (rank.minRate > 0) {
                if (rate >= rank.minRate) {
                    currentRank = rank;
                }
            } else {
                currentRank = rank;
            }
        }
    }

    return {
        ...currentRank,
        rate: rate.toFixed(1),
        confirmed,
        noShow,
        pveConfirmed,
        pvpConfirmed,
        pveRate: confirmed > 0 ? ((pveConfirmed / confirmed) * 100).toFixed(1) : "0.0",
        pvpRate: confirmed > 0 ? ((pvpConfirmed / confirmed) * 100).toFixed(1) : "0.0"
    };
}

/**
 * Get user stats and rank
 */
async function getUserPrestige(userId) {
    let stats = await db.get('SELECT * FROM user_stats WHERE user_id = ?', [userId]);

    if (!stats) {
        stats = { confirmed_count: 0, no_show_count: 0, pve_confirmed: 0, pvp_confirmed: 0 };
    }

    return calculateRank(stats.confirmed_count, stats.no_show_count, stats.pve_confirmed || 0, stats.pvp_confirmed || 0);
}

/**
 * Update user stats after party verification
 */
async function updateUserStats(userId, isConfirmed, type = 'pve', guild = null) {
    const stats = await db.get('SELECT * FROM user_stats WHERE user_id = ?', [userId]);
    const isPve = type === 'pve';

    if (!stats) {
        await db.run(
            'INSERT INTO user_stats (user_id, confirmed_count, no_show_count, pve_confirmed, pvp_confirmed, total_participated) VALUES (?, ?, ?, ?, ?, ?)',
            [
                userId,
                isConfirmed ? 1 : 0,
                isConfirmed ? 0 : 1,
                (isConfirmed && isPve) ? 1 : 0,
                (isConfirmed && !isPve) ? 1 : 0,
                1
            ]
        );
    } else {
        const confirmed = stats.confirmed_count + (isConfirmed ? 1 : 0);
        const noShow = stats.no_show_count + (isConfirmed ? 0 : 1);
        const pveConfirmed = (stats.pve_confirmed || 0) + (isConfirmed && isPve ? 1 : 0);
        const pvpConfirmed = (stats.pvp_confirmed || 0) + (isConfirmed && !isPve ? 1 : 0);
        const total = stats.total_participated + 1;

        await db.run(
            'UPDATE user_stats SET confirmed_count = ?, no_show_count = ?, pve_confirmed = ?, pvp_confirmed = ?, total_participated = ?, last_updated = CURRENT_TIMESTAMP WHERE user_id = ?',
            [confirmed, noShow, pveConfirmed, pvpConfirmed, total, userId]
        );
    }

    // Update nickname with new prestige icon
    if (guild) {
        const { updateUserNickname } = require('./nicknameManager');
        await updateUserNickname(guild, userId);
    }
}

module.exports = {
    getUserPrestige,
    updateUserStats,
    RANKS
};
