use crate::models::{Merchant, Method};
use dialoguer::{theme::ColorfulTheme, Select, Input, Confirm};
use anyhow::Result;
use console::Style;

pub struct MerchantMenu;

#[derive(Debug, Clone)]
pub enum MerchantMenuItem {
    ConfigureTraffic,
    StartTraffic,
    StopTraffic,
    ViewTransactions,
    ViewStatistics,
    ExportData,
    ConfigureCallback,
    TogglePaymentType,
    SetLiquidity,
    Back,
}

impl MerchantMenu {
    pub fn show(merchant: &Merchant, is_traffic_running: bool) -> Result<MerchantMenuItem> {
        let header = format!(
            "\n{} - {} ({})\nBalance: {} USDT | Liquidity: {}% | Payment Type: {:?}",
            Style::new().bold().apply_to(&merchant.name),
            if merchant.is_active { "Active" } else { "Inactive" },
            if is_traffic_running { "Traffic Running" } else { "Traffic Stopped" },
            merchant.balance_usdt,
            merchant.liquidity_percentage,
            merchant.payment_type
        );
        
        println!("{}", header);
        
        let items = vec![
            "Configure Traffic Parameters",
            if is_traffic_running { "Stop Traffic" } else { "Start Traffic" },
            "View Transactions",
            "View Statistics",
            "Export Data",
            "Configure Callback URL",
            "Toggle Payment Type (RUB/USDT)",
            "Set Liquidity Percentage",
            "Back to Main Menu",
        ];
        
        let selection = Select::with_theme(&ColorfulTheme::default())
            .with_prompt("Merchant Menu")
            .items(&items)
            .default(0)
            .interact()?;
            
        Ok(match selection {
            0 => MerchantMenuItem::ConfigureTraffic,
            1 => if is_traffic_running { 
                MerchantMenuItem::StopTraffic 
            } else { 
                MerchantMenuItem::StartTraffic 
            },
            2 => MerchantMenuItem::ViewTransactions,
            3 => MerchantMenuItem::ViewStatistics,
            4 => MerchantMenuItem::ExportData,
            5 => MerchantMenuItem::ConfigureCallback,
            6 => MerchantMenuItem::TogglePaymentType,
            7 => MerchantMenuItem::SetLiquidity,
            _ => MerchantMenuItem::Back,
        })
    }
    
    pub fn get_callback_url() -> Result<Option<String>> {
        let use_callback = Confirm::with_theme(&ColorfulTheme::default())
            .with_prompt("Do you want to set a callback URL?")
            .default(false)
            .interact()?;
            
        if use_callback {
            let url = Input::<String>::with_theme(&ColorfulTheme::default())
                .with_prompt("Callback URL")
                .default(format!("http://localhost:8080/callback"))
                .interact_text()?;
            Ok(Some(url))
        } else {
            Ok(None)
        }
    }
    
    pub fn get_liquidity_percentage() -> Result<f64> {
        loop {
            let input = Input::<String>::with_theme(&ColorfulTheme::default())
                .with_prompt("Liquidity percentage (0-100)")
                .interact_text()?;
                
            match input.parse::<f64>() {
                Ok(value) if (0.0..=100.0).contains(&value) => return Ok(value),
                _ => {
                    eprintln!("Please enter a valid percentage between 0 and 100");
                }
            }
        }
    }
    
    pub fn get_usdt_rate() -> Result<f64> {
        loop {
            let input = Input::<String>::with_theme(&ColorfulTheme::default())
                .with_prompt("USDT/RUB rate")
                .default("95.0".to_string())
                .interact_text()?;
                
            match input.parse::<f64>() {
                Ok(value) if value > 0.0 => return Ok(value),
                _ => {
                    eprintln!("Please enter a valid positive rate");
                }
            }
        }
    }
    
    pub fn select_method_id() -> Result<String> {
        // In a real implementation, this would fetch available methods from the API
        // For now, we'll use a hardcoded list
        let methods = vec![
            ("1", "Bank Card (RUB)"),
            ("2", "USDT TRC-20"),
            ("3", "SBP (Fast Payment System)"),
        ];
        
        let items: Vec<&str> = methods.iter().map(|(_, name)| *name).collect();
        
        let selection = Select::with_theme(&ColorfulTheme::default())
            .with_prompt("Select payment method")
            .items(&items)
            .default(0)
            .interact()?;
            
        Ok(methods[selection].0.to_string())
    }
    
    pub fn select_method_from_list(methods: &[Method]) -> Result<String> {
        let items: Vec<String> = methods
            .iter()
            .map(|m| format!("{} - {} ({})", m.code, m.name, m.method_type))
            .collect();
        
        let selection = Select::with_theme(&ColorfulTheme::default())
            .with_prompt("Select payment method")
            .items(&items)
            .default(0)
            .interact()?;
            
        Ok(methods[selection].id.clone())
    }
}