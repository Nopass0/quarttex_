import { BaseService } from './BaseService';
import { db } from '../db';

export default class DisputeExpirationService extends BaseService {
  protected interval = 60_000; // Check every minute
  protected displayName = 'Dispute Expiration Service';
  protected description = 'Automatically closes expired disputes in favor of merchants';
  protected tags = ['disputes', 'automation'];

  constructor() {
    super({
      displayName: 'Dispute Expiration Service',
      description: 'Monitors and automatically resolves expired disputes based on timeout settings',
      interval: 60_000, // 1 minute
      enabled: true,
      autoStart: true,
      tags: ['disputes', 'automation'],
    });
  }

  protected async tick(): Promise<void> {
    try {
      await this.logDebug('Checking for expired disputes...');

      // Get dispute timeout settings from system config
      const systemConfig = await db.systemConfig.findMany({
        where: {
          key: {
            in: [
              'disputeDayShiftStartHour',
              'disputeDayShiftEndHour',
              'disputeDayShiftTimeoutMinutes',
              'disputeNightShiftTimeoutMinutes'
            ]
          }
        }
      });

      const configMap = Object.fromEntries(
        systemConfig.map(c => [c.key, c.value])
      );

      const dayShiftStartHour = parseInt(configMap.disputeDayShiftStartHour || '9');
      const dayShiftEndHour = parseInt(configMap.disputeDayShiftEndHour || '21');
      const dayShiftTimeoutMinutes = parseInt(configMap.disputeDayShiftTimeoutMinutes || '30');
      const nightShiftTimeoutMinutes = parseInt(configMap.disputeNightShiftTimeoutMinutes || '60');

      // Process Deal Disputes
      const expiredDealDisputes = await this.findExpiredDealDisputes(
        dayShiftStartHour,
        dayShiftEndHour,
        dayShiftTimeoutMinutes,
        nightShiftTimeoutMinutes
      );

      if (expiredDealDisputes.length > 0) {
        await this.logInfo(`Found ${expiredDealDisputes.length} expired deal disputes`);
        
        for (const dispute of expiredDealDisputes) {
          await this.resolveDealDispute(dispute);
        }
      }

      // Process Withdrawal Disputes (Payout disputes)
      const expiredWithdrawalDisputes = await this.findExpiredWithdrawalDisputes(
        dayShiftStartHour,
        dayShiftEndHour,
        dayShiftTimeoutMinutes,
        nightShiftTimeoutMinutes
      );

      if (expiredWithdrawalDisputes.length > 0) {
        await this.logInfo(`Found ${expiredWithdrawalDisputes.length} expired withdrawal disputes`);
        
        for (const dispute of expiredWithdrawalDisputes) {
          await this.resolveWithdrawalDispute(dispute);
        }
      }

      // Update public fields with statistics
      await this.updatePublicFieldsInDb({
        lastCheck: new Date().toISOString(),
        dealDisputesProcessed: expiredDealDisputes.length,
        withdrawalDisputesProcessed: expiredWithdrawalDisputes.length,
        totalProcessed: expiredDealDisputes.length + expiredWithdrawalDisputes.length
      });

    } catch (error) {
      await this.logError('Error in dispute expiration check', { error: error.message });
      throw error;
    }
  }

  private async findExpiredDealDisputes(
    dayShiftStartHour: number,
    dayShiftEndHour: number,
    dayShiftTimeoutMinutes: number,
    nightShiftTimeoutMinutes: number
  ) {
    // Get all open/in_progress disputes
    const activeDisputes = await db.dealDispute.findMany({
      where: {
        status: {
          in: ['OPEN', 'IN_PROGRESS']
        }
      },
      include: {
        deal: true,
        merchant: true,
        trader: true
      }
    });

    const now = new Date();
    const expiredDisputes = [];

    for (const dispute of activeDisputes) {
      const createdAt = new Date(dispute.createdAt);
      const createdHour = createdAt.getHours();
      
      // Determine timeout based on shift
      const isDayShift = createdHour >= dayShiftStartHour && createdHour < dayShiftEndHour;
      const timeoutMinutes = isDayShift ? dayShiftTimeoutMinutes : nightShiftTimeoutMinutes;
      
      // Calculate deadline
      const deadline = new Date(createdAt.getTime() + timeoutMinutes * 60 * 1000);
      
      if (now > deadline) {
        expiredDisputes.push(dispute);
      }
    }

    return expiredDisputes;
  }

