import type { IBankParser } from "./types";
import { TinkoffParser } from "./TinkoffParser";
import { SberbankParser } from "./SberbankParser";
import { VTBParser } from "./VTBParser";
import { AlfabankParser } from "./AlfabankParser";
import { GazprombankParser } from "./GazprombankParser";
import { OzonbankParser } from "./OzonbankParser";
import { GenericSmsParser } from "./GenericSmsParser";

export class BankRegexFactory {
  private parsers: Map<string, IBankParser> = new Map();
  private packageToBankMap: Map<string, string> = new Map();

  constructor() {
    this.registerDefaultParsers();
  }

  private registerDefaultParsers(): void {
    const parsers: IBankParser[] = [
      new TinkoffParser(),
      new SberbankParser(),
      new VTBParser(),
      new AlfabankParser(),
      new GazprombankParser(),
      new OzonbankParser(),
      new GenericSmsParser(),
    ];

    for (const parser of parsers) {
      this.parsers.set(parser.bankName, parser);
      
      // Map package names to bank names
      for (const packageName of parser.packageNames) {
        this.packageToBankMap.set(packageName, parser.bankName);
      }
    }
  }

  /**
   * Get parser by bank name
   */
  getParser(bankName: string): IBankParser | undefined {
    return this.parsers.get(bankName);
  }

  /**
   * Get parser by package name
   */
  getParserByPackage(packageName: string): IBankParser | undefined {
    const bankName = this.packageToBankMap.get(packageName);
    return bankName ? this.parsers.get(bankName) : undefined;
  }

  /**
   * Detect and parse message
   */
  parseMessage(message: string, packageName?: string): {
    parser: IBankParser;
    transaction: any;
  } | null {
    // If package name is provided, try specific parser first
    if (packageName) {
      const parser = this.getParserByPackage(packageName);
      if (parser && parser.detect(message)) {
        const transaction = parser.parse(message);
        if (transaction) {
          return { parser, transaction };
        }
      }
    }

    // Try all parsers
    for (const parser of this.parsers.values()) {
      if (parser.detect(message)) {
        const transaction = parser.parse(message);
        if (transaction) {
          return { parser, transaction };
        }
      }
    }

    return null;
  }

  /**
   * Get all registered bank names
   */
  getBankNames(): string[] {
    return Array.from(this.parsers.keys());
  }

  /**
   * Check if message is from a known bank
   */
  isBankMessage(message: string, packageName?: string): boolean {
    if (packageName && this.packageToBankMap.has(packageName)) {
      const parser = this.getParserByPackage(packageName);
      return parser ? parser.detect(message) : false;
    }

    return Array.from(this.parsers.values()).some(parser => parser.detect(message));
  }
}