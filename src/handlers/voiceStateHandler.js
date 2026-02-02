const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    getVoiceConnection
} = require('@discordjs/voice');
const voiceConfig = require('../config/voiceConfig');
const { EmbedBuilder } = require('discord.js');

let activeConnection = null;
let audioPlayer = null;

/**
 * Metni sese çevirir ve bittiğinde callback çalıştırır
 */
function playTTS(connection, text, callback = null) {
    if (!audioPlayer) audioPlayer = createAudioPlayer();

    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=tr&client=tw-ob`;
    const resource = createAudioResource(ttsUrl, { inlineVolume: true });
    resource.volume.setVolume(voiceConfig.VOLUME);

    connection.subscribe(audioPlayer);

    if (callback) {
        audioPlayer.once(AudioPlayerStatus.Idle, () => {
            callback();
        });
    }

    audioPlayer.play(resource);
}

/**
 * Hedef kanala bağlanır ve mesajı okur
 */
async function speakInChannel(channel, text, callback = null) {
    try {
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        activeConnection = connection;
        playTTS(connection, text, callback);
    } catch (error) {
        console.error(`[Ses] ${channel.name} kanalında konuşurken hata:`, error);
    }
}

/**
 * Yetkililere bildirim mesajı gönderir
 */
async function sendStaffTextNotification(guild, applicant) {
    try {
        const notifyChannel = await guild.channels.fetch(voiceConfig.STAFF_NOTIFICATION_CHANNEL_ID);
        if (!notifyChannel) return;

        const staffRole = voiceConfig.STAFF_ROLE_ID;
        const embed = new EmbedBuilder()
            .setTitle('🎙️ Sesli Kanal Bildirimi')
            .setDescription(`${applicant} kullanıcısı kayıt kanalında bekliyor, ancak şu anda ses kanallarında aktif bir yetkili bulunamadı.`)
            .addFields(
                { name: 'Kullanıcı', value: `${applicant.user.tag}`, inline: true },
                { name: 'Kanal', value: `<#${voiceConfig.VOICE_CHANNEL_ID}>`, inline: true }
            )
            .setColor('#ff9900')
            .setTimestamp();

        await notifyChannel.send({ content: `<@&${staffRole}>`, embeds: [embed] });
        console.log(`[Sistem] Yetkililere yazılı bildirim gönderildi.`);
    } catch (error) {
        console.error('[Bildirim] Yazılı bildirim gönderilirken hata:', error.message);
    }
}

/**
 * voiceStateUpdate olayını yönetir
 */
async function handleVoiceStateUpdate(oldState, newState) {
    const targetChannelId = voiceConfig.VOICE_CHANNEL_ID;
    const targetRoleId = voiceConfig.TARGET_ROLE_ID;
    const staffRoleId = voiceConfig.STAFF_ROLE_ID;

    // Sesli özellik kapalıysa hiçbir şey yapma
    if (!voiceConfig.ENABLED) return;

    // Sadece bir kullanıcı hedef kanala GİRDİĞİNDE tetiklenir
    if (newState.channelId === targetChannelId && oldState.channelId !== targetChannelId) {
        const member = newState.member;
        if (!member || member.user.bot) return;

        // Hedef role sahip mi kontrol et
        if (member.roles.cache.has(targetRoleId)) {
            console.log(`[Sistem] Kayıt bekleyen kullanıcı geldi: ${member.user.tag}`);

            // ADIM 1: Kullanıcıya Hoş Geldin De
            await speakInChannel(newState.channel, "Merhaba, hoş geldin. Lütfen biraz bekle, aktif yetkili varsa haber verip geliyorum.", async () => {

                // ADIM 2: Yetkili Bul
                const guild = newState.guild;
                let staffMember = null;
                let staffChannel = null;

                // Tüm ses kanallarını tara
                const voiceChannels = guild.channels.cache.filter(c => c.type === 2); // 2 = GUILD_VOICE

                for (const [id, channel] of voiceChannels) {
                    if (id === targetChannelId) continue; // Kayıt kanalındakileri sayma

                    const found = channel.members.find(m => !m.user.bot && m.roles.cache.has(staffRoleId));
                    if (found) {
                        staffMember = found;
                        staffChannel = channel;
                        break;
                    }
                }

                if (staffMember && staffChannel) {
                    console.log(`[Sistem] Yetkili bulundu: ${staffMember.user.tag} (${staffChannel.name})`);

                    // ADIM 3: Yetkiliye Haber Ver
                    await speakInChannel(staffChannel, "Selamlar yetkili, ses kanalında bekleyen bir kullanıcı kayıt olmayı bekliyor, lütfen ilgilenir misin?", async () => {

                        // ADIM 4: Kullanıcıya Geri Dön ve Bilgi Ver
                        const userChannel = guild.channels.cache.get(targetChannelId);
                        if (userChannel) {
                            setTimeout(async () => {
                                await speakInChannel(userChannel, "Yetkiliye haber verildi, lütfen bekleyiniz.", () => {
                                    console.log("[Sistem] İşlem başarıyla tamamlandı.");
                                });
                            }, 1000);
                        }
                    });
                } else {
                    console.log("[Sistem] Aktif bir yetkili ses kanalında bulunamadı. Yazılı bildirim gönderiliyor...");

                    // YENİ ADIM: Yetkiliye yazılı bildirim gönder
                    await sendStaffTextNotification(guild, member);

                    // Kullanıcıya bilgi ver
                    const userChannel = guild.channels.cache.get(targetChannelId);
                    if (userChannel) {
                        setTimeout(async () => {
                            await speakInChannel(userChannel, "Herhangi bir yetkili şu anda ses kanalında değil. Mesaj olarak onları bilgilendirdim, en kısa sürede sizinle ilgilenilecektir.", () => {
                                console.log("[Sistem] Yetkili yoktu, kullanıcıya sesli bilgi verildi.");
                            });
                        }, 1000);
                    }
                }
            });
        }
    }

    // Odadan çıkma mantığı (Odada kimse kalmazsa bot çıksın)
    if (voiceConfig.AUTO_LEAVE && oldState.channelId === targetChannelId && newState.channelId !== targetChannelId) {
        setTimeout(async () => {
            const channel = oldState.channel;
            if (channel && channel.members.filter(m => !m.user.bot && m.roles.cache.has(targetRoleId)).size === 0) {
                if (activeConnection) {
                    activeConnection.destroy();
                    activeConnection = null;
                    console.log("[Sistem] Kanal boşaldığı için çıkıldı.");
                }
            }
        }, voiceConfig.LEAVE_DELAY);
    }
}

module.exports = {
    handleVoiceStateUpdate
};
