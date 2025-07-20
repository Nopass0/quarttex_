# Device API Documentation

This document describes all device-related endpoints in the Chase backend API.

## Table of Contents
1. [Mobile Device API](#mobile-device-api) - Used by mobile devices
2. [Trader Device Management API](#trader-device-management-api) - Used by traders
3. [Admin Device Management API](#admin-device-management-api) - Used by admins

---

## Mobile Device API

Base URL: `http://localhost:3000/api/device`

These endpoints are used by mobile devices to communicate with the backend.

### 1. Device Ping

**Endpoint:** `GET /api/device/ping`

**Description:** Simple health check endpoint to verify device API is working.

**Headers:** None required

**Response:**
```json
{
  "status": "success",
  "message": "Device API is working"
}
```

---

### 2. Device Connect (Registration)

**Endpoint:** `POST /api/device/connect`

**Description:** Register/connect a device to the system. The deviceCode is the device token obtained when creating a device through the trader API.

**Headers:**
- `Content-Type: application/json`

**Request Body:**
```json
{
  "deviceCode": "string",      // Device token (64 character hex string)
  "batteryLevel": 85,          // Battery percentage (0-100)
  "networkInfo": "WiFi",       // Network type (WiFi, 4G, 5G, etc.)
  "deviceModel": "Pixel 7",    // Device model name
  "androidVersion": "14",      // Android version
  "appVersion": "1.0.0"        // App version
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "token": "660d4ed289eb1975e43f01c5044ad1fcb69aab9b76480237e59b1f570c5375c0",
  "message": "Device connected successfully"
}
```

**Error Response (400):**
```json
{
  "status": "error",
  "message": "Invalid device code"
}
```

---

### 3. Send Notification

**Endpoint:** `POST /api/device/notification`

**Description:** Send notification data from device to backend (e.g., SMS, push notifications).

**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer {device_token}`

**Request Body:**
```json
{
  "packageName": "com.sberbank.app",           // App package name
  "appName": "Сбербанк",                       // App display name
  "title": "Перевод",                          // Notification title
  "content": "Поступление 5000 руб от Иван И.", // Notification content
  "timestamp": 1752995428000,                  // Unix timestamp in milliseconds
  "priority": 1,                               // Priority level (number)
  "category": "transaction"                    // Category (e.g., transaction, message)
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Notification received"
}
```

**Error Response (401):**
```json
{
  "status": "error",
  "message": "Invalid or expired token"
}
```

---

### 4. Update Device Info

**Endpoint:** `POST /api/device/info/update`

**Description:** Update device information (battery, network, etc.).

**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer {device_token}`

**Request Body:**
```json
{
  "batteryLevel": 75,              // Battery percentage
  "isCharging": true,              // Charging status
  "networkInfo": "WiFi",           // Network type
  "networkSpeed": 50.5,            // Network speed in Mbps (optional)
  "timestamp": 1752995428000,      // Unix timestamp in milliseconds
  "deviceModel": "Pixel 7",        // Device model (optional)
  "androidVersion": "14",          // Android version (optional)
  "appVersion": "1.0.0"            // App version (optional)
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Device info updated"
}
```

---

## Trader Device Management API

Base URL: `http://localhost:3000/api/trader/devices`

These endpoints are used by traders to manage their devices.

### 1. List All Devices

**Endpoint:** `GET /api/trader/devices`

**Description:** Get all devices belonging to the trader.

**Headers:**
- `x-trader-token: {trader_session_token}`

**Response:**
```json
[
  {
    "id": "cmdbc6r1a047tikhvsls0m2vb",
    "name": "Test Device Android",
    "token": "660d4ed289eb1975e43f01c5044ad1fcb69aab9b76480237e59b1f570c5375c0",
    "isOnline": false,
    "energy": 75,
    "ethernetSpeed": null,
    "lastSeen": "2025-07-20T07:09:52.808Z",
    "createdAt": "2025-07-20T07:09:38.782Z",
    "browser": "Chrome 120.0",
    "os": "Android 13",
    "ip": "192.168.254.248",
    "location": null,
    "isTrusted": false,
    "notifications": 1,
    "linkedBankDetails": 0
  }
]
```

---

### 2. Get Device Details

**Endpoint:** `GET /api/trader/devices/{deviceId}`

**Description:** Get detailed information about a specific device including bank details and turnover.

**Headers:**
- `x-trader-token: {trader_session_token}`

**Response:** Similar to list response but with additional details.

---

### 3. Create Device

**Endpoint:** `POST /api/trader/devices`

**Description:** Create a new device for the trader.

**Headers:**
- `Content-Type: application/json`
- `x-trader-token: {trader_session_token}`

**Request Body:**
```json
{
  "name": "Test Device Android"    // Device name
}
```

**Success Response (201):**
```json
{
  "id": "cmdbc6r1a047tikhvsls0m2vb",
  "name": "Test Device Android",
  "token": "660d4ed289eb1975e43f01c5044ad1fcb69aab9b76480237e59b1f570c5375c0",
  "createdAt": "2025-07-20T07:09:38.782Z"
}
```

---

### 4. Delete Device

**Endpoint:** `DELETE /api/trader/devices/{deviceId}`

**Description:** Delete a device.

**Headers:**
- `x-trader-token: {trader_session_token}`

**Success Response (200):**
```json
{
  "success": true
}
```

---

### 5. Regenerate Device Token

**Endpoint:** `POST /api/trader/devices/{deviceId}/regenerate-token`

**Description:** Generate a new token for the device.

**Headers:**
- `x-trader-token: {trader_session_token}`

**Success Response (200):**
```json
{
  "token": "new_device_token_here"
}
```

---

### 6. Start Device

**Endpoint:** `PATCH /api/trader/devices/{deviceId}/start`

**Description:** Bring device online.

**Headers:**
- `x-trader-token: {trader_session_token}`

**Success Response (200):**
```json
{
  "success": true
}
```

---

### 7. Stop Device

**Endpoint:** `PATCH /api/trader/devices/{deviceId}/stop`

**Description:** Take device offline.

**Headers:**
- `x-trader-token: {trader_session_token}`

**Success Response (200):**
```json
{
  "success": true
}
```

---

### 8. Link Device to Bank Detail

**Endpoint:** `POST /api/trader/devices/link`

**Description:** Link a device to a bank detail.

**Headers:**
- `Content-Type: application/json`
- `x-trader-token: {trader_session_token}`

**Request Body:**
```json
{
  "deviceId": "cmdbc6r1a047tikhvsls0m2vb",
  "bankDetailId": "cmdac7otd10wdik9y8job005f"
}
```

**Success Response (200):**
```json
{
  "success": true
}
```

---

### 9. Unlink Device from Bank Detail

**Endpoint:** `POST /api/trader/devices/unlink`

**Description:** Unlink a device from a bank detail.

**Headers:**
- `Content-Type: application/json`
- `x-trader-token: {trader_session_token}`

**Request Body:**
```json
{
  "deviceId": "cmdbc6r1a047tikhvsls0m2vb",
  "bankDetailId": "cmdac7otd10wdik9y8job005f"
}
```

**Success Response (200):**
```json
{
  "success": true
}
```

---

### 10. Device Health Check

**Endpoint:** `POST /api/trader/devices/health-check`

**Description:** Submit device health information.

**Headers:**
- `Content-Type: application/json`
- `x-trader-token: {trader_session_token}`
- `x-device-token: {device_token}`

**Request Body:**
```json
{
  "batteryLevel": 80,
  "networkSpeed": 55.2,
  "userAgent": "Mozilla/5.0 (Linux; Android 14; Pixel 7)",
  "ip": "192.168.1.100",
  "location": "55.7558,37.6173"    // Latitude,Longitude as string
}
```

**Note:** This endpoint has implementation issues and may not work as expected.

---

## Admin Device Management API

Base URL: `http://localhost:3000/api/admin/devices`

These endpoints are used by administrators for device management.

### 1. List All Devices (Admin)

**Endpoint:** `GET /api/admin/devices`

**Description:** Get all devices with advanced filtering.

**Headers:**
- `x-admin-key: {admin_key}`

**Query Parameters:**
- `traderId` - Filter by trader ID
- `isOnline` - Filter by online status (true/false)
- `name` - Filter by device name
- `emulated` - Filter emulated devices (true/false)
- `startDate` - Start date for filtering
- `endDate` - End date for filtering
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 20)

---

### 2. Get Device Details (Admin)

**Endpoint:** `GET /api/admin/devices/{deviceId}`

**Headers:**
- `x-admin-key: {admin_key}`

---

### 3. Update Device Status (Admin)

**Endpoint:** `PUT /api/admin/devices/{deviceId}`

**Headers:**
- `Content-Type: application/json`
- `x-admin-key: {admin_key}`

**Request Body:**
```json
{
  "isOnline": true,
  "isTrusted": true
}
```

---

### 4. Delete Device (Admin)

**Endpoint:** `DELETE /api/admin/devices/{deviceId}`

**Headers:**
- `x-admin-key: {admin_key}`

---

### 5. Get Device Messages

**Endpoint:** `GET /api/admin/devices/{deviceId}/messages`

**Description:** Get all notifications/messages from a device.

**Headers:**
- `x-admin-key: {admin_key}`

---

### 6. Get Device Transactions

**Endpoint:** `GET /api/admin/devices/{deviceId}/transactions`

**Description:** Get all transactions processed by the device.

**Headers:**
- `x-admin-key: {admin_key}`

---

### 7. Update Device Connection

**Endpoint:** `PATCH /api/admin/devices/{deviceId}/connection`

**Headers:**
- `Content-Type: application/json`
- `x-admin-key: {admin_key}`

**Request Body:**
```json
{
  "isOnline": true
}
```

---

### 8. Update Device Trust Status

**Endpoint:** `PATCH /api/admin/devices/{deviceId}/trust`

**Headers:**
- `Content-Type: application/json`
- `x-admin-key: {admin_key}`

**Request Body:**
```json
{
  "isTrusted": true
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Error message describing what went wrong"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Authentication

### Device Authentication
- Devices use Bearer tokens in the `Authorization` header
- Token format: `Authorization: Bearer {device_token}`
- Tokens are 64-character hex strings

### Trader Authentication
- Traders use session tokens in the `x-trader-token` header
- Tokens are obtained through `/api/user/auth` endpoint

### Admin Authentication
- Admins use API keys in the `x-admin-key` header
- Admin keys are configured in the backend

## Best Practices

1. **Always validate device tokens** before performing operations
2. **Monitor device health** regularly using health check endpoints
3. **Handle offline devices gracefully** in your application logic
4. **Implement proper error handling** for all API calls
5. **Use HTTPS in production** to secure token transmission
6. **Rotate device tokens periodically** for security
7. **Log device activities** for debugging and security monitoring

## Notes

- Device tokens are generated using cryptographically secure random bytes
- Devices can only be linked to one bank detail at a time
- Device online/offline status is managed automatically based on activity
- The device emulator service can be used for testing purposes