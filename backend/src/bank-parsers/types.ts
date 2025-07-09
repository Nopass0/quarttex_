export interface ParsedTransaction {
  amount: number;
  currency: string;
  senderName?: string;
  balance?: number;
  timestamp?: Date;
}

export interface IBankParser {
  bankName: string;
  packageNames: string[];
  detect(message: string): boolean;
  parse(message: string): ParsedTransaction | null;
}