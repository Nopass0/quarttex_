import type { IBankParser, ParsedTransaction } from "./types";

export class SberbankParser implements IBankParser {
  bankName = "Сбербанк";
  packageNames = ["ru.sberbankmobile"];

  private patterns = [
    // "СЧЁТ2538 25.07 16:37 зачисление 5000р от Test Client Баланс: 125000.50р"
    /СЧЁТ\d+\s+\d{1,2}\.\d{1,2}\s+\d{1,2}:\d{2}\s+зачисление\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р(?:уб)?\.?\s+от\s+([А-Яа-яA-Za-z\s]+)\s+Баланс:\s*([\d\s]+(?:[.,]\d{1,2})?)\s*р/i,
    // "СБЕРБАНК. Перевод 15000р от ИВАН И. Баланс: 25000р"
    /СБЕРБАНК\.\s*(?:Перевод|Пополнение)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р(?:уб)?\.?\s+от\s+([А-ЯA-Z\s]+)\.\s*Баланс:\s*([\d\s]+(?:[.,]\d{1,2})?)\s*р/i,
    // "Сбербанк | Пополнение на 300 ₽, счет RUB. Рамазан Г. Доступно 5 838 ₽"
    /Сбербанк\s*\|\s*Пополнение\s+на\s+([\d\s]+(?:[.,]\d{1,2})?)\s*₽[^.]*\.\s*([А-Яа-яA-Za-z]+\s+[А-Яа-яA-Z]\.).*?Доступно\s+([\d\s]+(?:[.,]\d{1,2})?)\s*₽/i,
    // Simple format with зачисление
    /(?:Перевод|Пополнение|зачисление)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб).*?от\s+([А-Яа-яA-Za-z\s]+)/i,
    // SMS "VISA1234 25.07.24 12:34 Зачисление 5000р"
    /\b(?:VISA|MASTERCARD|МИР)?\d{0,4}\s+\d{1,2}\.\d{1,2}(?:\.\d{2,4})?\s+зачисление\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р/i,
    // "Вам перевели 1 000 ₽"
    /Вам\s+(?:перевели|поступил(?:о)?)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*(?:₽|р|руб)/i,
  ];

  detect(message: string): boolean {
    return this.patterns.some(pattern => pattern.test(message));
  }

  parse(message: string): ParsedTransaction | null {
    for (const pattern of this.patterns) {
      const match = message.match(pattern);
      if (match) {
        const amount = match[1];
        const senderName = match[2];
        const balance = match[3];

        return {
          amount: this.parseAmount(amount),
          currency: "RUB",
          senderName: senderName ? this.normalizeSenderName(senderName) : undefined,
          balance: balance ? this.parseAmount(balance) : undefined,
        };
      }
    }
    return null;
  }

  private parseAmount(amount: string): number {
    return parseFloat(amount.replace(/\s/g, "").replace(",", "."));
  }

  private normalizeSenderName(name: string): string {
    // Convert "ИВАН И." to "Иван И."
    const words = name.trim().split(/\s+/);
    return words.map((word, index) => {
      if (word.length === 1 || word.endsWith(".")) {
        return word; // Keep initials as is
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(" ");
  }
}