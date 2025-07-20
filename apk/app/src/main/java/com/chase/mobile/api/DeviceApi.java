package com.chase.mobile.api;

import com.chase.mobile.models.AppVersion;
import com.chase.mobile.models.ConnectRequest;
import com.chase.mobile.models.ConnectResponse;
import com.chase.mobile.models.DeviceInfoRequest;
import com.chase.mobile.models.NotificationRequest;
import com.chase.mobile.models.PingResponse;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.Header;
import retrofit2.http.POST;

public interface DeviceApi {
    @GET("device/ping")
    Call<PingResponse> ping();
    
    @POST("device/connect")
    Call<ConnectResponse> connect(@Body ConnectRequest request);
    
    @POST("device/info/update")
    Call<Void> updateInfo(@Header("Authorization") String token, 
                         @Body DeviceInfoRequest request);
    
    @POST("device/notification")
    Call<Void> sendNotification(@Header("Authorization") String token,
                               @Body NotificationRequest request);
    
    @GET("app/version")
    Call<AppVersion> getLatestVersion();
}