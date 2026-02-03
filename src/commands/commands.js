const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('pve')
        .setDescription('Albion Online için yeni bir PVE content başvurusu oluşturur.')
        .addStringOption(option =>
            option.setName('başlık')
                .setDescription('İçerik başlığı (örn: 💰 PVE SİL SÜPERME)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('detaylar')
                .setDescription('Loot, Fame ve diğer detaylar')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('içerik')
                .setDescription('STATİK RAT, KRİSTAL vb. (Boş bırakılırsa varsayılan Albion içerikleri kullanılır)')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('dps_sayısı')
                .setDescription('Kaç adet DPS slotu olsun? (Varsayılan: 4)')
                .setRequired(false)),
    new SlashCommandBuilder()
        .setName('partikur')
        .setDescription('Özel bir parti başvurusu oluşturur.'),
    new SlashCommandBuilder()
        .setName('yardim')
        .setDescription('Bot komutları ve geliştirici hakkında bilgi verir.'),
    new SlashCommandBuilder()
        .setName('partikapat')
        .setDescription('Aktif partinizi sonlandırır.'),
    new SlashCommandBuilder()
        .setName('uyeler')
        .setDescription('Avrupa sunucusu lonca üyelerini listeler.'),
    new SlashCommandBuilder()
        .setName('kayitsistemi')
        .setDescription('Loncaya özel kayıt sistemini kurar.')
        .addRoleOption(option =>
            option.setName('rol')
                .setDescription('Kayıt sonrası verilecek rol')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Kayıt butonunun gönderileceği kanal')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('cekilis')
        .setDescription('Çekiliş işlemlerini yönetir. ')
        .addSubcommand(subcommand =>
            subcommand
                .setName('baslat')
                .setDescription('Yeni bir çekiliş başlatır (Kurulum penceresini açar).')
                .addAttachmentOption(option => option.setName('resim').setDescription('Çekiliş görseli (Yüklemek isterseniz)').setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bitir')
                .setDescription('Kanalda aktif olan çekilişi anında bitirir.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('katilimcilar')
                .setDescription('Çekilişe katılanları listeler.')
                .addStringOption(option => option.setName('mesaj_id').setDescription('Çekiliş mesaj IDsi').setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('yenile')
                .setDescription('Son çekilişin kazananını yeniden seçer.')),
    new SlashCommandBuilder()
        .setName('me')
        .setDescription('İstatistiklerinizi veya başka bir oyuncunun istatistiklerini gösterir.')
        .addStringOption(option =>
            option.setName('isim')
                .setDescription('İstatistikleri görülecek oyuncunun adı')
                .setRequired(false))
].map(command => command.toJSON());

module.exports = commands;
