package ru.chasepay.mobile;

import android.Manifest;
import android.content.ComponentName;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.text.TextUtils;
import android.view.Menu;
import android.view.MenuItem;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import ru.chasepay.mobile.api.ApiClient;
import ru.chasepay.mobile.api.DeviceApi;
import ru.chasepay.mobile.databinding.ActivityMainBinding;
import ru.chasepay.mobile.models.ConnectRequest;
import ru.chasepay.mobile.models.ConnectResponse;
import ru.chasepay.mobile.models.PingResponse;
import ru.chasepay.mobile.utils.DeviceUtils;
import com.google.zxing.integration.android.IntentIntegrator;
import com.google.zxing.integration.android.IntentResult;
import com.karumi.dexter.Dexter;
import com.karumi.dexter.MultiplePermissionsReport;
import com.karumi.dexter.PermissionToken;
import com.karumi.dexter.listener.PermissionRequest;
import com.karumi.dexter.listener.multi.MultiplePermissionsListener;

import java.util.List;
import java.util.concurrent.TimeUnit;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class MainActivity extends AppCompatActivity {
    private ActivityMainBinding binding;
    private SharedPreferences prefs;
    private DeviceApi deviceApi;
    private Handler pingHandler;
    private Runnable pingRunnable;
    private static final String PREFS_NAME = "ChasePrefs";
    private static final String KEY_DEVICE_TOKEN = "device_token";
    private static final long PING_INTERVAL = TimeUnit.SECONDS.toMillis(5);
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            binding = ActivityMainBinding.inflate(getLayoutInflater());
            setContentView(binding.getRoot());
            
            prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            deviceApi = ApiClient.getInstance().create(DeviceApi.class);
            pingHandler = new Handler(Looper.getMainLooper());
            
            requestPermissions();
            setupUI();
            startPinging();
            checkNotificationAccess();
        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(this, "Error starting app: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }
    
    private void setupUI() {
        binding.scanButton.setOnClickListener(v -> startQRScanner());
        binding.manualButton.setOnClickListener(v -> showManualInput());
        
        // Update connection status
        updateConnectionStatus("Checking...", Color.GRAY);
    }
    
    private void requestPermissions() {
        Dexter.withActivity(this)
            .withPermissions(
                Manifest.permission.CAMERA,
                Manifest.permission.INTERNET,
                Manifest.permission.ACCESS_NETWORK_STATE,
                Manifest.permission.ACCESS_WIFI_STATE,
                Manifest.permission.POST_NOTIFICATIONS
            )
            .withListener(new MultiplePermissionsListener() {
                @Override
                public void onPermissionsChecked(MultiplePermissionsReport report) {
                    if (!report.areAllPermissionsGranted()) {
                        showPermissionError();
                    }
                }

                @Override
                public void onPermissionRationaleShouldBeShown(List<PermissionRequest> permissions, PermissionToken token) {
                    token.continuePermissionRequest();
                }
            })
            .check();
    }
    
    private void checkNotificationAccess() {
        ComponentName cn = new ComponentName(this, ru.chasepay.mobile.services.NotificationListenerService.class);
        String flat = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
        final boolean enabled = flat != null && flat.contains(cn.flattenToString());
        
        if (!enabled) {
            new AlertDialog.Builder(this)
                .setTitle("Notification Access Required")
                .setMessage("Chase needs notification access to monitor incoming transactions. Please enable it in settings.")
                .setPositiveButton("Open Settings", (dialog, which) -> {
                    startActivity(new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS"));
                })
                .setCancelable(false)
                .show();
        }
    }
    
    private void startQRScanner() {
        IntentIntegrator integrator = new IntentIntegrator(this);
        integrator.setDesiredBarcodeFormats(IntentIntegrator.QR_CODE);
        integrator.setPrompt("Scan device QR code");
        integrator.setCameraId(0);
        integrator.setBeepEnabled(true);
        integrator.setBarcodeImageEnabled(false);
        integrator.setOrientationLocked(true); // Фиксируем ориентацию
        integrator.initiateScan();
    }
    
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        IntentResult result = IntentIntegrator.parseActivityResult(requestCode, resultCode, data);
        if (result != null) {
            if (result.getContents() != null) {
                connectDevice(result.getContents());
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }
    
    private void showManualInput() {
        EditText input = new EditText(this);
        input.setHint("Enter device code");
        
        new AlertDialog.Builder(this)
            .setTitle("Manual Device Code")
            .setView(input)
            .setPositiveButton("Connect", (dialog, which) -> {
                String code = input.getText().toString().trim();
                if (!TextUtils.isEmpty(code)) {
                    connectDevice(code);
                }
            })
            .setNegativeButton("Cancel", null)
            .show();
    }
    
    private void connectDevice(String deviceCode) {
        binding.statusText.setText("Connecting...");
        binding.statusText.setTextColor(Color.YELLOW);
        
        // Parse device code - it might be JSON or plain token
        String actualToken = deviceCode.trim();
        try {
            // Try to parse as JSON first
            org.json.JSONObject json = new org.json.JSONObject(actualToken);
            if (json.has("token")) {
                actualToken = json.getString("token");
                Toast.makeText(this, "Parsed token from JSON", Toast.LENGTH_SHORT).show();
            }
        } catch (Exception e) {
            // Not JSON, use as-is
            Toast.makeText(this, "Using plain token", Toast.LENGTH_SHORT).show();
        }
        
        // Log the device code for debugging
        Toast.makeText(this, "Token: " + actualToken.substring(0, Math.min(actualToken.length(), 10)) + "...", Toast.LENGTH_SHORT).show();
        
        ConnectRequest request = new ConnectRequest();
        request.deviceCode = actualToken;
        request.batteryLevel = DeviceUtils.getBatteryLevel(this);
        request.networkInfo = DeviceUtils.getNetworkInfo(this);
        request.deviceModel = DeviceUtils.getDeviceModel();
        request.androidVersion = DeviceUtils.getAndroidVersion();
        try {
            request.appVersion = getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (Exception e) {
            request.appVersion = "1.0.0";
        }
        
        deviceApi.connect(request).enqueue(new Callback<ConnectResponse>() {
            @Override
            public void onResponse(Call<ConnectResponse> call, Response<ConnectResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    String token = response.body().token;
                    prefs.edit().putString(KEY_DEVICE_TOKEN, token).apply();
                    updateConnectionStatus("Connected", Color.GREEN);
                    Toast.makeText(MainActivity.this, "Device connected successfully", Toast.LENGTH_SHORT).show();
                } else {
                    updateConnectionStatus("Connection failed", Color.RED);
                    String errorMessage = "Invalid device code";
                    try {
                        if (response.errorBody() != null) {
                            errorMessage = response.errorBody().string();
                        }
                        errorMessage += " (Code: " + response.code() + ")";
                    } catch (Exception e) {
                        // Ignore
                    }
                    Toast.makeText(MainActivity.this, errorMessage, Toast.LENGTH_LONG).show();
                }
            }
            
            @Override
            public void onFailure(Call<ConnectResponse> call, Throwable t) {
                updateConnectionStatus("Connection error", Color.RED);
                Toast.makeText(MainActivity.this, "Connection error: " + t.getMessage(), Toast.LENGTH_LONG).show();
            }
        });
    }
    
    private void startPinging() {
        pingRunnable = new Runnable() {
            @Override
            public void run() {
                checkServerConnection();
                pingHandler.postDelayed(this, PING_INTERVAL);
            }
        };
        pingHandler.post(pingRunnable);
    }
    
    private void checkServerConnection() {
        deviceApi.ping().enqueue(new Callback<PingResponse>() {
            @Override
            public void onResponse(Call<PingResponse> call, Response<PingResponse> response) {
                if (response.isSuccessful()) {
                    String deviceToken = prefs.getString(KEY_DEVICE_TOKEN, null);
                    if (deviceToken != null) {
                        updateConnectionStatus("Connected", Color.GREEN);
                    } else {
                        updateConnectionStatus("Not registered", Color.YELLOW);
                    }
                } else {
                    updateConnectionStatus("Server unreachable", Color.RED);
                }
            }
            
            @Override
            public void onFailure(Call<PingResponse> call, Throwable t) {
                updateConnectionStatus("No connection", Color.RED);
            }
        });
    }
    
    private void updateConnectionStatus(String status, int color) {
        runOnUiThread(() -> {
            binding.statusText.setText("Status: " + status);
            binding.statusText.setTextColor(color);
        });
    }
    
    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.main_menu, menu);
        return true;
    }
    
    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        if (item.getItemId() == R.id.action_debug) {
            startActivity(new Intent(this, DebugActivity.class));
            return true;
        }
        return super.onOptionsItemSelected(item);
    }
    
    private void showPermissionError() {
        new AlertDialog.Builder(this)
            .setTitle("Permissions Required")
            .setMessage("Chase needs all permissions to function properly. Please grant all permissions.")
            .setPositiveButton("OK", (dialog, which) -> requestPermissions())
            .setCancelable(false)
            .show();
    }
    
    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (pingHandler != null && pingRunnable != null) {
            pingHandler.removeCallbacks(pingRunnable);
        }
    }
}