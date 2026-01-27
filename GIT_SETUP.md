# 🔄 Git ve Ortam Yönetimi Rehberi

Bu rehber, projenizi Windows PC'nizde geliştirip Ubuntu VDS'ye nasıl deploy edeceğinizi açıklar.

## 🎯 Amaç

- Windows PC'de kod geliştirme
- GitHub'a push yapma
- Ubuntu VDS'de otomatik güncelleme
- **Her ortamda farklı `.env` ayarları kullanma**

## 📋 İlk Kurulum

### Windows PC'de (Geliştirme Ortamı)

1. **Projeyi klonlayın:**
```bash
git clone https://github.com/your-username/dcalbionbot.git
cd dcalbionbot
```

2. **Kurulum scriptini çalıştırın:**
```bash
setup.bat
```

3. **`.env.local` dosyasını düzenleyin:**
```bash
notepad .env.local
```

Kendi değerlerinizi girin:
```env
DISCORD_TOKEN=your_windows_token
CLIENT_ID=your_client_id
GUILD_ID=your_guild_id
```

4. **Botu başlatın:**
```bash
npm start
```

### Ubuntu VDS'de (Production Ortamı)

1. **Projeyi klonlayın:**
```bash
git clone https://github.com/your-username/dcalbionbot.git
cd dcalbionbot
```

2. **Kurulum scriptini çalıştırın:**
```bash
chmod +x setup.sh
./setup.sh
```

3. **`.env.local` dosyasını düzenleyin:**
```bash
nano .env.local
```

Production değerlerinizi girin:
```env
DISCORD_TOKEN=your_production_token
CLIENT_ID=your_client_id
GUILD_ID=your_guild_id
```

4. **Botu başlatın:**
```bash
npm start
```

## 🔄 Günlük Workflow

### Windows PC'de Geliştirme:

1. **Kod değişikliği yapın**
2. **Test edin:**
```bash
npm start
```

3. **Git'e commit edin:**
```bash
git add .
git commit -m "Yeni özellik: XYZ eklendi"
git push origin main
```

### Ubuntu VDS'de Güncelleme:

1. **Yeni değişiklikleri çekin:**
```bash
cd dcalbionbot
git pull origin main
```

2. **Bağımlılıkları güncelleyin (gerekirse):**
```bash
npm install
```

3. **Botu yeniden başlatın:**
```bash
npm start
```

## 🔐 Önemli Notlar

### ✅ Git'e Eklenecekler:
- Tüm kaynak kodlar (`src/`)
- `package.json`
- `README.md`
- `.env.example` (şablon)
- `.env.local.example` (şablon)
- `.gitignore`

### ❌ Git'e EKLENMEYECEKler:
- `.env` (gerçek değerler)
- `.env.local` (gerçek değerler)
- `node_modules/`
- `*.log` dosyaları

## 🚀 Otomatik Deployment (İsteğe Bağlı)

Ubuntu VDS'de otomatik güncelleme için bir cron job oluşturabilirsiniz:

```bash
crontab -e
```

Ekleyin:
```bash
*/5 * * * * cd /path/to/dcalbionbot && git pull origin main && npm install
```

## 🛡️ Güvenlik

- **ASLA** `.env` veya `.env.local` dosyalarını Git'e eklemeyin
- Token'larınızı kimseyle paylaşmayın
- Her ortamda farklı token kullanın (geliştirme vs production)

## 🆘 Sorun Giderme

### Problem: `.env.local` değişiklikleri uygulanmıyor
**Çözüm:** Botu yeniden başlatın

### Problem: Git pull sonrası `.env.local` silindi
**Çözüm:** `.env.local` Git'e eklenmez, bu normal. Yeniden oluşturun:
```bash
cp .env.local.example .env.local
nano .env.local
```

### Problem: Kod değişiklikleri Ubuntu'da görünmüyor
**Çözüm:** 
```bash
git pull origin main
npm install
```

## 📞 Destek

Sorun yaşarsanız, GitHub Issues'da bir ticket açın.
