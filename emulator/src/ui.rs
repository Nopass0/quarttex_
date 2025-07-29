use anyhow::Result;
use crossterm::event::{self, Event, KeyCode, KeyEventKind};
use ratatui::{
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Clear, List, ListItem, ListState, Paragraph},
    Frame,
};
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::{
    api::{ApiClient, ConnectDeviceRequest},
    config::{ApiType, AppConfig},
    device::Device,
    device_manager::DeviceManager,
    notifications::NotificationGenerator,
};

#[derive(Debug, Clone, PartialEq)]
pub enum AppState {
    MainMenu,
    ApiSettings,
    ApiSettingsCustomInput,
    DeviceList,
    DeviceMenu(usize),
    DeviceCodeInput(usize),
    DeviceConnecting(usize),
    NotificationMenu(usize),
    NotificationAmountInput(usize),
    NotificationBankSelect(usize),
    NotificationMessageInput(usize),
}

pub struct App {
    pub state: AppState,
    pub config: Arc<Mutex<AppConfig>>,
    pub devices: Vec<Device>,
    pub list_state: ListState,
    pub input_buffer: String,
    pub error_message: Option<String>,
    pub success_message: Option<String>,
    pub notification_amount: Option<u32>,
    pub selected_bank: Option<String>,
}

impl App {
    pub fn new(config: Arc<Mutex<AppConfig>>) -> Self {
        let mut list_state = ListState::default();
        list_state.select(Some(0));

        Self {
            state: AppState::MainMenu,
            config,
            devices: Vec::new(),
            list_state,
            input_buffer: String::new(),
            error_message: None,
            success_message: None,
            notification_amount: None,
            selected_bank: None,
        }
    }

    pub fn next(&mut self) {
        let i = match self.list_state.selected() {
            Some(i) => {
                let max = match &self.state {
                    AppState::MainMenu => 2,
                    AppState::ApiSettings => 3,
                    AppState::DeviceList => self.devices.len() + 1,
                    AppState::DeviceMenu(_) => 3,
                    AppState::NotificationMenu(_) => 2,
                    AppState::NotificationBankSelect(_) => 6,
                    _ => 1,
                };
                if i >= max - 1 {
                    0
                } else {
                    i + 1
                }
            }
            None => 0,
        };
        self.list_state.select(Some(i));
    }

    pub fn previous(&mut self) {
        let i = match self.list_state.selected() {
            Some(i) => {
                let max = match &self.state {
                    AppState::MainMenu => 2,
                    AppState::ApiSettings => 3,
                    AppState::DeviceList => self.devices.len() + 1,
                    AppState::DeviceMenu(_) => 3,
                    AppState::NotificationMenu(_) => 2,
                    AppState::NotificationBankSelect(_) => 6,
                    _ => 1,
                };
                if i == 0 {
                    max - 1
                } else {
                    i - 1
                }
            }
            None => 0,
        };
        self.list_state.select(Some(i));
    }
}

pub async fn run_app<B: ratatui::backend::Backend>(
    terminal: &mut ratatui::Terminal<B>,
    mut app: App,
) -> Result<()> {
    loop {
        terminal.draw(|f| draw_ui(f, &mut app))?;

        if let Event::Key(key) = event::read()? {
            if key.kind == KeyEventKind::Press {
                match &app.state {
                    AppState::ApiSettingsCustomInput
                    | AppState::DeviceCodeInput(_)
                    | AppState::NotificationAmountInput(_)
                    | AppState::NotificationMessageInput(_) => {
                        match key.code {
                            KeyCode::Char(c) => {
                                app.input_buffer.push(c);
                            }
                            KeyCode::Backspace => {
                                app.input_buffer.pop();
                            }
                            KeyCode::Enter => {
                                handle_input_submit(&mut app).await?;
                            }
                            KeyCode::Esc => {
                                app.input_buffer.clear();
                                match &app.state {
                                    AppState::ApiSettingsCustomInput => {
                                        app.state = AppState::ApiSettings;
                                    }
                                    AppState::DeviceCodeInput(idx) => {
                                        app.state = AppState::DeviceMenu(*idx);
                                    }
                                    AppState::NotificationAmountInput(idx) => {
                                        app.state = AppState::NotificationMenu(*idx);
                                    }
                                    AppState::NotificationMessageInput(idx) => {
                                        app.state = AppState::NotificationBankSelect(*idx);
                                    }
                                    _ => {}
                                }
                            }
                            _ => {}
                        }
                    }
                    _ => match key.code {
                        KeyCode::Char('q') => return Ok(()),
                        KeyCode::Up => app.previous(),
                        KeyCode::Down => app.next(),
                        KeyCode::Enter => handle_enter(&mut app).await?,
                        KeyCode::Esc => handle_back(&mut app),
                        _ => {}
                    },
                }
            }
        }
    }
}

