const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const commands = [
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
