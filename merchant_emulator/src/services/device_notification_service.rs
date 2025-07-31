use crate::device::{DeviceManager, DeviceApiClient, NotificationRequest};
use crate::models::{Merchant, Transaction};
use anyhow::Result;
use std::sync::Arc;
use tracing::{info, error};
use chrono::Utc;

pub struct DeviceNotificationService {
    device_manager: Arc<DeviceManager>,
    api_client: Arc<DeviceApiClient>,
}

impl DeviceNotificationService {
    pub fn new(device_manager: Arc<DeviceManager>, api_client: Arc<DeviceApiClient>) -> Self {
        Self {
            device_manager,
            api_client,
        }
    }

    pub async fn send_transaction_notification(
        &self,
        merchant: &Merchant,
        transaction: &Transaction,
    ) -> Result<()> {
        // Check if merchant has liquid transactions enabled
        if !merchant.is_liquid() {
            info!("Transaction is not liquid, skipping device notification");
            return Ok(());
        }

        // Get trader ID from transaction
        let trader_id = match &transaction.trader_id {
            Some(id) => id,
            None => {
                info!("Transaction has no trader ID, skipping device notification");
                return Ok(());
            }
        };

        // Get connected devices for trader
        let devices = self.device_manager.get_connected_devices_for_trader(trader_id);
        
        if devices.is_empty() {
            info!("No connected devices found for trader {}", trader_id);
            return Ok(());
        }

        // Get bank info from transaction requisites
        let (bank_name, card_last_digits) = if let Some(requisites) = &transaction.requisites {
            let bank = match requisites.bank_type.as_str() {
                "sber" | "sberbank" => "Сбербанк",
                "tinkoff" => "Тинькофф",
                "alfa" | "alfabank" => "Альфа-Банк",
                "vtb" => "ВТБ",
                "raiffeisen" => "Райффайзен",
                "otkritie" => "Открытие",
                _ => "Банк",
            };
            
            let last_digits = requisites.card.chars()
                .rev()
                .take(4)
                .collect::<String>()
                .chars()
                .rev()
                .collect::<String>();
                
            (bank.to_string(), last_digits)
        } else {
            ("Банк".to_string(), "****".to_string())
        };

        // Create notification
        let notification = NotificationRequest {
            package_name: format!("com.{}.app", bank_name.to_lowercase().replace(" ", "")),
            app_name: bank_name.clone(),
            title: format!("{} Online", bank_name),
            content: format!(
                "Пополнение +{:.2} ₽\nКарта *{}", 
                transaction.amount, 
                card_last_digits
            ),
            timestamp: Utc::now().timestamp_millis(),
            priority: 2,
            category: "transaction".to_string(),
        };

        // Send notification to all connected devices
        for device in devices {
            if let Some(token) = &device.token {
                info!(
                    "Sending notification to device {} for transaction {}", 
                    device.id, 
                    transaction.id
                );
                
                match self.api_client.send_notification(token, notification.clone()).await {
                    Ok(_) => {
                        info!("Notification sent successfully to device {}", device.id);
                    }
                    Err(e) => {
                        error!("Failed to send notification to device {}: {}", device.id, e);
                    }
                }
            }
        }

        Ok(())
    }

    pub async fn send_test_notification(
        &self,
        device_id: &str,
        bank_name: &str,
        amount: f64,
    ) -> Result<()> {
        let device = self.device_manager.get_device(device_id)
            .ok_or_else(|| anyhow::anyhow!("Device not found"))?;

        if !device.is_connected {
            return Err(anyhow::anyhow!("Device is not connected"));
        }

        let token = device.token
            .ok_or_else(|| anyhow::anyhow!("Device has no token"))?;

        let notification = NotificationRequest {
            package_name: format!("com.{}.app", bank_name.to_lowercase()),
            app_name: bank_name.to_string(),
            title: format!("{} Online", bank_name),
            content: format!("Пополнение +{:.2} ₽", amount),
            timestamp: Utc::now().timestamp_millis(),
            priority: 2,
            category: "transaction".to_string(),
        };

        self.api_client.send_notification(&token, notification).await?;
        
        Ok(())
    }
}