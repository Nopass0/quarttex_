use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{interval, Duration, sleep};
use crate::api::ApiClient;
use crate::device::Device;

pub struct DeviceManager {
    device: Arc<Mutex<Device>>,
    api_client: ApiClient,
}

impl DeviceManager {
    pub fn new(device: Arc<Mutex<Device>>, api_client: ApiClient) -> Self {
        Self { device, api_client }
    }

    pub async fn start_background_tasks(&self) {
        // Start all background tasks
        let ping_handle = self.start_ping_task();
        let health_check_handle = self.start_health_check_task();
        let info_update_handle = self.start_info_update_task();
        let long_poll_handle = self.start_long_polling();
        
        // Wait for any task to complete (which means something went wrong)
        tokio::select! {
            _ = ping_handle => {
                eprintln!("Ping task stopped");
            }
            _ = health_check_handle => {
                eprintln!("Health check task stopped");
            }
            _ = info_update_handle => {
                eprintln!("Info update task stopped");
            }
            _ = long_poll_handle => {
                eprintln!("Long polling stopped");
            }
        }
    }

    // Ping every 20ms like APK does
    async fn start_ping_task(&self) -> tokio::task::JoinHandle<()> {
        let device = self.device.clone();
        let api_client = self.api_client.clone();
        
        tokio::spawn(async move {
            let mut interval = interval(Duration::from_millis(20));
            
            loop {
                interval.tick().await;
                
                let device_guard = device.lock().await;
                if !device_guard.is_connected {
                    break;
                }
                let token = device_guard.token.clone();
                drop(device_guard);
                
                // Send ping with token if available
                if let Err(e) = api_client.ping(token.as_deref()).await {
                    // Don't log ping errors as they're too frequent
                    // Only break if device is disconnected
                    let device_guard = device.lock().await;
                    if !device_guard.is_connected {
                        break;
                    }
                }
            }
        })
    }

    // Health check every second
    async fn start_health_check_task(&self) -> tokio::task::JoinHandle<()> {
        let device = self.device.clone();
        let api_client = self.api_client.clone();
        
        tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(1));
            
            loop {
                interval.tick().await;
                
                let device_guard = device.lock().await;
                if !device_guard.is_connected {
                    break;
                }
                
                let token = match &device_guard.token {
                    Some(t) => t.clone(),
                    None => break,
                };
                
                let battery_level = device_guard.battery_level;
                drop(device_guard);
                
                if let Err(e) = api_client.health_check(&token, battery_level).await {
                    eprintln!("Health check error: {}", e);
                }
            }
        })
    }

    // Info update every 5 seconds
    async fn start_info_update_task(&self) -> tokio::task::JoinHandle<()> {
        let device = self.device.clone();
        let api_client = self.api_client.clone();
        
        tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(5));
            
            loop {
                interval.tick().await;
                
                let device_guard = device.lock().await;
                if !device_guard.is_connected {
                    break;
                }
                
                let token = match &device_guard.token {
                    Some(t) => t.clone(),
                    None => break,
                };
                
                let battery_level = device_guard.battery_level;
                drop(device_guard);
                
                // Simulate battery drain
                let mut device_guard = device.lock().await;
                if device_guard.battery_level > 10 {
                    device_guard.battery_level = device_guard.battery_level.saturating_sub(1);
                }
                drop(device_guard);
                
                if let Err(e) = api_client.update_device_info(&token, battery_level, 100).await {
                    eprintln!("Failed to update device info: {}", e);
                }
            }
        })
    }

    // Long polling for commands
    async fn start_long_polling(&self) -> tokio::task::JoinHandle<()> {
        let device = self.device.clone();
        let api_client = self.api_client.clone();
        
        tokio::spawn(async move {
            let mut retry_count = 0;
            let max_retries = 3;
            
            loop {
                let device_guard = device.lock().await;
                if !device_guard.is_connected {
                    break;
                }
                
                let token = match &device_guard.token {
                    Some(t) => t.clone(),
                    None => break,
                };
                
                let battery_level = device_guard.battery_level;
                drop(device_guard);
                
                match api_client.long_poll(&token, battery_level, 100).await {
                    Ok(response) => {
                        retry_count = 0;
                        
                        if let Some(status) = response.get("status").and_then(|v| v.as_str()) {
                            match status {
                                "timeout" => {
                                    // Normal timeout, immediately reconnect
                                    continue;
                                }
                                "offline" | "replaced" => {
                                    let mut device_guard = device.lock().await;
                                    device_guard.disconnect();
                                    break;
                                }
                                "command" => {
                                    if let Some(cmd) = response.get("command").and_then(|v| v.as_str()) {
                                        eprintln!("Received command: {}", cmd);
                                    }
                                }
                                _ => {}
                            }
                        }
                    }
                    Err(e) => {
                        retry_count += 1;
                        eprintln!("Long poll error (retry {}/{}): {}", retry_count, max_retries, e);
                        
                        if retry_count >= max_retries {
                            let mut device_guard = device.lock().await;
                            device_guard.disconnect();
                            break;
                        }
                        
                        // Short delay before retry
                        sleep(Duration::from_millis(500)).await;
                    }
                }
                
                // No delay - immediate reconnect for continuous long polling
            }
        })
    }
}