  private async findExpiredWithdrawalDisputes(
    dayShiftStartHour: number,
    dayShiftEndHour: number,
    dayShiftTimeoutMinutes: number,
    nightShiftTimeoutMinutes: number
  ) {
    // Get all open/in_progress withdrawal disputes
    const activeDisputes = await db.withdrawalDispute.findMany({
      where: {
        status: {
          in: ['OPEN', 'IN_PROGRESS']
        }
      },
      include: {
        payout: true,
        merchant: true,
        trader: true
      }
    });

    const now = new Date();
    const expiredDisputes = [];

    for (const dispute of activeDisputes) {
      const createdAt = new Date(dispute.createdAt);
      const createdHour = createdAt.getHours();
      
      // Determine timeout based on shift
      const isDayShift = createdHour >= dayShiftStartHour && createdHour < dayShiftEndHour;
      const timeoutMinutes = isDayShift ? dayShiftTimeoutMinutes : nightShiftTimeoutMinutes;
      
      // Calculate deadline
      const deadline = new Date(createdAt.getTime() + timeoutMinutes * 60 * 1000);
      
      if (now > deadline) {
        expiredDisputes.push(dispute);
      }
    }

    return expiredDisputes;
  }

  private async resolveDealDispute(dispute: any) {
    try {
      await this.logInfo(`Resolving expired deal dispute ${dispute.id}`, {
        dealId: dispute.dealId,
        traderId: dispute.traderId,
        merchantId: dispute.merchantId
      });

      // Start transaction
      await db.$transaction(async (tx) => {
        // Update dispute status to resolved in merchant's favor
        await tx.dealDispute.update({
          where: { id: dispute.id },
          data: {
            status: 'RESOLVED_SUCCESS', // Success means merchant wins
            resolvedAt: new Date(),
            resolution: 'Автоматически закрыт в пользу мерчанта из-за истечения времени ответа'
          }
        });

        // Add system message
        await tx.dealDisputeMessage.create({
          data: {
            disputeId: dispute.id,
            senderId: 'system',
            senderType: 'ADMIN',
            message: 'Спор автоматически закрыт в пользу мерчанта из-за истечения времени ответа трейдера.'
          }
        });

        // Update transaction status if needed
        if (dispute.deal.status === 'DISPUTED') {
          await tx.transaction.update({
            where: { id: dispute.dealId },
            data: {
              status: 'COMPLETED', // Transaction is considered completed for merchant
              completedAt: new Date()
            }
          });
        }
      });

      await this.logInfo(`Successfully resolved deal dispute ${dispute.id} in merchant's favor`);
    } catch (error) {
      await this.logError(`Failed to resolve deal dispute ${dispute.id}`, { error: error.message });
    }
  }

  private async resolveWithdrawalDispute(dispute: any) {
    try {
      await this.logInfo(`Resolving expired withdrawal dispute ${dispute.id}`, {
        payoutId: dispute.payoutId,
        traderId: dispute.traderId,
        merchantId: dispute.merchantId
      });

      // Start transaction
      await db.$transaction(async (tx) => {
        // Update dispute status to resolved in merchant's favor
        await tx.withdrawalDispute.update({
          where: { id: dispute.id },
          data: {
            status: 'RESOLVED_SUCCESS', // Success means merchant wins
            resolvedAt: new Date(),
            resolution: 'Автоматически закрыт в пользу мерчанта из-за истечения времени ответа'
          }
        });

        // Add system message
        await tx.withdrawalDisputeMessage.create({
          data: {
            disputeId: dispute.id,
            senderId: 'system',
            senderType: 'ADMIN',
            message: 'Спор автоматически закрыт в пользу мерчанта из-за истечения времени ответа трейдера.'
          }
        });

        // Update payout status if needed
        if (dispute.payout.status === 'DISPUTED') {
          await tx.payout.update({
            where: { id: dispute.payoutId },
            data: {
              status: 'REJECTED', // Payout is rejected
              rejectedAt: new Date(),
              rejectionReason: 'Спор закрыт в пользу мерчанта из-за истечения времени ответа'
            }
          });
        }
      });

      await this.logInfo(`Successfully resolved withdrawal dispute ${dispute.id} in merchant's favor`);
    } catch (error) {
      await this.logError(`Failed to resolve withdrawal dispute ${dispute.id}`, { error: error.message });
    }
  }

  protected getPublicFields(): Record<string, any> {
    return {
      lastCheck: this.getSetting('lastCheck', 'Never'),
      dealDisputesProcessed: this.getSetting('dealDisputesProcessed', 0),
      withdrawalDisputesProcessed: this.getSetting('withdrawalDisputesProcessed', 0),
      totalProcessed: this.getSetting('totalProcessed', 0)
    };
  }
}