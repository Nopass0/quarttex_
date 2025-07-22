package ru.chasepay.mobile;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import ru.chasepay.mobile.services.DeviceMonitorService;

public class ChaseApplication extends Application {
    private static final String TAG = "ChaseApplication";
    public static final String CHANNEL_ID = "chase_service_channel";
    
    @Override
    public void onCreate() {
        super.onCreate();
        try {
            Log.d(TAG, "Application onCreate started");
            createNotificationChannel();
            // Отложим запуск сервиса, чтобы приложение могло полностью инициализироваться
            // startDeviceMonitorService();
            Log.d(TAG, "Application onCreate completed successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error in onCreate: " + e.getMessage(), e);
        }
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                CHANNEL_ID,
                "Chase Service Channel",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            serviceChannel.setDescription("Chase device monitoring service");
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }
    
    private void startDeviceMonitorService() {
        Intent intent = new Intent(this, DeviceMonitorService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent);
        } else {
            startService(intent);
        }
    }
}