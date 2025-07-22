import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { jwt } from "@elysiajs/jwt";
import { cors } from "@elysiajs/cors";
import { ip } from "elysia-ip";
import { JWTHandler } from "@/utils/types";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

import { loggerMiddleware } from "@/middleware/logger";
import { adminGuard } from "@/middleware/adminGuard";
import userRoutes from "@/routes/user";
import infoRoutes from "@/routes/info";
import adminRoutes from "@/routes/admin";
import merchantRoutes from "@/routes/merchant";
import traderRoutes from "@/routes/trader";
import deviceRoutes from "@/routes/trader/device";
import { deviceHealthRoutes } from "@/routes/device-health";
import { deviceLongPollRoutes } from "@/routes/device-long-poll";
import agentRoutes from "@/routes/agent";
import appDownloadRoutes from "@/routes/public/app-download";
import appStaticRoutes from "@/routes/public/app-static";
import appPageRoutes from "@/routes/public/app-page";
import supportRoutes from "@/routes/support";
import payoutWebSocketRoutes from "@/routes/websocket/payouts";
import { disputeWebSocketRoutes } from "@/routes/websocket/disputes";
import { dealDisputeWebSocketRoutes } from "@/routes/websocket/deal-disputes";
import { devicePingRoutes } from "@/routes/websocket/device-ping";
import { deviceStatusRoutes } from "@/routes/websocket/device-status";
import wellbitRoutes from "@/routes/wellbit";

import { Glob } from "bun";
import { pathToFileURL } from "node:url";
import { BaseService } from "@/services/BaseService";
import { serviceRegistry } from "@/services/ServiceRegistry";
import { join } from "node:path";
import { MASTER_KEY, ADMIN_KEY, parseAdminIPs } from "@/utils/constants";
import { merchantGuard } from "./middleware/merchantGuard";
import { db } from "@/db";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// ────────────────────────────────────────────────────────────────
// Admin keys configuration
// ────────────────────────────────────────────────────────────────
if (Bun.env.SUPER_ADMIN_KEY) {
  console.info(`\u2728 Using permanent super admin key from environment`);
  console.info(`📋 Super Admin Key: ${MASTER_KEY}`);
} else {
  console.info(`\u2728 Dynamic admin key for this session: ${ADMIN_KEY}`);
}

// Allowed IPs for admin – extend via env/config
const baseAdminIPs = [
  "127.0.0.1",
  "::1", // чистый IPv6-loopback
  "::ffff:127.0.0.1", // IPv4-через IPv6 (так Bun часто отдаёт)
  "95.163.152.102",
  "77.91.84.94",
];

// Add additional IPs from environment variable ADMIN_IPS (comma-separated)
const additionalAdminIPs = parseAdminIPs(Bun.env.ADMIN_IPS);
const ADMIN_IP_WHITELIST = [...baseAdminIPs, ...additionalAdminIPs];

if (additionalAdminIPs.length > 0) {
  console.info(`\u2713 Added ${additionalAdminIPs.length} admin IPs from environment: ${additionalAdminIPs.join(', ')}`);
}

// ── Auto-add server IP to whitelist ───────────────────────────
(async () => {
  try {
    // Try to get server's public IP
    const { stdout } = await execAsync('curl -s https://api.ipify.org');
    const serverIp = stdout.trim();
    
    if (serverIp && /^(\d{1,3}\.){3}\d{1,3}$/.test(serverIp)) {
      // Check if already in database
      const existing = await db.adminIpWhitelist.findUnique({
        where: { ip: serverIp }
      });
      
      if (!existing) {
        await db.adminIpWhitelist.create({
          data: {
            ip: serverIp,
            description: "Server IP (auto-detected)"
          }
        });
        console.info(`✓ Added server IP to admin whitelist: ${serverIp}`);
      } else {
        console.info(`✓ Server IP already in admin whitelist: ${serverIp}`);
      }
    }
  } catch (error) {
    console.warn('⚠ Could not auto-detect server IP:', error);
  }
})();

// ── Auto-discover & register services in /services ────────────

const scanRoot = join(import.meta.dir, "services"); // src/services абс. путь
const glob = new Glob("*.ts");
const serviceApps: Elysia[] = [];

console.info("🔍 Scanning for services...");

// 2) просим Glob отдать абсолютные пути
for await (const file of glob.scan({ cwd: scanRoot, absolute: true })) {
  if (file.endsWith("BaseService.ts") || file.endsWith("ServiceRegistry.ts")) continue;

  // 3) абсолютная строка → file:// URL → динамический import()
  const mod = await import(pathToFileURL(file).href);

  const Service = mod.default ?? Object.values(mod)[0];
  if (
    typeof Service === "function" &&
    Service.prototype instanceof BaseService
  ) {
    const instance = new Service();
    serviceRegistry.register(instance);
    
    // Register service endpoints if any
    const serviceApp = instance.getApp();
    if (serviceApp) {
      serviceApps.push(serviceApp);
      console.info(`📡 Registered ${instance.getEndpoints().length} endpoints for ${Service.name}`);
    }
    
    // Check if service should be auto-started based on database configuration
    try {
      // First check if service exists in database
      const dbService = await db.service.findUnique({
        where: { name: Service.name }
      });
      
      // Only auto-start if:
      // 1. Service exists in DB and is enabled
      // 2. OR service doesn't exist in DB but has autoStart=true (for new services)
      const shouldAutoStart = dbService 
        ? dbService.enabled 
        : (instance as any).autoStart;
      
      if (shouldAutoStart) {
        await serviceRegistry.startService(Service.name);
        console.info(`✅ Service ${Service.name} registered and auto-started`);
      } else {
        console.info(`📝 Service ${Service.name} registered (auto-start disabled)`);
      }
    } catch (error) {
      console.error(`❌ Failed to check/start service ${Service.name}:`, error);
    }
  }
}

