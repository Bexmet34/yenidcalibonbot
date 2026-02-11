# 📁 Proje Yapısı - Detaylı Açıklama

## 🗂️ Dizin Yapısı

```
dcalbionbot/
│
├── 📂 src/                          # Kaynak kod dizini
│   │
│   ├── 📄 index.js                  # Ana giriş noktası - Bot başlatma
│   │
│   ├── 📂 config/                   # Konfigürasyon dosyaları
│   │   └── config.js                # Ortam değişkenleri ve ayarlar
│   │
│   ├── 📂 constants/                # Sabit değerler
│   │   └── constants.js             # Slot, içerik, notlar vb. sabitler
│   │
│   ├── 📂 commands/                 # Komut tanımları
│   │   └── commands.js              # Slash komut tanımları (/pve, /partikur, /yardim)
│   │
│   ├── 📂 handlers/                 # Etkileşim işleyicileri
│   │   ├── commandHandler.js        # Slash komut işleyicileri
│   │   ├── partikurHandler.js       # Parti kurma modal ve buton işleyicileri
│   │   ├── buttonHandler.js         # Join/Leave buton işleyicileri
│   │   └── modalHandler.js          # Modal form işleyicileri
│   │
│   ├── 📂 services/                 # İş mantığı servisleri
│   │   ├── queueService.js          # Parti kuyruğu yönetimi
│   │   ├── autoCloseService.js      # Otomatik parti kapanma
│   │   └── commandRegistration.js   # Discord API'ye komut kaydı
│   │
│   ├── 📂 builders/                 # Mesaj oluşturucular
│   │   ├── embedBuilder.js          # Embed mesaj oluşturucular
│   │   ├── componentBuilder.js      # Buton ve component oluşturucular
│   │
│   └── 📂 utils/                    # Yardımcı fonksiyonlar
│       ├── interactionUtils.js      # Güvenli etkileşim ve hata yönetimi
│       └── generalUtils.js          # Genel yardımcı fonksiyonlar (örn: progress bar)
│
├── 📂 node_modules/                 # NPM bağımlılıkları (Git'e eklenmez)
│
├── 📄 .env                          # Ortam değişkenleri (Git'e eklenmez)
├── 📄 .env.local                    # Yerel ortam değişkenleri (Git'e eklenmez)
├── 📄 .env.example                  # Ortam değişkenleri şablonu
├── 📄 .env.local.example            # Yerel ortam şablonu
│
├── 📄 .gitignore                    # Git ignore kuralları
├── 📄 package.json                  # NPM paket tanımları
├── 📄 package-lock.json             # NPM bağımlılık kilidi
│
├── 📄 README.md                     # Proje dokümantasyonu
├── 📄 GIT_SETUP.md                  # Git ve ortam yönetimi rehberi
├── 📄 STRUCTURE.md                  # Bu dosya - Proje yapısı açıklaması
│
├── 🔧 setup.bat                     # Windows kurulum scripti
└── 🔧 setup.sh                      # Linux/Ubuntu kurulum scripti
```

## 📝 Dosya Açıklamaları

### 🎯 Ana Dosyalar

#### `src/index.js`
- Bot'un başlangıç noktası
- Discord client oluşturma
- Event listener'ları kaydetme
- Hata yönetimi

### ⚙️ Config (Konfigürasyon)

#### `src/config/config.js`
- Ortam değişkenlerini yükleme
- `.env.local` desteği
- Global ayarlar (MAX_ACTIVE_PARTIES vb.)

### 🔢 Constants (Sabitler)

#### `src/constants/constants.js`
- `EMPTY_SLOT`: Boş slot işareti (****)
- `DEFAULT_CONTENT`: Varsayılan içerik metni
- `NOTLAR_METNI`: Parti notları
- `ROLE_ICONS`: Rol ikonları (🛡️, ☘️, ⚔️)

### 💬 Commands (Komutlar)

#### `src/commands/commands.js`
- `/pve` komut tanımı
- `/partikur` komut tanımı
- `/yardim` komut tanımı
- Slash command builder'lar

### 🎮 Handlers (İşleyiciler)

#### `src/handlers/commandHandler.js`
- `/yardim` komutu işleme
- `/pve` komutu işleme
- Kuyruk kontrolü

#### `src/handlers/partikurHandler.js`
- `/partikur` komutu işleme
- Süre seçim butonları
- Modal gösterme

#### `src/handlers/buttonHandler.js`
- Join butonları (Tank, Heal, DPS)
- Leave butonu
- Slot doluluğu kontrolü
- Embed güncelleme

#### `src/handlers/modalHandler.js`
- Parti modal form işleme
- Rol listesi parse etme
- Parti oluşturma

### 🔧 Services (Servisler)

#### `src/services/commandRegistration.js`
- Discord API'ye komut kaydı
- SSL hata yönetimi
- Otomatik yeniden deneme

### 🏗️ Builders (Oluşturucular)

#### `src/builders/embedBuilder.js`
- PVE embed oluşturma
- Partikur embed oluşturma
- Yardım embed'i
- Kuyruk embed'i

#### `src/builders/componentBuilder.js`
- PVE butonları
- Süre seçim butonları
- Özel parti butonları
- Buton durumu güncelleme

### 🛠️ Utils (Yardımcılar)

#### `src/utils/interactionUtils.js`
- Güvenli reply fonksiyonu
- SSL hata yönetimi
- Permission hata yönetimi
- Genel hata işleme

## 🔄 Veri Akışı

### PVE Komutu Akışı:
```
1. User: /partikur komutu
2. commandHandler.js (handlePartikurCommand): Komutu işle
3. modalHandler.js: Form verilerini al
4. embedBuilder.js: Embed oluştur
5. componentBuilder.js: Butonları oluştur
6. partyManager.js: Partiyi veritabanına kaydet
```

### Buton Etkileşimi Akışı:
```
1. User: Join butonu tıkla
2. buttonHandler.js: Butonu işle
3. componentBuilder.js: Buton durumunu güncelle
4. embedBuilder.js: Embed'i güncelle
5. interactionUtils.js: Güvenli güncelle
```

## 🎨 Modüler Tasarım Avantajları

### ✅ Bakım Kolaylığı
- Her dosya tek bir sorumluluğa sahip
- Hata ayıklama kolay
- Kod tekrarı yok

### ✅ Ölçeklenebilirlik
- Yeni özellik eklemek kolay
- Mevcut kodu bozmadan geliştirme
- Test edilebilir yapı

### ✅ Okunabilirlik
- Açık dosya isimleri
- Mantıksal gruplandırma
- Kolay navigasyon

## 🚀 Yeni Özellik Ekleme

### Yeni Komut Eklemek:
1. `src/commands/commands.js` - Komut tanımı ekle
2. `src/handlers/` - Yeni handler oluştur
3. `src/index.js` - Handler'ı bağla

### Yeni Embed Tipi Eklemek:
1. `src/builders/embedBuilder.js` - Yeni embed fonksiyonu
2. İlgili handler'da kullan

### Yeni Servis Eklemek:
1. `src/services/` - Yeni servis dosyası
2. İlgili handler'larda import et

## 📚 Bağımlılıklar

- **discord.js**: Discord API client
- **dotenv**: Ortam değişkenleri yönetimi

## 🔐 Güvenlik

- `.env` ve `.env.local` Git'e eklenmez
- Token'lar kod içinde hardcoded değil
- Hata mesajlarında hassas bilgi yok
