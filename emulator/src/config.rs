use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub api_base_url: String,
    pub api_type: ApiType,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ApiType {
    Local,
    Production,
    Custom(String),
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            api_base_url: "http://localhost:3000/api".to_string(),
            api_type: ApiType::Local,
        }
    }
}

impl AppConfig {
    pub fn set_api_type(&mut self, api_type: ApiType) {
        match &api_type {
            ApiType::Local => {
                self.api_base_url = "http://localhost:3000/api".to_string();
            }
            ApiType::Production => {
                self.api_base_url = "https://chasepay.pro/api".to_string();
            }
            ApiType::Custom(url) => {
                self.api_base_url = url.clone();
            }
        }
        self.api_type = api_type;
    }
}