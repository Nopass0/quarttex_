package ru.akbars.mobile.api;

import ru.akbars.mobile.BuildConfig;

import okhttp3.OkHttpClient;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class ApiClient {
    private static Retrofit retrofit = null;
    
    public static Retrofit getInstance() {
        if (retrofit == null) {
            HttpLoggingInterceptor logging = new HttpLoggingInterceptor();
            logging.setLevel(BuildConfig.DEBUG ? 
                HttpLoggingInterceptor.Level.BODY : 
                HttpLoggingInterceptor.Level.NONE);
            
            OkHttpClient client = new OkHttpClient.Builder()
                .addInterceptor(logging)
                .build();
            
            retrofit = new Retrofit.Builder()
                .baseUrl(BuildConfig.BASE_URL + "/api/")
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build();
        }
        return retrofit;
    }
}