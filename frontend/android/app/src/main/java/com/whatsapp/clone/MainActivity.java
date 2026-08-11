package com.whatsapp.clone;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Ensure full WebRTC Camera/Microphone stream permissions & robust FileChooser support across all Android OEM ROMs (Vivo, iQOO, Samsung, Xiaomi, Oppo, etc.)
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        try {
                            request.grant(request.getResources());
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    });
                }

                @Override
                public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                    try {
                        boolean handled = super.onShowFileChooser(webView, filePathCallback, fileChooserParams);
                        if (handled) {
                            return true;
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                    
                    // Direct intent fallback if OEM WebView (e.g. Funtouch OS / OriginOS) fails default handler
                    try {
                        Intent intent = fileChooserParams.createIntent();
                        intent.addCategory(Intent.CATEGORY_OPENABLE);
                        startActivityForResult(intent, 1001);
                        return true;
                    } catch (Exception e) {
                        if (filePathCallback != null) {
                            try {
                                filePathCallback.onReceiveValue(null);
                            } catch (Exception ignored) {}
                        }
                        return false;
                    }
                }
            });
        }
    }
}


