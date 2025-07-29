use anyhow::Result;
use futures_util::{SinkExt, StreamExt};
use tokio_tungstenite::{connect_async, tungstenite::Message};
use serde_json::json;

pub struct WebSocketClient {
    base_url: String,
}

impl WebSocketClient {
    pub fn new(base_url: String) -> Self {
        // Convert HTTP URL to WebSocket URL
        let ws_url = base_url
            .replace("http://", "ws://")
            .replace("https://", "wss://");
        
        Self {
            base_url: ws_url,
        }
    }

    pub async fn connect_device(&self, device_id: &str, token: &str) -> Result<()> {
        let url = format!("{}/ws/device/{}", self.base_url, device_id);
        
        let (ws_stream, _) = connect_async(&url).await?;
        let (mut write, mut read) = ws_stream.split();

        // Send authentication
        let auth_msg = json!({
            "type": "auth",
            "token": token,
        });
        write.send(Message::Text(auth_msg.to_string())).await?;

        // Handle messages
        tokio::spawn(async move {
            while let Some(msg) = read.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        if let Ok(data) = serde_json::from_str::<serde_json::Value>(&text) {
                            println!("WebSocket message: {:?}", data);
                        }
                    }
                    Ok(Message::Close(_)) => {
                        println!("WebSocket closed");
                        break;
                    }
                    Err(e) => {
                        eprintln!("WebSocket error: {}", e);
                        break;
                    }
                    _ => {}
                }
            }
        });

        Ok(())
    }
}