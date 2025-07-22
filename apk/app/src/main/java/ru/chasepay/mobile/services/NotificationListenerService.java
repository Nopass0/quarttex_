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
        deviceApi = ApiClient.getInstance().create(DeviceApi.class);
        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
    }
    
    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
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
        
        // Filter relevant notifications (banking apps)
        if (isRelevantNotification(packageName, title.toString(), content.toString())) {
            sendNotificationToServer(deviceToken, packageName, appName, 
                                   title.toString(), content.toString());
        }
    }
    
    private boolean isRelevantNotification(String packageName, String title, String content) {
        // Banking app package names
        String[] bankingApps = {
            "com.sberbank",
            "ru.sberbankmobile",
            "com.idamob.tinkoff",
            "ru.tinkoff",
            "ru.alfabank",
            "ru.vtb24",
            "com.rbs",
            "ru.rosbank",
            "ru.raiffeisen",
            "com.openbank",
            "ru.psbank"
        };
        
        for (String app : bankingApps) {
            if (packageName.contains(app)) {
                return true;
            }
        }
        
        // Also check for transaction keywords
        String combined = (title + " " + content).toLowerCase();
        String[] keywords = {
            "перевод", "поступление", "списание", "оплата", 
            "payment", "transfer", "transaction", "руб", "rub"
        };
        
        for (String keyword : keywords) {
            if (combined.contains(keyword)) {
                return true;
            }
        }
        
        return false;
    }
    
    private void sendNotificationToServer(String token, String packageName, 
                                        String appName, String title, String content) {
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
                }
            }
            
            @Override
            public void onFailure(Call<Void> call, Throwable t) {
                Log.e(TAG, "Error sending notification", t);
            }
        });
    }
    
    private String getAppName(String packageName) {
        try {
            return getPackageManager()
                .getApplicationLabel(getPackageManager()
                    .getApplicationInfo(packageName, 0))
                .toString();
        } catch (Exception e) {
            return packageName;
        }
    }
}