// Slot and Party Constants
const EMPTY_SLOT = '****';

// Default Content
const DEFAULT_CONTENT = "STATİK RAT\nTRACKİNG BİZİM MAP\nGRUP CAMP BOSS LAIRY\nKRİSTAL";

// Notes Text
const NOTLAR_METNI = [
    '**📌 Turquoise** guild kurallarına uyum zorunludur.',
    '**🎤 Discord** sesli kanala giriş zorunludur.',
    '**🛡️ Kendi bölgelerimizde** ölüm riski yoktur.',
    '**💰 Loot** dağıtımı lidere aittir.',
    '**⏰ Geç kalan** alınmaz.'
].join('\n');

// Role Icons
const ROLE_ICONS = {
    TANK: '🛡️',
    HEAL: '☘️',
    DPS: '⚔️',
    DEFAULT: '👤'
};

module.exports = {
    EMPTY_SLOT,
    DEFAULT_CONTENT,
    NOTLAR_METNI,
    ROLE_ICONS
};
