import Elysia from "elysia";

// Complete list of all supported banks
const ALL_BANKS = [
  "Сбербанк",
  "Райффайзен",
  "Газпромбанк",
  "Почта Банк",
  "ВТБ",
  "Россельхозбанк",
  "Альфа-банк",
  "Уралсиб",
  "Локо-Банк",
  "Ак Барс",
  "МКБ",
  "Банк Санкт-Петербург",
  "МТС Банк",
  "Промсвязьбанк",
  "Озон Банк",
  "Открытие",
  "Ренессанс",
  "ОТП Банк",
  "Авангард",
  "Владбизнесбанк",
  "Таврический",
  "Фора-Банк",
  "БКС Банк",
  "Хоум Кредит",
  "ББР Банк",
  "Кредит Европа Банк",
  "РНКБ",
  "УБРиР",
  "Генбанк",
  "Синара",
  "Абсолют Банк",
  "МТС Деньги",
  "Свой Банк",
  "ТрансКапиталБанк",
  "Долинск",
  "Т-Банк",
  "Совкомбанк",
  "Росбанк",
  "ЮниКредит",
  "Ситибанк",
  "Русский Стандарт"
];

export const traderBanksListApi = new Elysia({ prefix: "/banks-list" })
  // Get all available banks - returns the same list for both SBP and card
  .get("/", async ({ query, set }) => {
    try {
      // User explicitly stated: "В обоих этих случаях, банков SBP или по картам, там одинаковый список банков всегда"
      // So we return the same complete list regardless of type
      return {
        success: true,
        banks: ALL_BANKS.sort((a, b) => a.localeCompare(b, "ru")),
      };
    } catch (error: any) {
      set.status = 500;
      return { error: error.message };
    }
  });