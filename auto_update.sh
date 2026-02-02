#!/bin/bash

# Yapılandırma
BRANCH="main" # Reponuzun ana branşı (genellikle main veya master)
CHECK_INTERVAL=60 # Kaç saniyede bir kontrol edilecek (varsayılan 60sn)
BOT_PROCESS_NAME="yenidcalibon" # Botunuzun PM2'deki adı

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🔄 Otomatik Güncelleme Sistemi Başlatılıyor...${NC}"
echo -e "${CYAN}📡 Takip edilen branş: ${YELLOW}$BRANCH${NC}"
echo -e "${CYAN}⏱️  Kontrol aralığı: ${YELLOW}$CHECK_INTERVAL saniye${NC}"

# Döngü
while true; do
    # Git fetch ile uzak sunucudaki değişiklikleri kontrol et (sessiz modda)
    git fetch origin $BRANCH > /dev/null 2>&1

    # Yerel ve Uzak commit hash'lerini al
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/$BRANCH)

    if [ "$LOCAL" != "$REMOTE" ]; then
        echo -e "\n${YELLOW}📥 Yeni güncelleme tespit edildi! (${REMOTE:0:7})${NC}"
        
        # Değişiklikleri çek
        echo -e "${CYAN}⬇️  Git pull çalıştırılıyor...${NC}"
        git pull origin $BRANCH
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Kod başarıyla güncellendi.${NC}"
            
            # Bağımlılıkları güncelle (eğer package.json değiştiyse)
            if git diff --name-only $LOCAL $REMOTE | grep "package.json" > /dev/null; then
                echo -e "${YELLOW}📦 package.json değişmiş, npm install çalıştırılıyor...${NC}"
                npm install
            fi
            
            # Botu yeniden başlat
            echo -e "${CYAN}♻️  Bot yeniden başlatılıyor...${NC}"
            
            if command -v pm2 &> /dev/null; then
                # PM2 process'ini yeniden başlat
                pm2 restart $BOT_PROCESS_NAME
                
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}✅ Bot ($BOT_PROCESS_NAME) başarıyla yeniden başlatıldı.${NC}"
                    touch .update_success # Botun güncellendiğini belirtmek için dosya oluştur
                else
                    echo -e "${RED}❌ Bot yeniden başlatılamadı! PM2 process isminin '$BOT_PROCESS_NAME' olduğundan emin olun.${NC}"
                    echo -e "${YELLOW}💡 İpucu: Botunuzu 'pm2 start src/index.js --name $BOT_PROCESS_NAME' ile başlattınız mı?${NC}"
                fi
            else
                echo -e "${RED}⚠️  PM2 yüklü değil! Botu otomatik yeniden başlatamıyorum.${NC}"
            fi
            
        else
            echo -e "${RED}❌ Git pull başarısız oldu. Lütfen manuel kontrol edin.${NC}"
        fi
        
        echo -e "___________________________________________________\n"
    fi

    # Bekle
    sleep $CHECK_INTERVAL
done