async fn handle_enter(app: &mut App) -> Result<()> {
    let selected = app.list_state.selected().unwrap_or(0);

    match &app.state {
        AppState::MainMenu => match selected {
            0 => app.state = AppState::ApiSettings,
            1 => app.state = AppState::DeviceList,
            _ => {}
        },
        AppState::ApiSettings => {
            let mut config = app.config.lock().await;
            match selected {
                0 => config.set_api_type(ApiType::Local),
                1 => config.set_api_type(ApiType::Production),
                2 => {
                    app.state = AppState::ApiSettingsCustomInput;
                    app.input_buffer.clear();
                    return Ok(());
                }
                _ => {}
            }
            app.success_message = Some("API настроен".to_string());
            app.state = AppState::MainMenu;
        }
        AppState::DeviceList => {
            if selected == app.devices.len() {
                // Create new device
                let device = Device::new(format!("Устройство {}", app.devices.len() + 1));
                app.devices.push(device);
                app.success_message = Some("Устройство создано".to_string());
            } else {
                // Select existing device
                app.state = AppState::DeviceMenu(selected);
            }
        }
        AppState::DeviceMenu(device_idx) => match selected {
            0 => {
                if app.devices[*device_idx].is_connected {
                    app.state = AppState::NotificationMenu(*device_idx);
                } else {
                    app.state = AppState::DeviceCodeInput(*device_idx);
                    app.input_buffer.clear();
                }
            }
            1 => {
                if app.devices[*device_idx].is_connected {
                    app.devices[*device_idx].disconnect();
                    app.success_message = Some("Устройство отключено".to_string());
                }
            }
            2 => app.state = AppState::DeviceList,
            _ => {}
        },
        AppState::NotificationMenu(device_idx) => match selected {
            0 => {
                // Send random notifications
                send_random_notifications(app, *device_idx).await?;
            }
            1 => {
                // Custom notification
                app.state = AppState::NotificationAmountInput(*device_idx);
                app.input_buffer.clear();
            }
            _ => {}
        },
        AppState::NotificationBankSelect(device_idx) => {
            let banks = vec![
                "Сбербанк",
                "Тинькофф",
                "ВТБ",
                "Альфа-Банк",
                "Газпромбанк",
                "Другой",
            ];
            app.selected_bank = Some(banks[selected].to_string());
            app.state = AppState::NotificationMessageInput(*device_idx);
            app.input_buffer.clear();
        }
        _ => {}
    }

    Ok(())
}

fn handle_back(app: &mut App) {
    match &app.state {
        AppState::ApiSettings => app.state = AppState::MainMenu,
        AppState::DeviceList => app.state = AppState::MainMenu,
        AppState::DeviceMenu(_) => app.state = AppState::DeviceList,
        AppState::NotificationMenu(idx) => app.state = AppState::DeviceMenu(*idx),
        AppState::NotificationBankSelect(idx) => app.state = AppState::NotificationMenu(*idx),
        _ => {}
    }
    app.list_state.select(Some(0));
}

