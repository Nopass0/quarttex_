use crate::models::{Merchant, AmountRange};
use crate::services::MerchantService;
use anyhow::Result;
use rand::{Rng, SeedableRng, rngs::StdRng, seq::SliceRandom};
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use tokio::time::{sleep, Duration};
use tracing::{info, error, debug};
use uuid::Uuid;

pub struct TrafficGenerator {
    merchant_service: Arc<MerchantService>,
    active_generators: Arc<RwLock<Vec<GeneratorHandle>>>,
}

struct GeneratorHandle {
    merchant_id: Uuid,
    cancel_tx: mpsc::Sender<()>,
}

impl TrafficGenerator {
    pub fn new(merchant_service: Arc<MerchantService>) -> Self {
        Self {
            merchant_service,
            active_generators: Arc::new(RwLock::new(Vec::new())),
        }
    }
    
    pub async fn start_traffic(&self, merchant: Merchant, method_id: String) -> Result<()> {
        // Check if already running for this merchant
        let generators = self.active_generators.read().await;
        if generators.iter().any(|g| g.merchant_id == merchant.id) {
            return Err(anyhow::anyhow!("Traffic already running for this merchant"));
        }
        drop(generators);
        
        let (cancel_tx, mut cancel_rx) = mpsc::channel(1);
        
        let handle = GeneratorHandle {
            merchant_id: merchant.id,
            cancel_tx: cancel_tx.clone(),
        };
        
        self.active_generators.write().await.push(handle);
        
        let merchant_service = self.merchant_service.clone();
        let active_generators = self.active_generators.clone();
        
        tokio::spawn(async move {
            info!("Starting traffic generation for merchant {}", merchant.name);
            
            let mut rng = StdRng::from_entropy();
            let mut created_count = 0u64;
            
            // Get available methods once at the start
            let available_methods = match merchant_service.get_available_methods(&merchant).await {
                Ok(methods) => methods,
                Err(e) => {
                    error!("Failed to get available methods: {}. Using provided method_id", e);
                    vec![]
                }
            };
            
            loop {
                // Check for cancellation
                if cancel_rx.try_recv().is_ok() {
                    info!("Stopping traffic generation for merchant {}", merchant.name);
                    break;
                }
                
                // Check transaction limit
                if let Some(max) = merchant.traffic_config.max_transactions {
                    if created_count >= max {
                        info!("Reached transaction limit ({}) for merchant {}", max, merchant.name);
                        break;
                    }
                }
                
                // Generate amount based on probabilities
                let amount = generate_amount(&merchant.traffic_config.amount_probabilities, &mut rng);
                
                // Determine if transaction should be mock based on liquidity
                let is_mock = !merchant.is_liquid();
                
                // Select method - use random from available or provided method_id
                let selected_method_id = if !available_methods.is_empty() {
                    available_methods.choose(&mut rng)
                        .map(|m| m.id.clone())
                        .unwrap_or(method_id.clone())
                } else {
                    method_id.clone()
                };
                
                // Create transaction
                match merchant_service.create_transaction(&merchant, amount, selected_method_id.clone(), is_mock).await {
                    Ok(transaction) => {
                        created_count += 1;
                        debug!("Created transaction {} for merchant {} (amount: {}, method: {}, mock: {})",
                            transaction.id, merchant.name, amount, selected_method_id, is_mock);
                            
                        // TODO: If liquid and device connected, emit balance top-up notification
                        if !is_mock && transaction.requisites.is_some() {
                            // This is where we would integrate with device emulator
                            debug!("Would emit balance top-up notification for transaction {}", transaction.id);
                        }
                    }
                    Err(e) => {
                        error!("Failed to create transaction for merchant {}: {}", merchant.name, e);
                    }
                }
                
                // Calculate sleep duration with variance
                let base_interval = merchant.traffic_config.interval_ms;
                let variance = merchant.traffic_config.interval_variance;
                let actual_interval = if variance > 0 {
                    let min = base_interval.saturating_sub(variance);
                    let max = base_interval + variance;
                    rng.gen_range(min..=max)
                } else {
                    base_interval
                };
                
                sleep(Duration::from_millis(actual_interval)).await;
            }
            
            // Remove from active generators
            let mut generators = active_generators.write().await;
            generators.retain(|g| g.merchant_id != merchant.id);
            
            info!("Traffic generation stopped for merchant {} (created {} transactions)", 
                merchant.name, created_count);
        });
        
        Ok(())
    }
    
    pub async fn stop_traffic(&self, merchant_id: &Uuid) -> Result<()> {
        let mut generators = self.active_generators.write().await;
        
        if let Some(pos) = generators.iter().position(|g| &g.merchant_id == merchant_id) {
            let handle = generators.remove(pos);
            let _ = handle.cancel_tx.send(()).await;
            Ok(())
        } else {
            Err(anyhow::anyhow!("No active traffic for this merchant"))
        }
    }
    
    pub async fn stop_all_traffic(&self) -> Result<()> {
        let mut generators = self.active_generators.write().await;
        
        for handle in generators.drain(..) {
            let _ = handle.cancel_tx.send(()).await;
        }
        
        Ok(())
    }
    
    pub async fn is_running(&self, merchant_id: &Uuid) -> bool {
        self.active_generators
            .read()
            .await
            .iter()
            .any(|g| &g.merchant_id == merchant_id)
    }
}

fn generate_amount(probabilities: &std::collections::HashMap<AmountRange, f64>, rng: &mut impl Rng) -> f64 {
    let roll = rng.gen_range(0.0..100.0);
    
    // Sort ranges by probability (ascending) for cumulative distribution
    let mut ranges: Vec<_> = probabilities.iter().collect();
    ranges.sort_by(|a, b| a.1.partial_cmp(b.1).unwrap());
    
    // Simple approach: use probability as weight for selection
    // In production, you might want a more sophisticated distribution
    for (range, probability) in &ranges {
        if roll <= **probability {
            return rng.gen_range(range.min as f64..=range.max as f64);
        }
    }
    
    // Fallback to first range
    if let Some((range, _)) = ranges.first() {
        rng.gen_range(range.min as f64..=range.max as f64)
    } else {
        1000.0 // Default fallback
    }
}