const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { parseDuration } = require('../utils/timeUtils');

const DATA_FILE = path.join(__dirname, '../data/giveaways.json');

// Helper: Read Data
function getGiveaways() {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, '[]');
        return [];
    }
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE));
    } catch (e) {
        console.error("Giveaway data read error:", e);
        return [];
    }
}

// Helper: Save Data
function saveGiveaways(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/**
 * Başlatılan çekilişi oluşturur
 */
async function handleCreateGiveaway(interaction) {
    const prize = interaction.options.getString('odul');
    const durationStr = interaction.options.getString('sure');
    const winnerCount = interaction.options.getInteger('kazanan') || 1;

    const durationMs = parseDuration(durationStr);
    if (!durationMs) {
        return interaction.reply({ content: '❌ Geçersiz süre formatı! Örnekler: 10dk, 2sa, 1g', flags: MessageFlags.Ephemeral });
    }

    const endTime = Date.now() + durationMs;
    const endTimestamp = Math.round(endTime / 1000); // Discord format

    // Embed Oluştur
    const embed = new EmbedBuilder()
        .setTitle('🎉 ÖZEL ÇEKİLİŞ BAŞLADI! 🎉')
        .setDescription(`
**Ödül:** \`${prize}\`

Aşağıdaki butona tıklayarak çekilişe katılabilirsin!
Bol şans savaşçı! ⚔️

**Bitiş Tarihi:**
⏳ <t:${endTimestamp}:R> (<t:${endTimestamp}:f>)

**Detaylar:**
🏆 **Kazanan Sayısı:** ${winnerCount} Kişi
👑 **Düzenleyen:** ${interaction.user}
👥 **Katılımcı:** 0 Kişi
        `)
        .setColor('#FFAF00') // Albion Gold
        .setThumbnail('https://render.albiononline.com/v1/item/TREASURECHEST_KEY_T8_0.png') // T8 Chest Key (temsili)
        .setFooter({ text: 'Albion Çekiliş Sistemi', iconURL: interaction.guild.iconURL() })
        .setTimestamp(endTime);

    // Buton Oluştur
    const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('giveaway_join')
            .setLabel('🎉 Çekilişe Katıl (0)')
            .setStyle(ButtonStyle.Success)
    );

    const message = await interaction.channel.send({ embeds: [embed], components: [button] });

    // Veritabanına Kayıt
    const giveaways = getGiveaways();
    giveaways.push({
        messageId: message.id,
        channelId: message.channel.id,
        guildId: message.guild.id,
        prize: prize,
        endTime: endTime,
        winnerCount: winnerCount,
        participants: [],
        hostId: interaction.user.id,
        ended: false
    });
    saveGiveaways(giveaways);

    await interaction.reply({ content: `✅ Çekiliş başarıyla oluşturuldu!`, flags: MessageFlags.Ephemeral });
}

/**
 * Katıl butonu işlemi
 */
async function handleJoinGiveaway(interaction) {
    const giveaways = getGiveaways();
    const giveawayIndex = giveaways.findIndex(g => g.messageId === interaction.message.id);

    if (giveawayIndex === -1) {
        return interaction.reply({ content: '❌ Bu çekiliş bulunamadı veya silinmiş.', flags: MessageFlags.Ephemeral });
    }

    const giveaway = giveaways[giveawayIndex];

    if (giveaway.ended) {
        return interaction.reply({ content: '⚠️ Bu çekiliş sona erdi!', flags: MessageFlags.Ephemeral });
    }

    if (giveaway.participants.includes(interaction.user.id)) {
        // Çıkış yapma mantığı (Toggle)
        giveaway.participants = giveaway.participants.filter(id => id !== interaction.user.id);
        saveGiveaways(giveaways);

        // Butonu güncelle
        updateGiveawayMessage(interaction, giveaway);
        return interaction.reply({ content: '📤 Çekilişten ayrıldın.', flags: MessageFlags.Ephemeral });
    }

    // Katılma
    giveaway.participants.push(interaction.user.id);
    saveGiveaways(giveaways);

    // Butonu güncelle
    updateGiveawayMessage(interaction, giveaway);
    await interaction.reply({ content: '✅ Çekilişe katıldın! Bol şans.', flags: MessageFlags.Ephemeral });
}

/**
 * Mesajı (Participant Count) günceller
 */
async function updateGiveawayMessage(interaction, giveaway) {
    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    const count = giveaway.participants.length;

    // Description'ı güncelle (Regex ile "Katılımcı: X Kişi" kısmını bulup değiştiriyoruz)
    let newDesc = embed.data.description.replace(/👥 \*\*Katılımcı:\*\* \d+ Kişi/, `👥 **Katılımcı:** ${count} Kişi`);
    embed.setDescription(newDesc);

    const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('giveaway_join')
            .setLabel(`🎉 Çekilişe Katıl (${count})`)
            .setStyle(ButtonStyle.Success)
    );

    await interaction.message.edit({ embeds: [embed], components: [button] });
}