async fn handle_input_submit(app: &mut App) -> Result<()> {
    match &app.state {
        AppState::ApiSettingsCustomInput => {
            let url = app.input_buffer.trim().to_string();
            if !url.is_empty() {
                let mut config = app.config.lock().await;
                config.set_api_type(ApiType::Custom(url));
                app.success_message = Some("Пользовательский API настроен".to_string());
                app.state = AppState::MainMenu;
            }
        }
        AppState::DeviceCodeInput(device_idx) => {
            let code = app.input_buffer.trim().to_string();
            let device_idx = *device_idx;
            if !code.is_empty() {
                app.state = AppState::DeviceConnecting(device_idx);
                connect_device(app, device_idx, code).await?;
            }
        }
        AppState::NotificationAmountInput(device_idx) => {
            if let Ok(amount) = app.input_buffer.trim().parse::<u32>() {
                app.notification_amount = Some(amount);
                app.state = AppState::NotificationBankSelect(*device_idx);
                app.input_buffer.clear();
            } else {
                app.error_message = Some("Неверная сумма".to_string());
            }
        }
        AppState::NotificationMessageInput(device_idx) => {
            let message = if app.input_buffer.trim().is_empty() {
                None
            } else {
                Some(app.input_buffer.trim().to_string())
            };

            if let (Some(amount), Some(bank)) = (app.notification_amount, app.selected_bank.clone()) {
                let device_idx = *device_idx;
                send_bank_notification(app, device_idx, amount, &bank, message).await?;
                app.notification_amount = None;
                app.selected_bank = None;
                app.state = AppState::NotificationMenu(device_idx);
            }
        }
        _ => {}
    }

    app.input_buffer.clear();
    Ok(())
}

async fn connect_device(app: &mut App, device_idx: usize, code: String) -> Result<()> {
    let config = app.config.lock().await;
    let api_client = ApiClient::new(config.api_base_url.clone());

    let device = &app.devices[device_idx];
    let request = ConnectDeviceRequest {
        device_code: code.clone(),
        battery_level: device.battery_level,
        network_info: device.network_info.clone(),
        device_model: device.device_model.clone(),
        android_version: device.android_version.clone(),
        app_version: device.app_version.clone(),
    };

    match api_client.connect_device(request).await {
        Ok(response) => {
            if let Some(token) = response.token {
                app.devices[device_idx].connect(code, token);
                app.success_message = Some("Устройство подключено".to_string());
                app.state = AppState::DeviceMenu(device_idx);
                
                // Start device manager for background tasks
                let device_arc = Arc::new(Mutex::new(app.devices[device_idx].clone()));
                let api_client = ApiClient::new(config.api_base_url.clone());
                let device_manager = DeviceManager::new(device_arc.clone(), api_client);
                
                tokio::spawn(async move {
                    device_manager.start_background_tasks().await;
                });
            } else {
                app.error_message = Some(response.message);
                app.state = AppState::DeviceMenu(device_idx);
            }
        }
        Err(e) => {
            app.error_message = Some(format!("Ошибка подключения: {}", e));
            app.state = AppState::DeviceMenu(device_idx);
        }
    }

    Ok(())
}

async fn send_random_notifications(app: &mut App, device_idx: usize) -> Result<()> {
    let device = &app.devices[device_idx];
    if let Some(token) = &device.token {
        let config = app.config.lock().await;
        let api_client = ApiClient::new(config.api_base_url.clone());
        
        let notifications = NotificationGenerator::generate_random_notifications(10);
        let mut success_count = 0;

        for notification in notifications {
            if api_client.send_notification(token, notification).await.is_ok() {
                success_count += 1;
            }
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        }

        app.success_message = Some(format!("Отправлено {} уведомлений", success_count));
    }

    Ok(())
}

async fn send_bank_notification(
    app: &mut App,
    device_idx: usize,
    amount: u32,
    bank: &str,
    message: Option<String>,
) -> Result<()> {
    let device = &app.devices[device_idx];
    if let Some(token) = &device.token {
        let config = app.config.lock().await;
        let api_client = ApiClient::new(config.api_base_url.clone());

        let notification = NotificationGenerator::generate_bank_notification(amount, bank, message);
        
        match api_client.send_notification(token, notification).await {
            Ok(_) => {
                app.success_message = Some("Уведомление отправлено".to_string());
            }
            Err(e) => {
                app.error_message = Some(format!("Ошибка: {}", e));
            }
        }
    }

    Ok(())
}

