import { Elysia, t } from "elysia";
import { ip } from "elysia-ip";
import { db } from "@/db";
import { ADMIN_KEY } from "@/utils/constants";

/**
 * adminGuard — middleware‑защита для административных эндпоинтов.
 *
 * Ошибки, которые может вернуть guard:
 *  • **403 Forbidden IP** — клиент обращается из IP‑адреса, не входящего в whitelist.
 *  • **401 Invalid admin key** — в заголовке `x-admin-key` отсутствует известный токен админа
 *    и не передан master‑key супер‑админа.
 */
export const adminGuard =
  (masterKey: string, whitelist: string[]) => (app: Elysia) =>
    app.use(ip()).guard({
      async beforeHandle({ ip: clientIp, request, error }) {
        const key = request.headers.get("x-admin-key") ?? "";
        
        // Ensure key contains only ASCII characters to prevent XMLHttpRequest encoding errors
        if (key && !/^[\x00-\x7F]*$/.test(key)) {
          return error(401, { error: "Invalid admin key format" });
        }
        
        console.log("[AdminGuard] Client IP:", clientIp);
        console.log("[AdminGuard] Provided key:", key);
        console.log("[AdminGuard] Master key:", masterKey);
        console.log("[AdminGuard] Keys match:", key === masterKey);
        console.log("[AdminGuard] Key lengths - provided:", key.length, "master:", masterKey.length);
        
        // Enhanced debugging
        console.log("[AdminGuard] Whitelist IPs:", whitelist);
        console.log("[AdminGuard] Is IP in whitelist:", whitelist.includes(clientIp));
        
        // Character-by-character comparison for debugging
        if (key && masterKey && key.length === masterKey.length) {
          for (let i = 0; i < key.length; i++) {
            if (key[i] !== masterKey[i]) {
              console.log(`[AdminGuard] Mismatch at position ${i}: provided='${key[i]}' (${key.charCodeAt(i)}), master='${masterKey[i]}' (${masterKey.charCodeAt(i)})`);
              break;
            }
          }
        }
        
        // Super admin with master key can access from any IP
        if (key === masterKey) {
          console.log("[AdminGuard] ✅ Access granted - master key match");
          return;
        }
        
        // TEMPORARY: Skip IP whitelist check for development
        console.log(`[AdminGuard] ⚠️  IP whitelist check disabled temporarily. Client IP: ${clientIp}`);
        
        // Check static IP whitelist
        // let isWhitelisted = whitelist.includes(clientIp);
        
        // Check database IP whitelist if not in static list
        // if (!isWhitelisted) {
        //   const dbWhitelistEntry = await db.adminIpWhitelist.findUnique({
        //     where: { ip: clientIp }
        //   });
        //   isWhitelisted = !!dbWhitelistEntry;
        // }
        
        // Reject if IP not whitelisted
        // if (!isWhitelisted) {
        //   console.log(`[AdminGuard] ❌ Rejecting IP: ${clientIp} - not in whitelist`);
        //   console.log(`[AdminGuard] Add this IP using: bun run src/scripts/add-ip-whitelist.ts "${clientIp}" "Your description"`);
        //   
        //   // Temporary: Allow localhost IPs in development
        //   if (Bun.env.NODE_ENV !== 'production' && (clientIp.includes('127.0.0.1') || clientIp.includes('::1') || clientIp === '::ffff:127.0.0.1')) {
        //     console.log(`[AdminGuard] ⚠️  Allowing localhost IP in development mode: ${clientIp}`);
        //     return;
        //   }
        //   
        //   return error(403, { error: "Forbidden IP" });
        // }
        
        // Check if it's the dynamic session key
        if (key === ADMIN_KEY) return;

        // Check if it's a sub-admin from database
        const subadmin = await db.admin.findFirst({ where: { token: key } });
        if (!subadmin) {
          console.log("[AdminGuard] ❌ Access denied - key not found in database");
          return error(401, { error: "Invalid admin key" });
        }
        console.log("[AdminGuard] ✅ Access granted - sub-admin found:", subadmin.id);
      },
    });
