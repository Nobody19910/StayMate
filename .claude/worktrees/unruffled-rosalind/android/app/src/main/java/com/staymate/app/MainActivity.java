package com.staymate.app;

import android.os.Bundle;
import android.view.Display;
import android.view.Window;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Enable high refresh rate (120Hz) on supported devices
        try {
            Window window = getWindow();
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                // Android 11+: set unlimited frame rate
                Display display = getDisplay();
                if (display != null) {
                    Display.Mode[] modes = display.getSupportedModes();
                    Display.Mode highestMode = null;
                    float highestRefresh = 0;
                    for (Display.Mode mode : modes) {
                        if (mode.getRefreshRate() > highestRefresh) {
                            highestRefresh = mode.getRefreshRate();
                            highestMode = mode;
                        }
                    }
                    if (highestMode != null) {
                        WindowManager.LayoutParams params = window.getAttributes();
                        params.preferredDisplayModeId = highestMode.getModeId();
                        window.setAttributes(params);
                    }
                }
            } else if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                // Android 6-10: set preferred refresh rate
                Display display = getWindowManager().getDefaultDisplay();
                Display.Mode[] modes = display.getSupportedModes();
                Display.Mode highestMode = null;
                float highestRefresh = 0;
                for (Display.Mode mode : modes) {
                    if (mode.getRefreshRate() > highestRefresh) {
                        highestRefresh = mode.getRefreshRate();
                        highestMode = mode;
                    }
                }
                if (highestMode != null) {
                    WindowManager.LayoutParams params = window.getAttributes();
                    params.preferredDisplayModeId = highestMode.getModeId();
                    window.setAttributes(params);
                }
            }
        } catch (Exception e) {
            // Silently fail on devices that don't support high refresh rate
        }
    }
}
