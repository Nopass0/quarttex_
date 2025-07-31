import { describe, expect, test } from "bun:test";
import { NotificationMatcherService } from "../src/services/NotificationMatcherService";

describe("Notification matcher regex", () => {
  const service = new (NotificationMatcherService as any)();
  const matchers = (service as any).bankMatchers as any[];

  test("Tinkoff matches generic message", () => {
    const matcher = matchers.find(m => m.bankName === "TBANK");
    expect(matcher).toBeDefined();
    const msg = "Вам перевели 1 500 ₽";
    const match = matcher.regex.exec(msg);
    expect(match).toBeTruthy();
    expect(matcher.extractAmount(match)).toBe(1500);
  });

  test("Tinkoff matches 'Пополнение, счет RUB' message", () => {
    const msg = "Пополнение, счет RUB. 2 000 RUB. Ольга М. Доступно 5 100 RUB";
    const matcher = matchers.find(m => m.bankName === "TBANK" && m.regex.test(msg));
    expect(matcher).toBeDefined();
    const match = matcher!.regex.exec(msg)!;
    expect(matcher!.extractAmount(match)).toBe(2000);
  });

  test("Home Credit matches generic message", () => {
    const matcher = matchers.find(m => m.bankName === "HOMECREDIT");
    expect(matcher).toBeDefined();
    const msg = "Вам перевели 700 ₽";
    const match = matcher.regex.exec(msg);
    expect(match).toBeTruthy();
    expect(matcher.extractAmount(match)).toBe(700);
  });

  test("OTP Bank matches generic message", () => {
    const msg = "Вам перевели 700 ₽";
    const matcher = matchers.find(m => m.bankName === "OTPBANK" && m.regex.test(msg));
    expect(matcher).toBeDefined();
    const match = matcher!.regex.exec(msg)!;
    expect(matcher!.extractAmount(match)).toBe(700);
  });
});