fn draw_ui(f: &mut Frame, app: &mut App) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .margin(1)
        .constraints(
            [
                Constraint::Length(3),
                Constraint::Min(0),
                Constraint::Length(3),
            ]
            .as_ref(),
        )
        .split(f.area());

    // Header
    let header = Paragraph::new("Device Emulator")
        .style(Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD))
        .alignment(Alignment::Center)
        .block(Block::default().borders(Borders::ALL));
    f.render_widget(header, chunks[0]);

    // Main content
    match &app.state {
        AppState::MainMenu => draw_main_menu(f, app, chunks[1]),
        AppState::ApiSettings => draw_api_settings(f, app, chunks[1]),
        AppState::ApiSettingsCustomInput => draw_input_dialog(f, app, chunks[1], "Введите URL API:"),
        AppState::DeviceList => draw_device_list(f, app, chunks[1]),
        AppState::DeviceMenu(idx) => draw_device_menu(f, app, chunks[1], *idx),
        AppState::DeviceCodeInput(_) => draw_input_dialog(f, app, chunks[1], "Введите код устройства:"),
        AppState::DeviceConnecting(_) => draw_loading(f, chunks[1], "Подключение..."),
        AppState::NotificationMenu(idx) => draw_notification_menu(f, app, chunks[1], *idx),
        AppState::NotificationAmountInput(_) => draw_input_dialog(f, app, chunks[1], "Введите сумму:"),
        AppState::NotificationBankSelect(_) => draw_bank_select(f, app, chunks[1]),
        AppState::NotificationMessageInput(_) => {
            draw_input_dialog(f, app, chunks[1], "Введите сообщение (или Enter для шаблона):")
        }
    }

    // Footer
    let footer_text = if let Some(err) = &app.error_message {
        vec![
            Span::styled("Ошибка: ", Style::default().fg(Color::Red)),
            Span::raw(err),
        ]
    } else if let Some(success) = &app.success_message {
        vec![
            Span::styled("Успех: ", Style::default().fg(Color::Green)),
            Span::raw(success),
        ]
    } else {
        vec![
            Span::raw("↑↓ Навигация | Enter Выбор | Esc Назад | q Выход"),
        ]
    };

    let footer = Paragraph::new(Line::from(footer_text))
        .style(Style::default().fg(Color::DarkGray))
        .alignment(Alignment::Center)
        .block(Block::default().borders(Borders::ALL));
    f.render_widget(footer, chunks[2]);
}

fn draw_main_menu(f: &mut Frame, app: &mut App, area: Rect) {
    let items = vec![
        ListItem::new("1. Базовая ссылка API"),
        ListItem::new("2. Устройства"),
    ];

    let list = List::new(items)
        .block(Block::default().borders(Borders::ALL).title("Главное меню"))
        .highlight_style(Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD))
        .highlight_symbol("> ");

    f.render_stateful_widget(list, area, &mut app.list_state);
}

fn draw_api_settings(f: &mut Frame, app: &mut App, area: Rect) {
    let items = vec![
        ListItem::new("1. Локальная (http://localhost:3001/api)"),
        ListItem::new("2. Production (https://chasepay.pro/api)"),
        ListItem::new("3. Пользовательская"),
    ];

    let list = List::new(items)
        .block(Block::default().borders(Borders::ALL).title("Настройки API"))
        .highlight_style(Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD))
        .highlight_symbol("> ");

    f.render_stateful_widget(list, area, &mut app.list_state);
}

