@echo off
echo 🛡️ Albion Discord Bot - Kurulum Scripti
echo ========================================
echo.

REM Check if .env.local exists
if exist ".env.local" (
    echo ✅ .env.local dosyası zaten mevcut
) else (
    echo ⚠️  .env.local dosyası bulunamadı
    echo 📝 .env.local.example dosyasından kopyalanıyor...
    
    if exist ".env.local.example" (
        copy .env.local.example .env.local
        echo ✅ .env.local dosyası oluşturuldu
        echo ⚠️  Lütfen .env.local dosyasını düzenleyip kendi değerlerinizi girin!
    ) else (
        echo ❌ .env.local.example dosyası bulunamadı!
        exit /b 1
    )
)

echo.
echo 📦 Bağımlılıklar yükleniyor...
call npm install

echo.
echo ✅ Kurulum tamamlandı!
echo.
echo 🚀 Botu başlatmak için: npm start
echo 📝 .env.local dosyasını düzenlemeyi unutmayın!
pause
