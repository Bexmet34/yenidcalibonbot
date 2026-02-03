const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { parseDuration } = require('../utils/timeUtils');

const DATA_FILE = path.join(__dirname, '../data/giveaways.json');
const DATA_DIR = path.dirname(DATA_FILE);

// Geçici önbellek (Resim gibi verileri komut -> modal arası taşımak için)
const giveawayCache = new Map();

// Helper: Read Data
function getGiveaways() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

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
    // Resim varsa önbelleğe al
    const imageAttachment = interaction.options.getAttachment('resim');
    if (imageAttachment) {
        giveawayCache.set(interaction.user.id, {
            attachmentUrl: imageAttachment.url,
            expiry: Date.now() + (5 * 60 * 1000) // 5 dakika geçerli
        });
    }

    await handleGiveawayBaslatCommand(interaction);
}

/**
 * Katıl butonu işlemi
 */
async function handleJoinGiveaway(interaction) {
    const giveaways = getGiveaways();
    const giveawayIndex = giveaways.findIndex(g => g.messageId === interaction.message.id);

    if (giveawayIndex === -1) {
        return interaction.reply({ content: '❌ Bu çekiliş bulunamadı.', flags: MessageFlags.Ephemeral });
    }

    const giveaway = giveaways[giveawayIndex];
    if (giveaway.ended) {
        return interaction.reply({ content: '⚠️ Bu çekiliş sona erdi!', flags: MessageFlags.Ephemeral });
    }

    const member = interaction.member;
    const user = interaction.user;

    // 1. Required Role
    if (giveaway.requiredRoleId && !member.roles.cache.has(giveaway.requiredRoleId)) {
        return interaction.reply({ content: `❌ Bu çekilişe katılmak için <@&${giveaway.requiredRoleId}> rolüne sahip olmalısın!`, flags: MessageFlags.Ephemeral });
    }

    // 2. Banned Role
    if (giveaway.bannedRoleId && member.roles.cache.has(giveaway.bannedRoleId)) {
        return interaction.reply({ content: `🚫 <@&${giveaway.bannedRoleId}> rolüne sahip olduğunuz için katılamazsınız.`, flags: MessageFlags.Ephemeral });
    }

    // 3. Server Age
    if (giveaway.dayLimit) {
        const daysInServer = (Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24);
        if (daysInServer < giveaway.dayLimit) {
            return interaction.reply({ content: `⏳ Sunucuda en az **${giveaway.dayLimit} gün** bulunmalısın. (Süre: ${Math.floor(daysInServer)} gün)`, flags: MessageFlags.Ephemeral });
        }
    }

    // 4. Account Age
    if (giveaway.accountAgeLimit) {
        const accountDays = (Date.now() - user.createdTimestamp) / (1000 * 60 * 60 * 24);
        if (accountDays < giveaway.accountAgeLimit) {
            return interaction.reply({ content: `🤖 Hesabın en az **${giveaway.accountAgeLimit} günlük** olmalı. (Senin: ${Math.floor(accountDays)} gün)`, flags: MessageFlags.Ephemeral });
        }
    }

    if (giveaway.participants.includes(user.id)) {
        giveaway.participants = giveaway.participants.filter(id => id !== user.id);
        saveGiveaways(giveaways);
        updateGiveawayMessage(interaction, giveaway);
        return interaction.reply({ content: '📤 Çekilişten ayrıldın.', flags: MessageFlags.Ephemeral });
    }

    giveaway.participants.push(user.id);
    saveGiveaways(giveaways);
    updateGiveawayMessage(interaction, giveaway);

    // Calculate Chance
    const total = giveaway.participants.length;
    const winCount = giveaway.winnerCount || 1;
    const chance = Math.min(100, (winCount / total) * 100).toFixed(1);

    await interaction.reply({
        content: `✅ Çekilişe katıldın! Bol şans.\n📊 **Tahmini Kazanma Şansın:** %${chance}`,
        flags: MessageFlags.Ephemeral
    });
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
        console.error(`Giveaway End Error [${giveaway.messageId}]:`, error.message);

        // Eğer mesaj/kanal silindiyse (10008, 10003) veya botun erişimi yoksa (50001)
        if (error.code === 10008 || error.code === 10003 || error.code === 50001) {
            console.log(`[Giveaway] Mesaj/Kanal sorunu veya yetki yok (${error.code}). Çekiliş veritabanından kapatılıyor.`);
            const allGiveaways = getGiveaways();
            const index = allGiveaways.findIndex(g => g.messageId === giveaway.messageId);
            if (index !== -1) {
                allGiveaways[index].ended = true;
                saveGiveaways(allGiveaways);
            }
        }
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


/**
 * Katılımcıları listeler
 */
async function handleListParticipants(interaction) {
    const messageId = interaction.options.getString('mesaj_id');
    const giveaways = getGiveaways();

    let giveaway;
    if (messageId) {
        giveaway = giveaways.find(g => g.messageId === messageId);
    } else {
        // Kanaldaki en son çekilişi bul (aktif veya bitmiş)
        giveaway = giveaways.filter(g => g.channelId === interaction.channelId).pop();
    }

    if (!giveaway) {
        return interaction.reply({ content: '❌ Uygun bir çekiliş bulunamadı.', flags: MessageFlags.Ephemeral });
    }

    if (giveaway.participants.length === 0) {
        return interaction.reply({ content: '👥 Henüz kimse katılmamış.', flags: MessageFlags.Ephemeral });
    }

    const participantMentions = giveaway.participants.map(id => `<@${id}>`).join(', ');
    const embed = new EmbedBuilder()
        .setTitle('🔍 Katılımcı Önizleme')
        .setDescription(`
**Ödül:** \`${giveaway.prize}\`
**Toplam Katılımcı:** ${giveaway.participants.length}

**Katılanlar:**
${participantMentions.length > 2000 ? participantMentions.substring(0, 1990) + '...' : participantMentions}
        `)
        .setColor('#3498DB');

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/**
 * Çekiliş kurulum modalını açar
 */
async function handleGiveawayBaslatCommand(interaction) {
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

    const modal = new ModalBuilder()
        .setCustomId('giveaway_modal')
        .setTitle('🎉 Çekiliş Kurulumu');

    const prizeInput = new TextInputBuilder()
        .setCustomId('giveaway_prize')
        .setLabel('Hangi Ödül Verilecek?')
        .setPlaceholder('Örn: 1.000.000 Gümüş / T8 Ödül Paketi')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const durationInput = new TextInputBuilder()
        .setCustomId('giveaway_duration')
        .setLabel('Ne Kadar Sürecek?')
        .setPlaceholder('Örn: 10dk, 2sa, 1g, 1h')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const winnersInput = new TextInputBuilder()
        .setCustomId('giveaway_winners')
        .setLabel('Kaç Kazanan Olacak?')
        .setPlaceholder('Varsayılan: 1')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    const serverAgeInput = new TextInputBuilder()
        .setCustomId('giveaway_server_age')
        .setLabel('Sunucu Yaş Sınırı (Gün)')
        .setPlaceholder('Örn: 7 (Gerekmiyorsa boş bırakın)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    const accountAgeInput = new TextInputBuilder()
        .setCustomId('giveaway_account_age')
        .setLabel('Hesap Yaş Sınırı (Gün)')
        .setPlaceholder('Örn: 30 (Gerekmiyorsa boş bırakın)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(prizeInput),
        new ActionRowBuilder().addComponents(durationInput),
        new ActionRowBuilder().addComponents(winnersInput),
        new ActionRowBuilder().addComponents(serverAgeInput),
        new ActionRowBuilder().addComponents(accountAgeInput)
    );

    await interaction.showModal(modal);
}

/**
 * Modal formundan gelen verilerle çekilişi başlatır
 */
async function handleGiveawayModalSubmit(interaction) {
    console.log('[Giveaway] Modal submission received from:', interaction.user.tag);
    const prize = interaction.fields.getTextInputValue('giveaway_prize');
    const durationStr = interaction.fields.getTextInputValue('giveaway_duration');
    const winnerCount = parseInt(interaction.fields.getTextInputValue('giveaway_winners')) || 1;
    const dayLimit = parseInt(interaction.fields.getTextInputValue('giveaway_server_age')) || 0;
    const accountAgeLimit = parseInt(interaction.fields.getTextInputValue('giveaway_account_age')) || 0;

    // Önbellekten resmi kontrol et (Sadece yüklenen resmi kullan)
    const cachedData = giveawayCache.get(interaction.user.id);
    const imageUrl = cachedData?.attachmentUrl;

    // Önbelleği temizle
    if (cachedData) giveawayCache.delete(interaction.user.id);

    const durationMs = parseDuration(durationStr);
    if (!durationMs) {
        return interaction.reply({ content: '❌ Geçersiz süre formatı! Örnekler: 10dk, 2sa, 1g', flags: MessageFlags.Ephemeral });
    }

    const endTime = Date.now() + durationMs;
    const endTimestamp = Math.round(endTime / 1000);

    // Şartlar metni
    let requirementsText = '';
    if (dayLimit > 0) requirementsText += `\n⏳ **Sunucu Yaşı:** En az ${dayLimit} gün`;
    if (accountAgeLimit > 0) requirementsText += `\n🤖 **Hesap Yaşı:** En az ${accountAgeLimit} gün`;
    if (!requirementsText) requirementsText = '\n⭐ **Katılım:** Herkese açık';

    const embed = new EmbedBuilder()
        .setTitle('🎁 ÖZEL ÇEKİLİŞ BAŞLADI! 🎁')
        .setDescription(`
**Ödül:** \` ${prize} \`

> Aşağıdaki butona tıklayarak çekilişe katılabilirsin!
> Katılmak için aşağıdaki şartları sağlıyor olmalısın.

**📋 KATILIM ŞARTLARI:**${requirementsText}

**📅 BİTİŞ ZAMANI:**
⏳ <t:${endTimestamp}:R> (<t:${endTimestamp}:f>)

**📊 İSTATİSTİKLER:**
🏆 **Kazanan:** ${winnerCount} Kişi
👑 **Host:** ${interaction.user}
👥 **Katılımcı:** 0 Kişi
        `)
        .setColor('#FFD700')
        .setThumbnail('https://render.albiononline.com/v1/item/TREASURECHEST_KEY_T8_0.png')
        .setFooter({ text: '🛡️ Turquoise Çekiliş Sistemi', iconURL: interaction.guild.iconURL() })
        .setTimestamp(endTime);

    if (imageUrl && imageUrl.startsWith('http')) {
        embed.setImage(imageUrl);
    }

    const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('giveaway_join')
            .setLabel('🎉 Çekilişe Katıl (0)')
            .setStyle(ButtonStyle.Success)
    );

    const message = await interaction.channel.send({ embeds: [embed], components: [button] });

    try {
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
            ended: false,
            dayLimit: dayLimit > 0 ? dayLimit : null,
            accountAgeLimit: accountAgeLimit > 0 ? accountAgeLimit : null,
            imageUrl: imageUrl || null
        });
        saveGiveaways(giveaways);
    } catch (dbErr) {
        console.error('[Giveaway] DB Error:', dbErr);
    }

    await interaction.reply({ content: `✅ Çekiliş başarıyla oluşturuldu!`, flags: MessageFlags.Ephemeral });
}

module.exports = {
    handleCreateGiveaway,
    handleJoinGiveaway,
    checkGiveaways,
    handleEndCommand,
    handleRerollCommand,
    handleListParticipants,
    handleGiveawayBaslatCommand,
    handleGiveawayModalSubmit
};
