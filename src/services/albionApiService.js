const https = require('https');

/**
 * Albion Avrupa API'sinden lonca üyelerini çeker
 */
async function getEuropeGuildMembers(guildId) {
    return new Promise((resolve, reject) => {
        const url = `https://gameinfo-ams.albiononline.com/api/gameinfo/guilds/${guildId}/members`;

        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode !== 200) {
                        return reject(new Error(`API Hatası: ${res.statusCode}`));
                    }
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e) {
                    reject(new Error('API yanıtı çözümlenemedi.'));
                }
            });
        }).on('error', (err) => reject(err));
    });
}

module.exports = { getEuropeGuildMembers };