fn draw_device_list(f: &mut Frame, app: &mut App, area: Rect) {
    let mut items: Vec<ListItem> = app
        .devices
        .iter()
        .map(|d| {
            let status = if d.is_connected { "✓" } else { "✗" };
            ListItem::new(format!("{} {} [{}]", status, d.name, d.id))
        })
        .collect();

    items.push(ListItem::new("+ Создать новое устройство"));

    let list = List::new(items)
        .block(Block::default().borders(Borders::ALL).title("Устройства"))
        .highlight_style(Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD))
        .highlight_symbol("> ");

    f.render_stateful_widget(list, area, &mut app.list_state);
}

fn draw_device_menu(f: &mut Frame, app: &mut App, area: Rect, device_idx: usize) {
    let device = &app.devices[device_idx];
    let mut items = vec![];

    if device.is_connected {
        items.push(ListItem::new("1. Отправить уведомления"));
        items.push(ListItem::new("2. Отключить"));
    } else {
        items.push(ListItem::new("1. Подключить"));
        items.push(ListItem::new("2. -"));
    }
    items.push(ListItem::new("3. Назад"));

    let title = format!("Устройство: {} [{}]", device.name, device.id);
    let list = List::new(items)
        .block(Block::default().borders(Borders::ALL).title(title))
        .highlight_style(Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD))
        .highlight_symbol("> ");

    f.render_stateful_widget(list, area, &mut app.list_state);
}

fn draw_notification_menu(f: &mut Frame, app: &mut App, area: Rect, device_idx: usize) {
    let device = &app.devices[device_idx];
    let items = vec![
        ListItem::new("1. Отправить 10 случайных уведомлений"),
        ListItem::new("2. Создать уведомление от банка"),
    ];

    let title = format!("Уведомления - {}", device.name);
    let list = List::new(items)
        .block(Block::default().borders(Borders::ALL).title(title))
        .highlight_style(Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD))
        .highlight_symbol("> ");

    f.render_stateful_widget(list, area, &mut app.list_state);
}

fn draw_bank_select(f: &mut Frame, app: &mut App, area: Rect) {
    let banks = vec![
        "Сбербанк",
        "Тинькофф",
        "ВТБ",
        "Альфа-Банк",
        "Газпромбанк",
        "Другой",
    ];

    let items: Vec<ListItem> = banks.iter().map(|b| ListItem::new(*b)).collect();

    let list = List::new(items)
        .block(Block::default().borders(Borders::ALL).title("Выберите банк"))
        .highlight_style(Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD))
        .highlight_symbol("> ");

    f.render_stateful_widget(list, area, &mut app.list_state);
}

fn draw_input_dialog(f: &mut Frame, app: &App, area: Rect, prompt: &str) {
    let popup_area = centered_rect(60, 20, area);

    f.render_widget(Clear, popup_area);

    let block = Block::default()
        .title(prompt)
        .borders(Borders::ALL)
        .style(Style::default().bg(Color::Black));

    let input = Paragraph::new(app.input_buffer.as_str())
        .style(Style::default().fg(Color::White))
        .block(block);

    f.render_widget(input, popup_area);
}

fn draw_loading(f: &mut Frame, area: Rect, message: &str) {
    let popup_area = centered_rect(40, 10, area);

    f.render_widget(Clear, popup_area);

    let block = Block::default()
        .borders(Borders::ALL)
        .style(Style::default().bg(Color::Black));

    let loading = Paragraph::new(message)
        .style(Style::default().fg(Color::Yellow))
        .alignment(Alignment::Center)
        .block(block);

    f.render_widget(loading, popup_area);
}

fn centered_rect(percent_x: u16, percent_y: u16, r: Rect) -> Rect {
    let popup_layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints(
            [
                Constraint::Percentage((100 - percent_y) / 2),
                Constraint::Percentage(percent_y),
                Constraint::Percentage((100 - percent_y) / 2),
            ]
            .as_ref(),
        )
        .split(r);

    Layout::default()
        .direction(Direction::Horizontal)
        .constraints(
            [
                Constraint::Percentage((100 - percent_x) / 2),
                Constraint::Percentage(percent_x),
                Constraint::Percentage((100 - percent_x) / 2),
            ]
            .as_ref(),
        )
        .split(popup_layout[1])[1]
}