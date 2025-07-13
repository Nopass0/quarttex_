import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";

export default (app: Elysia) =>
  app
    /* ─────────── GET /admin/kkk-settings ─────────── */
    .get(
      "",
      async () => {
        // Get KKK setting from SystemConfig
        const kkkSetting = await db.systemConfig.findUnique({
          where: { key: "kkk_percent" }
        });

        return {
          kkkPercent: kkkSetting ? parseFloat(kkkSetting.value) : 0
        };
      },
      {
        tags: ["admin"],
        detail: { summary: "Получить настройку ККК" },
        response: {
          200: t.Object({
            kkkPercent: t.Number()
          }),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ─────────── PUT /admin/kkk-settings ─────────── */
    .put(
      "",
      async ({ body }) => {
        const { kkkPercent } = body;
        
        // Upsert KKK setting in SystemConfig
        await db.systemConfig.upsert({
          where: { key: "kkk_percent" },
          update: { value: kkkPercent.toString() },
          create: { 
            key: "kkk_percent",
            value: kkkPercent.toString()
          }
        });

        return {
          success: true,
          kkkPercent
        };
      },
      {
        tags: ["admin"],
        detail: { summary: "Обновить настройку ККК" },
        body: t.Object({
          kkkPercent: t.Number({
            description: "Процент ККК",
            minimum: 0,
            maximum: 100
          })
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            kkkPercent: t.Number()
          }),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    );