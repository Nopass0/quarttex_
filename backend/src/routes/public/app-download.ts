import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";
import { join } from "node:path";

export default (app: Elysia) =>
  app
    /* ───────────────── Download current APK ───────────────── */
    .get(
      "/download-apk",
      async ({ error, set }) => {
        // Get primary version
        const primaryVersion = await db.appVersion.findFirst({
          where: { isPrimary: true },
        });
        
        if (!primaryVersion) {
          return error(404, { error: "Приложение не найдено" });
        }
        
        // Redirect to file URL
        set.redirect = primaryVersion.fileUrl;
        set.status = 302;
      },
      {
        tags: ["public"],
        detail: { summary: "Скачать текущую версию приложения" },
        response: {
          302: t.Void(),
          404: ErrorSchema,
        },
      },
    )
    
    /* ───────────────── Get current version info ───────────────── */
    .get(
      "/current-version",
      async ({ error }) => {
        const primaryVersion = await db.appVersion.findFirst({
          where: { isPrimary: true },
        });
        
        if (!primaryVersion) {
          return error(404, { error: "Приложение не найдено" });
        }
        
        return {
          version: primaryVersion.version,
          description: primaryVersion.description,
          fileSize: primaryVersion.fileSize,
          uploadedAt: primaryVersion.uploadedAt.toISOString(),
        };
      },
      {
        tags: ["public"],
        detail: { summary: "Получить информацию о текущей версии" },
        response: {
          200: t.Object({
            version: t.String(),
            description: t.Nullable(t.String()),
            fileSize: t.Number(),
            uploadedAt: t.String(),
          }),
          404: ErrorSchema,
        },
      },
    );