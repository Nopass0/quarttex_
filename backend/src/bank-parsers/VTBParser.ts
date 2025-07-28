import type { IBankParser, ParsedTransaction } from "./types";

export class VTBParser implements IBankParser {
  bankName = "ВТБ";
  packageNames = ["ru.vtb24.mobilebanking.android"];

  private patterns = [
    // "ВТБ Онлайн | Поступление 55р Счет*0347 от Михаил Р. Баланс 143р 18:33"
    /ВТБ(?:\s+Онлайн)?\s*\|\s*(?:Поступление|Перевод|Пополнение)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р(?:уб)?\.?\s+Счет[*\s]*\d+\s+от\s+([А-Яа-яA-Za-z]+\s+[А-Яа-яA-Z]\.).*?Баланс\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р/i,
    // "ВТБ: зачисление 10000р. Отправитель: ООО КОМПАНИЯ"
    /ВТБ:\s*(?:зачисление|перевод|пополнение)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р(?:уб)?\.?\s*Отправитель:\s*([А-Яа-яA-Za-z\s\-"'«»]+)/i,
    // SMS format "Поступление 1000р карта *1234"
    /Поступление\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р.*?карта/i,
  ];

  detect(message: string): boolean {
    return this.patterns.some(pattern => pattern.test(message));
  }

  parse(message: string): ParsedTransaction | null {
    for (const pattern of this.patterns) {
      const match = message.match(pattern);
      if (match) {
        const [, amount, senderName, balance] = match;
        
        return {
          amount: this.parseAmount(amount),
          currency: "RUB",
          senderName: senderName.trim(),
          balance: balance ? this.parseAmount(balance) : undefined,
        };
      }
    }
    return null;
  }

  private parseAmount(amount: string): number {
    return parseFloat(amount.replace(/\s/g, "").replace(",", "."));
  }
}