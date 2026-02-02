#!/bin/bash

# Renk tanımlamaları
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🛡️  Albion Discord Bot - Kurulum Scripti${NC}"
echo "========================================"

# Environment kontrolü
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ .env.local dosyası mevcut${NC}"
else
    echo -e "${YELLOW}⚠️  .env.local dosyası bulunamadı${NC}"
    if [ -f ".env.local.example" ]; then
        cp .env.local.example .env.local
        echo -e "${GREEN}✅ .env.local oluşturuldu.${NC}"
        echo -e "${YELLOW}⚠️  Lütfen .env.local dosyasını düzenleyip tokenlarınızı girin!${NC}"
    else
        echo -e "${RED}❌ .env.local.example bulunamadı!${NC}"
    fi
fi

# Git güncellemelerini çek
echo -e "\n${YELLOW}📦 Git reposu güncelleniyor...${NC}"
git pull

# Bağımlılıkları yükle
echo -e "\n${YELLOW}📦 Bağımlılıklar yükleniyor...${NC}"
npm install

# PM2 kontrolü ve kurulumu
if ! command -v pm2 &> /dev/null; then
    echo -e "\n${YELLOW}⚙️  PM2 (Process Manager) bulunamadı, yükleniyor...${NC}"
    npm install -g pm2
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PM2 başarıyla yüklendi.${NC}"
    else
        echo -e "${RED}❌ PM2 yüklenirken hata oluştu. Lütfen 'sudo npm install -g pm2' komutunu deneyin.${NC}"
        # Sudo erişimi yoksa devam etmeye çalışalım
    fi
else
    echo -e "\n${GREEN}✅ PM2 zaten yüklü.${NC}"
fi

# auto_update.sh yetkilendirme
if [ -f "auto_update.sh" ]; then
    chmod +x auto_update.sh
    echo -e "${GREEN}✅ auto_update.sh çalıştırılabilir yapıldı.${NC}"
fi

echo -e "\n${GREEN}✅ Kurulum ve Güncelleme Hazır!${NC}"
echo -e "${YELLOW}ℹ️  Botu başlatmak ve otomatik güncelleme sürecini aktif etmek için:${NC}"
echo -e "   1. ${GREEN}pm2 start src/index.js --name albionbot${NC}"
echo -e "   2. ${GREEN}pm2 start auto_update.sh --name autoupdater${NC}"
echo -e "\n${YELLOW}Veya sadece botu başlatmak için:${NC}"
echo -e "   ${GREEN}npm start${NC}"
