package com.abacco.schoolapp;

import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onStart() {
        super.onStart();

        if (getBridge() != null) {
            getBridge().getWebView().setWebChromeClient(
                new WebChromeClient() {
                    @Override
                    public void onPermissionRequest(PermissionRequest request) {
                        request.grant(request.getResources());
                    }
                }
            );
        }
    }
}