// Create root app for health endpoint
const rootApp = new Elysia()
  .get("/health", () => ({ status: "healthy", timestamp: new Date().toISOString() }));

// Main application instance
const app = new Elysia({ prefix: "/api" })
  .derive(() => ({
    serviceRegistry,
  }))
  .use(ip())
  // Custom static file serving for uploads
  .get("/uploads/*", async ({ params, set }) => {
    const filepath = params["*"];
    const fullPath = join(process.cwd(), "uploads", filepath);
    
    if (!existsSync(fullPath)) {
      set.status = 404;
      return "File not found";
    }
    
    try {
      const file = await readFile(fullPath);
      
      // Set appropriate content type based on extension
      const ext = fullPath.split('.').pop()?.toLowerCase();
      if (ext === 'jpg' || ext === 'jpeg') set.headers['content-type'] = 'image/jpeg';
      else if (ext === 'png') set.headers['content-type'] = 'image/png';
      else if (ext === 'pdf') set.headers['content-type'] = 'application/pdf';
      else if (ext === 'zip') set.headers['content-type'] = 'application/zip';
      else set.headers['content-type'] = 'application/octet-stream';
      
      return file;
    } catch (error) {
      set.status = 500;
      return "Error reading file";
    }
  })
  .use(cors({
    origin: true, // Разрешаем все origins в dev режиме
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-trader-token", "x-admin-key", "x-device-token", "x-agent-token", "x-merchant-api-key", "x-api-key", "x-api-token"],
    exposedHeaders: ["x-trader-token", "x-admin-key", "x-device-token", "x-agent-token", "x-merchant-api-key", "x-api-key", "x-api-token"],
    credentials: true,
    preflight: true,
    maxAge: 3600
  }))
  
  // Register all service endpoints
  .onBeforeHandle(({ request }) => {
    // Add service endpoint middleware if needed
  })
  .use(
    swagger({
      path: "/docs",
      documentation: {
        info: {
          title: "API P2P Платежей",
          version: "1.0.0",
          description: "API для p2p платежей Voice",
        },
        tags: [
          {
            name: "user",
            description: "Аутентификация и профиль пользователя",
          },
          {
            name: "info",
            description: "Информация о состоянии сервиса и соединении",
          },
          {
            name: "admin",
            description: "Административные эндпоинты (защищенные IP и ключом)",
          },
          {
            name: "merchant",
            description: "Эндпоинты для мерчантов (защищенные API-ключом)",
          },
          {
            name: "trader",
            description: "Эндпоинты для трейдеров (защищенные токеном сессии)",
          },
          {
            name: "device",
            description: "Эндпоинты для устройств (защищенные токеном устройства)",
          },
          {
            name: "agent",
            description: "Эндпоинты для агентов (защищенные токеном агента)",
          },
        ],
      },
    }),
  )
  .use(
    jwt({
      name: "jwt",
      secret: Bun.env.JWT_SECRET!,
      exp: "24h",
    }),
  )
  .use(loggerMiddleware)
  // Health check endpoint
  .get("/health", () => ({ status: "healthy", timestamp: new Date().toISOString() }))
  .get("/api/health", () => ({ status: "healthy", timestamp: new Date().toISOString() }))
  .get("/wellbit/openapi.yaml", async ({ set }) => {
    set.headers["content-type"] = "application/yaml";
    const path = join(process.cwd(), "../docs/openapi-v1.6.yaml");
    return await readFile(path);
  })
  // ── Feature groups ────────────────────────────────────────────
  .group("/user", (app) => app.use(userRoutes))
  .group("/info", (app) => app.use(infoRoutes))
  .group(
    "/admin",
    (g) => g.use(adminGuard(MASTER_KEY, ADMIN_IP_WHITELIST)).use(adminRoutes),
  )
  .group("/merchant", (app) => app.use(merchantRoutes))
  .group("/device", (app) => app.use(deviceRoutes))
  .group("/trader", (app) => app.use(traderRoutes))
  .group("/wellbit", (app) => app.use(wellbitRoutes))
  .group("/app", (app) => app.use(appDownloadRoutes).use(appStaticRoutes).use(appPageRoutes))
  .group("/support", (app) => app.use(supportRoutes))
  .use(agentRoutes)
  .use(deviceHealthRoutes)
  .use(deviceLongPollRoutes)
  .use(payoutWebSocketRoutes)
  .use(disputeWebSocketRoutes)
  .use(dealDisputeWebSocketRoutes)
  .use(devicePingRoutes)
  .use(deviceStatusRoutes);

// Register all service endpoints
for (const serviceApp of serviceApps) {
  app.use(serviceApp);
}

// Merge root app with main app
rootApp.use(app);

rootApp.listen(Bun.env.PORT ?? 3000);

console.log(`🚀  Server listening on http://localhost:${rootApp.server?.port}`);
