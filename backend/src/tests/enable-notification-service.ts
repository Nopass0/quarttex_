import { db } from "@/db";

async function enableNotificationService() {
  console.log("=== Enabling NotificationAutoProcessorService ===\n");

  const serviceConfig = await db.serviceConfig.upsert({
    where: { serviceKey: "notification_auto_processor" },
    create: {
      serviceKey: "notification_auto_processor",
      isEnabled: true,
      config: {
        enabled: true,
        pollIntervalSec: 5, // Проверять каждые 5 секунд для теста
        batchSize: 10,
        amountTolerance: 1,
        minTimeDiffMs: -300000, // 5 минут назад
        maxTimeDiffMs: 300000, // 5 минут вперед
        enableDeviceWatchdog: false,
        deviceOfflineThresholdSec: 300,
        watchdogIntervalSec: 60,
        callbackEnabled: true,
        callbackTimeout: 5000,
        callbackRetries: 3,
        callbackRetryDelay: 1000,
        callbackConcurrency: 5
      }
    },
    update: {
      isEnabled: true,
      config: {
        enabled: true,
        pollIntervalSec: 5,
        batchSize: 10,
        amountTolerance: 1,
        minTimeDiffMs: -300000,
        maxTimeDiffMs: 300000,
        enableDeviceWatchdog: false,
        deviceOfflineThresholdSec: 300,
        watchdogIntervalSec: 60,
        callbackEnabled: true,
        callbackTimeout: 5000,
        callbackRetries: 3,
        callbackRetryDelay: 1000,
        callbackConcurrency: 5
      }
    }
  });

  console.log("✅ Service configuration updated:");
  console.log(`- Service key: ${serviceConfig.serviceKey}`);
  console.log(`- Enabled: ${serviceConfig.isEnabled}`);
  console.log(`- Poll interval: ${(serviceConfig.config as any).pollIntervalSec}s`);
  
  // Проверяем, запущен ли сервис
  const backgroundService = await db.backgroundService.findUnique({
    where: { serviceName: "Notification Auto-Processor Service" }
  });

  if (backgroundService) {
    console.log("\n📊 Service status:");
    console.log(`- Running: ${backgroundService.isRunning}`);
    console.log(`- Last run: ${backgroundService.lastRunAt}`);
    console.log(`- Next run: ${backgroundService.nextRunAt}`);
    
    if (backgroundService.publicFields) {
      const fields = backgroundService.publicFields as any;
      console.log("\n📈 Service stats:");
      console.log(`- Total processed: ${fields.stats?.totalProcessed || 0}`);
      console.log(`- Successful matches: ${fields.stats?.successfulMatches || 0}`);
      console.log(`- Failed matches: ${fields.stats?.failedMatches || 0}`);
    }
  } else {
    console.log("\n⚠️ Background service record not found");
    console.log("The service might not be running. Start the backend to activate it.");
  }
}

enableNotificationService()
  .then(() => {
    console.log("\n✅ Service enabled successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });