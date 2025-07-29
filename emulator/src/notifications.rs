use rand::Rng;
use chrono::Utc;
use crate::api::NotificationRequest;

pub struct NotificationGenerator;

impl NotificationGenerator {
    pub fn generate_random_notifications(count: usize) -> Vec<NotificationRequest> {
        let mut rng = rand::thread_rng();
        let mut notifications = Vec::new();

        for _ in 0..count {
            let notification_type = rng.gen_range(0..5);
            let notification = match notification_type {
                0 => Self::generate_sms_notification(&mut rng),
                1 => Self::generate_random_bank_notification(&mut rng),
                2 => Self::generate_messenger_notification(&mut rng),
                3 => Self::generate_email_notification(&mut rng),
                _ => Self::generate_system_notification(&mut rng),
            };
            notifications.push(notification);
        }

        notifications
    }

    pub fn generate_bank_notification(amount: u32, bank_name: &str, custom_message: Option<String>) -> NotificationRequest {
        let (package_name, app_name, title, message) = match bank_name {
            "Сбербанк" => (
                "ru.sberbankmobile",
                "900",
                "900",
                custom_message.unwrap_or_else(|| format!("СЧЁТ*1234 12:34 зачислен перевод по СБП {}р из ТИНЬКОФФ БАНК Иван Иванов Баланс: 50000р", amount))
            ),
            "Тинькофф" => (
                "com.idamob.tinkoff.android",
                "T-Bank", 
                "T-Bank",
                custom_message.unwrap_or_else(|| format!("Пополнение, счет RUB. {} RUB. Иван И. Доступно 50000 RUB", amount))
            ),
            "ВТБ" => (
                "ru.vtb24.mobilebanking.android",
                "VTB",
                "VTB",
                custom_message.unwrap_or_else(|| format!("Поступление {}р Счет*1234 SBP Баланс 50000р 12:34", amount))
            ),
            "Альфа-Банк" => (
                "ru.alfabank.mobile.android",
                "Alfa-Bank",
                "Alfa-Bank",
                custom_message.unwrap_or_else(|| format!("Пополнение *1234 на {} RUR Баланс: 50000 RUR", amount))
            ),
            "Газпромбанк" => (
                "ru.gazprombank.android.mobilebank.app",
                "Gazprombank",
                "Gazprombank",
                custom_message.unwrap_or_else(|| format!("*5678 Получен перевод {}р SBP C2C ZACHISLENIE Доступно 50000р", amount))
            ),
            _ => (
                "com.android.messaging",
                bank_name,
                bank_name,
                custom_message.unwrap_or_else(|| format!("Пополнение на сумму {} руб.", amount))
            ),
        };

        NotificationRequest {
            package_name: package_name.to_string(),
            app_name: app_name.to_string(),
            title: title.to_string(),
            content: message.to_string(),
            timestamp: Utc::now().timestamp_millis(),
            priority: 1,
            category: "transaction".to_string(),
        }
    }

    fn generate_sms_notification(rng: &mut impl Rng) -> NotificationRequest {
        let senders = vec!["900", "+79001234567", "BANK", "INFO"];
        let sender = senders[rng.gen_range(0..senders.len())];
        
        let messages = vec![
            "Ваш код подтверждения: 1234",
            "Перевод 5000 руб. от Иван И.",
            "Баланс карты *1234: 12 345 руб.",
            "Платеж на 1500 руб. успешно проведен",
        ];
        let message = &messages[rng.gen_range(0..messages.len())];

        NotificationRequest {
            package_name: "com.android.messaging".to_string(),
            app_name: "Сообщения".to_string(),
            title: sender.to_string(),
            content: message.to_string(),
            timestamp: Utc::now().timestamp_millis(),
            priority: 1,
            category: "msg".to_string(),
        }
    }

    fn generate_random_bank_notification(rng: &mut impl Rng) -> NotificationRequest {
        let amount = rng.gen_range(100..50000);
        let balance = rng.gen_range(10000..200000);
        
        let banks = vec![
            ("ru.sberbankmobile", "900", "900", format!("СЧЁТ*{} {} зачислен перевод по СБП {}р из ТИНЬКОФФ БАНК Иван Иванов Баланс: {}р", 
                rng.gen_range(1000..9999), chrono::Local::now().format("%H:%M"), amount, balance)),
            ("com.idamob.tinkoff.android", "T-Bank", "T-Bank", format!("Пополнение, счет RUB. {} RUB. Петров П. Доступно {} RUB", amount, balance)),
            ("ru.vtb24.mobilebanking.android", "VTB", "VTB", format!("Поступление {}р Счет*{} SBP Баланс {}р {}", 
                amount, rng.gen_range(1000..9999), balance, chrono::Local::now().format("%H:%M"))),
            ("ru.alfabank.mobile.android", "Alfa-Bank", "Alfa-Bank", format!("Пополнение *{} на {} RUR Баланс: {} RUR", 
                rng.gen_range(1000..9999), amount, balance)),
            ("ru.gazprombank.android.mobilebank.app", "Gazprombank", "Gazprombank", format!("*{} Получен перевод {}р SBP C2C ZACHISLENIE Доступно {}р", 
                rng.gen_range(1000..9999), amount, balance)),
        ];
        
        let (package, app_name, title, message) = &banks[rng.gen_range(0..banks.len())];

        NotificationRequest {
            package_name: package.to_string(),
            app_name: app_name.to_string(),
            title: title.to_string(),
            content: message.to_string(),
            timestamp: Utc::now().timestamp_millis(),
            priority: 1,
            category: "transaction".to_string(),
        }
    }

    fn generate_messenger_notification(rng: &mut impl Rng) -> NotificationRequest {
        let messengers = vec![
            ("com.whatsapp", "WhatsApp"),
            ("org.telegram.messenger", "Telegram"),
            ("com.viber.voip", "Viber"),
        ];
        
        let (package, name) = messengers[rng.gen_range(0..messengers.len())];
        
        let senders = vec!["Мама", "Работа", "Друг", "Доставка"];
        let sender = senders[rng.gen_range(0..senders.len())];
        
        let messages = vec![
            "Привет! Как дела?",
            "Отправил документы",
            "Жду ответа",
            "Спасибо!",
        ];
        let message = &messages[rng.gen_range(0..messages.len())];

        NotificationRequest {
            package_name: package.to_string(),
            app_name: name.to_string(),
            title: sender.to_string(),
            content: message.to_string(),
            timestamp: Utc::now().timestamp_millis(),
            priority: 1,
            category: "msg".to_string(),
        }
    }

    fn generate_email_notification(rng: &mut impl Rng) -> NotificationRequest {
        let apps = vec![
            ("com.google.android.gm", "Gmail"),
            ("ru.mail.mailapp", "Почта Mail.ru"),
            ("ru.yandex.mail", "Яндекс.Почта"),
        ];
        
        let (package, name) = apps[rng.gen_range(0..apps.len())];
        
        let subjects = vec![
            "Подтверждение заказа",
            "Новое сообщение",
            "Важное уведомление",
            "Счет на оплату",
        ];
        let subject = subjects[rng.gen_range(0..subjects.len())];

        NotificationRequest {
            package_name: package.to_string(),
            app_name: name.to_string(),
            title: subject.to_string(),
            content: "У вас новое письмо".to_string(),
            timestamp: Utc::now().timestamp_millis(),
            priority: 0,
            category: "email".to_string(),
        }
    }

    fn generate_system_notification(rng: &mut impl Rng) -> NotificationRequest {
        let notifications = vec![
            ("android", "Android System", "Обновление системы доступно"),
            ("com.android.vending", "Google Play", "2 приложения обновлено"),
            ("com.android.systemui", "Система", "Батарея разряжена (15%)"),
        ];
        
        let (package, name, message) = notifications[rng.gen_range(0..notifications.len())];

        NotificationRequest {
            package_name: package.to_string(),
            app_name: name.to_string(),
            title: name.to_string(),
            content: message.to_string(),
            timestamp: Utc::now().timestamp_millis(),
            priority: 0,
            category: "system".to_string(),
        }
    }
}