/**
 * Çekilişi bitirir
 */
async function endGiveaway(giveaway, client) {
    try {
        const channel = await client.channels.fetch(giveaway.channelId);
        if (!channel) return;

        const message = await channel.messages.fetch(giveaway.messageId);
        if (!message) return;

        // Kazanan Seçimi
        const winners = [];
        if (giveaway.participants.length > 0) {
            const shuffled = giveaway.participants.sort(() => 0.5 - Math.random());
            winners.push(...shuffled.slice(0, giveaway.winnerCount));
        }

        const winnerString = winners.length > 0 ? winners.map(w => `<@${w}>`).join(', ') : "Katılım olmadı.";

        // Embed Güncelleme
        const embed = EmbedBuilder.from(message.embeds[0]);
        embed.setTitle('🎉 ÇEKİLİŞ SONA ERDİ 🎉');
        embed.setColor('#2F3136'); // Gri/Dark
        embed.setDescription(`
**Ödül:** \`${giveaway.prize}\`

🏆 **Kazanan(lar):**
${winnerString}

👑 **Düzenleyen:** <@${giveaway.hostId}>
👥 **Toplam Katılım:** ${giveaway.participants.length}
        `);

        // Butonu Devre Dışı Bırak
        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('giveaway_ended')
                .setLabel(`Çekiliş Bitti (${giveaway.participants.length})`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );

        await message.edit({ embeds: [embed], components: [button] });

        // Bildirim Mesajı
        if (winners.length > 0) {
            await channel.send(`🎉 **TEBRİKLER!** ${winnerString} \n**${giveaway.prize}** kazandın! Lütfen yetkili ile iletişime geç.`);
        } else {
            await channel.send(`😕 Çekiliş sona erdi ancak yeterli katılım olmadı.`);
        }

        // DB güncelle
        const allGiveaways = getGiveaways();
        const index = allGiveaways.findIndex(g => g.messageId === giveaway.messageId);
        if (index !== -1) {
            allGiveaways[index].ended = true;
            saveGiveaways(allGiveaways);
        }

    } catch (error) {
        console.error(`Giveaway End Error [${giveaway.messageId}]:`, error);
    }
}

/**
 * Periyodik kontrol döngüsü
 */
async function checkGiveaways(client) {
    const giveaways = getGiveaways();
    const now = Date.now();

    for (const giveaway of giveaways) {
        if (!giveaway.ended && giveaway.endTime <= now) {
            await endGiveaway(giveaway, client);
        }
    }
}

/**
 * Manuel bitirme komutu
 */
async function handleEndCommand(interaction) {
    // Bu kısım biraz tricky, mesaj ID'si lazım veya son kanaldaki çekilişi bulmak lazım.
    // Şimdilik basitçe kanaldaki aktif son çekilişi bitirelim.

    const giveaways = getGiveaways();
    const giveaway = giveaways.find(g => g.channelId === interaction.channelId && !g.ended);

    if (!giveaway) {
        return interaction.reply({ content: '❌ Bu kanalda aktif bir çekiliş bulunamadı.', ephemeral: true });
    }

    await endGiveaway(giveaway, interaction.client);
    await interaction.reply({ content: '✅ Çekiliş manuel olarak sonlandırıldı.', flags: MessageFlags.Ephemeral });
}

/**
 * Yeniden Çek (Reroll)
 */
async function handleRerollCommand(interaction) {
    const messageId = interaction.options.getString('mesaj_id');
    const giveaways = getGiveaways();
    const giveaway = giveaways.find(g => g.messageId === messageId);

    if (!giveaway) { // Mesaj ID verilmemişse kanaldaki son biten çekilişe bak
        const lastEnded = giveaways.filter(g => g.channelId === interaction.channel.id && g.ended).pop();
        if (!lastEnded) {
            return interaction.reply({ content: '❌ Geçerli bir çekiliş bulunamadı.', flags: MessageFlags.Ephemeral });
        }
        // Reroll logic
        const winner = lastEnded.participants[Math.floor(Math.random() * lastEnded.participants.length)];

        await interaction.reply({
            content: `🎲 **YENİDEN ÇEKİLDİ!**\n🎉 Yeni Kazanan: <@${winner || 'Kimse'}>! (Ödül: ${lastEnded.prize})`
        });
        return;
    }

    // Specific ID logic would go here
    // ...

    await interaction.reply({ content: 'Bu özellik şu an sadece son çekiliş için çalışıyor.', flags: MessageFlags.Ephemeral });
}


module.exports = {
    handleCreateGiveaway,
    handleJoinGiveaway,
    checkGiveaways,
    handleEndCommand,
    handleRerollCommand
};
