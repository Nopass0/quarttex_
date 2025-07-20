import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";
import { join } from "node:path";
import { existsSync, readFileSync } from "fs";

export default (app: Elysia) =>
  app
    /* ───────────────── Download current APK ───────────────── */
    .get(
      "/download-apk",
      async ({ error, set }) => {
        // First check if we have a static APK file
        const apkPath = join(process.cwd(), "uploads", "apk", "chase-mobile.apk");
        
        if (existsSync(apkPath)) {
          // Redirect to static file
          set.redirect = "/api/app/download";
          set.status = 302;
          return;
        }
        
        // Fallback to database version
        const primaryVersion = await db.appVersion.findFirst({
          where: { isPrimary: true },
        });
        
        if (!primaryVersion) {
          // Check if we have a GitHub release
          const latestReleaseUrl = "https://api.github.com/repos/Nopass0/chase/releases/latest";
          try {
            const response = await fetch(latestReleaseUrl);
            if (response.ok) {
              const release = await response.json();
              const apkAsset = release.assets?.find((asset: any) => 
                asset.name.endsWith('.apk')
              );
              
              if (apkAsset) {
                // Redirect to GitHub release download
                set.redirect = apkAsset.browser_download_url;
                set.status = 302;
                return;
              }
            }
          } catch (e) {
            console.error("Failed to fetch GitHub release:", e);
          }
          
          // If no APK found anywhere, show placeholder page
          set.redirect = "/api/app/download";
          set.status = 302;
          return;
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
    )
    
    /* ───────────────── Mobile app version check ───────────────── */
    .get(
      "/version",
      async () => {
        const primaryVersion = await db.appVersion.findFirst({
          where: { isPrimary: true },
        });
        
        if (!primaryVersion) {
          // Return default version if no app is uploaded yet
          return {
            version: "1.0.0",
            versionCode: 1,
            downloadUrl: "/api/app/download",
            releaseNotes: "Initial release",
            forceUpdate: false
          };
        }
        
        // Extract version code from version string (e.g., "1.0.0" -> 100)
        const versionParts = primaryVersion.version.split('.');
        const versionCode = parseInt(versionParts[0]) * 10000 + 
                          parseInt(versionParts[1] || 0) * 100 + 
                          parseInt(versionParts[2] || 0);
        
        return {
          version: primaryVersion.version,
          versionCode: versionCode,
          downloadUrl: "/api/app/download-apk",
          releaseNotes: primaryVersion.description || "Update available",
          forceUpdate: false
        };
      },
      {
        tags: ["public"],
        detail: { summary: "Mobile app version check endpoint" },
        response: {
          200: t.Object({
            version: t.String(),
            versionCode: t.Number(),
            downloadUrl: t.String(),
            releaseNotes: t.String(),
            forceUpdate: t.Boolean(),
          }),
        },
      },
    );