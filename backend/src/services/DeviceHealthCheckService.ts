import { BaseService } from "./BaseService";
import { db } from "../db";

export class DeviceHealthCheckService extends BaseService {
  displayName = "Проверка активности устройств";
  description =
    "Отключает устройства, которые не отправляли health check больше заданного времени";
  interval = 10; // Проверяем каждые 10мс
  enabledByDefault = true;
  tags = ["devices", "monitoring"];

  private healthCheckTimeout: number = 0.03; // 30 миллисекунд

  protected getPublicFields() {
    return {
      healthCheckTimeout: this.healthCheckTimeout,
      checkedDevices: this.getSetting("checkedDevices", 0),
      deactivatedDevices: this.getSetting("deactivatedDevices", 0),
      lastCheckTime: this.getSetting("lastCheckTime", null),
    };
  }

  async onStart() {
    // Получаем настройку таймаута из базы данных или используем значение по умолчанию
    const savedTimeout = this.getSetting("healthCheckTimeout", 0.03);
    this.healthCheckTimeout = savedTimeout;

    await this.logInfo("Сервис проверки активности устройств запущен", {
      healthCheckTimeout: this.healthCheckTimeout,
    });
  }

  async tick() {
    try {
      const now = new Date();
      const timeoutDate = new Date(
        now.getTime() - this.healthCheckTimeout * 1000,
      );

      // Находим все устройства, которые считаются активными, но не отправляли health check
      const inactiveDevices = await db.device.findMany({
        where: {
          isOnline: true,
          OR: [
            { lastActiveAt: { lt: timeoutDate } },
            { lastActiveAt: null, updatedAt: { lt: timeoutDate } }
          ],
        },
        include: {
          bankDetails: {
            where: {
              isArchived: false,
            },
          },
        },
      });

      let deactivatedCount = 0;

      for (const device of inactiveDevices) {
        try {
          // Отключаем устройство
          await db.device.update({
            where: { id: device.id },
            data: {
              isOnline: false,
              isWorking: false,
            },
          });

          // Архивируем все активные банковские карты устройства
          if (device.bankDetails && device.bankDetails.length > 0) {
            const bankDetailIds = device.bankDetails.map((bd) => bd.id);
            
            await db.bankDetail.updateMany({
              where: {
                id: { in: bankDetailIds },
                isArchived: false,
              },
              data: {
                isArchived: true,
              },
            });

            await this.logInfo("Банковские карты устройства архивированы", {
              deviceId: device.id,
              deviceName: device.name,
              archivedCards: bankDetailIds.length,
              bankCardIds: bankDetailIds,
            });
          }

          // Создаем уведомление для устройства
          await db.notification.create({
            data: {
              type: "DEVICE_OFFLINE",
              title: "Устройство отключено",
              message: `Устройство ${device.name} было отключено из-за отсутствия активности`,
              deviceId: device.id,
              metadata: {
                lastActiveAt: device.lastActiveAt?.toISOString() || device.updatedAt?.toISOString(),
                timeout: this.healthCheckTimeout,
                archivedBankCards: device.bankDetails?.length || 0,
              },
            },
          });

          deactivatedCount++;

          await this.logInfo("Устройство отключено из-за неактивности", {
            deviceId: device.id,
            deviceName: device.name,
            lastActiveAt: device.lastActiveAt?.toISOString() || device.updatedAt?.toISOString(),
            timeoutSeconds: this.healthCheckTimeout,
            archivedBankCards: device.bankDetails?.length || 0,
          });
        } catch (error) {
          await this.logError("Ошибка при отключении устройства", {
            deviceId: device.id,
            error: error.message,
          });
        }
      }

      // Обновляем статистику
      const checkedDevices =
        this.getSetting("checkedDevices", 0) + inactiveDevices.length;
      const totalDeactivated =
        this.getSetting("deactivatedDevices", 0) + deactivatedCount;

      await this.setSetting("checkedDevices", checkedDevices);
      await this.setSetting("deactivatedDevices", totalDeactivated);
      await this.setSetting("lastCheckTime", now.toISOString());

      if (deactivatedCount > 0) {
        await this.logInfo("Проверка завершена", {
          checkedDevices: inactiveDevices.length,
          deactivatedDevices: deactivatedCount,
          totalDeactivated,
        });
      }

      await this.updatePublicFieldsInDb(this.getPublicFields());
    } catch (error) {
      await this.logError("Ошибка при проверке устройств", {
        error: error.message,
      });
    }
  }

  async onStop() {
    await this.logInfo("Сервис проверки активности устройств остановлен");
  }

  // Метод для обновления таймаута
  async setHealthCheckTimeout(seconds: number) {
    if (seconds < 5) {
      throw new Error("Таймаут не может быть меньше 5 секунд");
    }

    this.healthCheckTimeout = seconds;
    await this.setSetting("healthCheckTimeout", seconds);

    await this.logInfo("Таймаут health check обновлен", {
      newTimeout: seconds,
    });

    await this.updatePublicFieldsInDb(this.getPublicFields());
  }
}

export default DeviceHealthCheckService;
