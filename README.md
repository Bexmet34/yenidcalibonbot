# 🛡️ Albion Discord Bot

Discord sunucunuz için gelişmiş parti kurma ve yönetim botu.

## 📁 Proje Yapısı

```
dcalbionbot/
├── src/
│   ├── index.js                    # Ana giriş noktası
│   ├── config/
│   │   └── config.js              # Konfigürasyon yönetimi
│   ├── constants/
│   │   └── constants.js           # Sabitler
│   ├── commands/
│   │   └── commands.js            # Slash komut tanımları
│   ├── handlers/
│   │   ├── commandHandler.js      # Komut işleyicileri
│   │   ├── partikurHandler.js     # Parti kurma işleyicileri
│   │   ├── buttonHandler.js       # Buton etkileşim işleyicileri
│   │   └── modalHandler.js        # Modal işleyicileri
│   ├── services/
│   │   ├── queueService.js        # Parti kuyruğu yönetimi
│   │   ├── autoCloseService.js    # Otomatik kapanma servisi
│   │   └── commandRegistration.js # Komut kayıt servisi
│   ├── builders/
│   │   ├── embedBuilder.js        # Embed oluşturucular
│   │   ├── componentBuilder.js    # Component oluşturucular
│   │   └── payloadBuilder.js      # Payload oluşturucular
│   └── utils/
│       └── interactionUtils.js    # Etkileşim yardımcıları
├── .env                            # Ortam değişkenleri (Git'e eklenmez)
├── .env.example                    # Ortam değişkenleri şablonu
├── .env.local                      # Yerel ortam değişkenleri (Git'e eklenmez)
├── .gitignore
├── package.json
└── README.md
```

## 🚀 Kurulum

### 1. Bağımlılıkları Yükleyin
```bash
npm install
```

### 2. Ortam Değişkenlerini Ayarlayın

#### Windows PC'de (Geliştirme):
`.env.local` dosyası oluşturun:
```bash
DISCORD_TOKEN=your_windows_bot_token
CLIENT_ID=your_client_id
GUILD_ID=your_guild_id
```

#### Ubuntu VDS'de (Production):
`.env.local` dosyası oluşturun:
```bash
DISCORD_TOKEN=your_ubuntu_bot_token
CLIENT_ID=your_client_id
GUILD_ID=your_guild_id
```

> **ÖNEMLİ:** `.env.local` dosyası Git'e eklenmez. Her ortamda kendi `.env.local` dosyanızı oluşturun.

### 3. Botu Başlatın
```bash
npm start
```

## 🔄 Git Workflow

### Windows PC'de:
```bash
# Değişiklikleri commit et
git add .
git commit -m "Yeni özellik eklendi"
git push origin main
```

### Ubuntu VDS'de:
```bash
# Yeni değişiklikleri çek
git pull origin main

# .env.local dosyanız korunur, değişmez
npm start
```

## 🎯 Özellikler

- `/pve` - PVE content başvurusu oluştur
- `/partikur` - Özel parti başvurusu oluştur
- `/yardim` - Yardım menüsü

## 📝 Notlar

- `.env` dosyası Git'e eklenmez
- `.env.local` dosyası her ortamda farklı olabilir ve Git'e eklenmez
- `.env.example` dosyası şablon olarak Git'e eklenir
- Kod değişiklikleri her iki ortamda da aynı kalır

## 🛠️ Geliştirici

Hakkı

## 📄 Lisans

MIT
