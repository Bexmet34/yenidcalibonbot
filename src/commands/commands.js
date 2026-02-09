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
        .setDescription('Özel bir parti başvurusu oluşturur.')
        .addStringOption(option =>
            option.setName('tür')
                .setDescription('Parti türünü seçiniz')
                .setRequired(true)
                .addChoices(
                    { name: '⚔️ PVP', value: 'pvp' },
                    { name: '💰 PVE', value: 'pve' }
                )),
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
        .setName('prestij')
        .setDescription('Kendi prestij seviyenizi ve istatistiklerinizi görüntüler.'),
    new SlashCommandBuilder()
        .setName('prestij-bak')
        .setDescription('Başka bir kullanıcının prestij seviyesine bakar.')
        .addUserOption(option =>
            option.setName('kullanici')
                .setDescription('Prestijine bakılacak kullanıcı')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('prestij-liste')
        .setDescription('Sunucudaki en yüksek prestijli 10 oyuncuyu listeler.'),
    new SlashCommandBuilder()
        .setName('prestij-bilgi')
        .setDescription('Prestij sistemi rütbe ve seviye açıklamalarını gösterir.'),

    new SlashCommandBuilder()
        .setName('prestij-ekle')
        .setDescription('[ADMIN] Kullanıcıya prestij ekler.')
        .addUserOption(option => option.setName('kullanici').setDescription('Prestij eklenecek kullanıcı').setRequired(true))
        .addIntegerOption(option => option.setName('miktar').setDescription('Eklenecek miktar').setRequired(true))
        .addStringOption(option => option.setName('tur').setDescription('İçerik türü').addChoices(
            { name: 'PVE', value: 'pve' },
            { name: 'PVP', value: 'pvp' }
        ).setRequired(false)),

    new SlashCommandBuilder()
        .setName('prestij-sil')
        .setDescription('[ADMIN] Kullanıcıdan prestij siler.')
        .addUserOption(option => option.setName('kullanici').setDescription('Prestij silinecek kullanıcı').setRequired(true))
        .addIntegerOption(option => option.setName('miktar').setDescription('Silinecek miktar').setRequired(true))
        .addStringOption(option => option.setName('tur').setDescription('İçerik türü').addChoices(
            { name: 'PVE', value: 'pve' },
            { name: 'PVP', value: 'pvp' }
        ).setRequired(false)),

    new SlashCommandBuilder()
        .setName('prestij-sifirla')
        .setDescription('[ADMIN] Kullanıcının tüm prestij verilerini sıfırlar.')
        .addUserOption(option => option.setName('kullanici').setDescription('Prestij sıfırlanacak kullanıcı').setRequired(true)),

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
                .setRequired(false)),
    new SlashCommandBuilder()
        .setName('wladd')
        .setDescription('Kullanıcıyı beyaz listeye ekler (Maks 3 parti kurabilir).')
        .addUserOption(option =>
            option.setName('kullanici')
                .setDescription('Beyaz listeye eklenecek kullanıcı')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('wlremove')
        .setDescription('Kullanıcıyı beyaz listeden çıkarır.')
        .addUserOption(option =>
            option.setName('kullanici')
                .setDescription('Beyaz listeden çıkarılacak kullanıcı')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
].map(command => command.toJSON());

module.exports = commands;
