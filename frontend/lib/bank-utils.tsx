import React from 'react';

// Функция для получения квадратных SVG логотипов банков
export const getBankIcon = (bankType: string, size: "sm" | "md" = "md") => {
  const bankLogos: Record<string, string> = {
    SBERBANK: "/bank-logos/sberbank.svg",
    TBANK: "/bank-logos/tbank.svg",
    TINK: "/bank-logos/tbank.svg", // Map TINK to TBANK logo
    ALFABANK: "/bank-logos/alfabank.svg",
    VTB: "/bank-logos/vtb.svg",
    RAIFFEISEN: "/bank-logos/raiffeisen.svg",
    GAZPROMBANK: "/bank-logos/gazprombank.svg",
    POCHTABANK: "/bank-logos/pochtabank.svg",
    PROMSVYAZBANK: "/bank-logos/psb.svg",
    PSB: "/bank-logos/psb.svg",
    SOVCOMBANK: "/bank-logos/sovcombank.svg",
    SPBBANK: "/bank-logos/bspb.svg",
    BSPB: "/bank-logos/bspb.svg",
    ROSSELKHOZBANK: "/bank-logos/rshb.svg",
    RSHB: "/bank-logos/rshb.svg",
    OTKRITIE: "/bank-logos/otkritie.svg",
    URALSIB: "/bank-logos/uralsib.svg",
    MKB: "/bank-logos/mkb.svg",
    ROSBANK: "/bank-logos/rosbank.svg",
    ZENIT: "/bank-logos/zenit.svg",
    RUSSIAN_STANDARD: "/bank-logos/russian-standard.svg",
    AVANGARD: "/bank-logos/avangard.svg",
    RNKB: "/bank-logos/rnkb.svg",
    SBP: "/bank-logos/sbp.svg",
    AKBARS: "/bank-logos/akbars.svg",
    OTPBANK: "/bank-logos/otpbank.svg",
    OTP: "/bank-logos/otpbank.svg", // Map OTP to OTPBANK logo
    MTSBANK: "/bank-logos/mtsbank.svg",
    MTS: "/bank-logos/mtsbank.svg", // Map MTS to MTSBANK logo
    OZONBANK: "/bank-logos/ozonbank.svg",
    OZON: "/bank-logos/ozonbank.svg", // Map OZON to OZONBANK logo
  };

  const logoPath = bankLogos[bankType] || bankLogos[bankType?.toUpperCase()];
  const sizeClasses = size === "sm" ? "w-8 h-8" : "w-10 h-10";

  if (logoPath) {
    return (
      <div
        className={`${sizeClasses} rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center p-1`}
      >
        <img
          src={logoPath}
          alt={bankType}
          className="w-full h-full object-contain"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.parentElement!.innerHTML = `
              <svg class="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            `;
          }}
        />
      </div>
    );
  }

  // Fallback icon for unknown banks
  return (
    <div
      className={`${sizeClasses} rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center`}
    >
      <svg
        className="w-5 h-5 text-gray-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    </div>
  );
};

// Emoji icons for banks (for bank selector and places where SVG is not used)
export const bankEmojis: Record<string, string> = {
  SBERBANK: '💚',
  TBANK: '⚡',
  ALFABANK: '🅰️',
  VTB: '🔷',
  RAIFFEISEN: '🟡',
  GAZPROMBANK: '🔵',
  POCHTABANK: '📮',
  ROSSELKHOZBANK: '🌾',
  URALSIB: '💎',
  LOKOBANK: '🚂',
  AKBARS: '🐆',
  MKB: '🏦',
  SPBBANK: '⚓',
  MTSBANK: '📱',
  PROMSVYAZBANK: '🔗',
  OZONBANK: '🛒',
  RENAISSANCE: '🎭',
  OTPBANK: '🏛️',
  AVANGARD: '🛡️',
  VLADBUSINESSBANK: '🏢',
  TAVRICHESKIY: '🏔️',
  FORABANK: '🎯',
  BCSBANK: '📈',
  HOMECREDIT: '🏠',
  BBRBANK: '🌟',
  CREDITEUROPE: '🇪🇺',
  RNKB: '🏛️',
  UBRIR: '🏔️',
  GENBANK: '🧬',
  SINARA: '🚄',
  ABSOLUTBANK: '💯',
  MTSMONEY: '📱',
  SVOYBANK: '🏘️',
  TRANSKAPITALBANK: '💸',
  DOLINSK: '🏞️',
  SOVCOMBANK: '🎪',
  ROSBANK: '🌹',
  UNICREDIT: '🦄',
  CITIBANK: '🌃',
  RUSSIANSTANDARD: '🦅',
  OTKRITIE: '🔓',
};

// Get bank name by code
export const getBankName = (bankCode: string): string => {
  const bankNames: Record<string, string> = {
    SBERBANK: 'Сбербанк',
    TBANK: 'Т-Банк',
    ALFABANK: 'Альфа-Банк',
    VTB: 'ВТБ',
    RAIFFEISEN: 'Райффайзенбанк',
    GAZPROMBANK: 'Газпромбанк',
    POCHTABANK: 'Почта Банк',
    ROSSELKHOZBANK: 'Россельхозбанк',
    URALSIB: 'Уралсиб',
    LOKOBANK: 'Локо-Банк',
    AKBARS: 'Ак Барс Банк',
    MKB: 'МКБ',
    SPBBANK: 'Банк Санкт-Петербург',
    MTSBANK: 'МТС Банк',
    PROMSVYAZBANK: 'Промсвязьбанк',
    OZONBANK: 'Озон Банк',
    RENAISSANCE: 'Ренессанс Кредит',
    OTPBANK: 'ОТП Банк',
    AVANGARD: 'Авангард',
    VLADBUSINESSBANK: 'Владбизнесбанк',
    TAVRICHESKIY: 'Таврический',
    FORABANK: 'Фора-Банк',
    BCSBANK: 'БКС Банк',
    HOMECREDIT: 'Хоум Кредит',
    BBRBANK: 'ББР Банк',
    CREDITEUROPE: 'Кредит Европа Банк',
    RNKB: 'РНКБ',
    UBRIR: 'УБРиР',
    GENBANK: 'Генбанк',
    SINARA: 'Синара',
    ABSOLUTBANK: 'Абсолют Банк',
    MTSMONEY: 'МТС Деньги',
    SVOYBANK: 'Свой Банк',
    TRANSKAPITALBANK: 'Транскапиталбанк',
    DOLINSK: 'Долинск',
    SOVCOMBANK: 'Совкомбанк',
    ROSBANK: 'Росбанк',
    UNICREDIT: 'ЮниКредит Банк',
    CITIBANK: 'Ситибанк',
    RUSSIANSTANDARD: 'Русский Стандарт',
    OTKRITIE: 'Открытие',
  };
  
  return bankNames[bankCode] || bankCode;
};

// Format card number with masking
export const formatCardNumber = (cardNumber: string): string => {
  if (!cardNumber) return "****";
  // For phone numbers (shorter than 12 digits), don't mask
  if (cardNumber.length <= 12) {
    return cardNumber;
  }
  // For card numbers, mask middle digits
  return cardNumber.replace(/(\d{4})(\d{2})(\d+)(\d{4})/, "$1 $2** **** $4");
};