package com.abacco.schoolapp;

import android.content.pm.ApplicationInfo;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onStart() {
        super.onStart();

        if (getBridge() != null) {

            // Allow mixed content ONLY when the app is running
            // as a debuggable build.
            //
            // This allows local testing with:
            // http://10.0.2.2:5001
            //
            // Production/release builds will NOT enable this.
            boolean isDebuggable =
                    (getApplicationInfo().flags &
                    ApplicationInfo.FLAG_DEBUGGABLE) != 0;

            if (isDebuggable) {
                WebSettings webSettings =
                        getBridge().getWebView().getSettings();

                webSettings.setMixedContentMode(
                        WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                );
            }

            // Preserve existing microphone/camera permission handling
            getBridge().getWebView().setWebChromeClient(
                new WebChromeClient() {
                    @Override
                    public void onPermissionRequest(
                            PermissionRequest request) {
                        request.grant(request.getResources());
                    }
                }
            );
        }
    }
}