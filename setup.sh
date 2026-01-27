#!/bin/bash

echo "🛡️ Albion Discord Bot - Kurulum Scripti"
echo "========================================"
echo ""

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "✅ .env.local dosyası zaten mevcut"
else
    echo "⚠️  .env.local dosyası bulunamadı"
    echo "📝 .env.local.example dosyasından kopyalanıyor..."
    
    if [ -f ".env.local.example" ]; then
        cp .env.local.example .env.local
        echo "✅ .env.local dosyası oluşturuldu"
        echo "⚠️  Lütfen .env.local dosyasını düzenleyip kendi değerlerinizi girin!"
    else
        echo "❌ .env.local.example dosyası bulunamadı!"
        exit 1
    fi
fi

echo ""
echo "📦 Bağımlılıklar yükleniyor..."
npm install

echo ""
echo "✅ Kurulum tamamlandı!"
echo ""
echo "🚀 Botu başlatmak için: npm start"
echo "📝 .env.local dosyasını düzenlemeyi unutmayın!"
