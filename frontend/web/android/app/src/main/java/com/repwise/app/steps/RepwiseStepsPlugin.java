package com.repwise.app.steps;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.Calendar;
import java.util.Locale;

/**
 * Phone pedometer via TYPE_STEP_COUNTER (does not require Health Connect).
 * Cumulative-since-boot counter is baselined per local calendar day.
 */
@CapacitorPlugin(
    name = "RepwiseSteps",
    permissions = {
        @Permission(
            strings = { Manifest.permission.ACTIVITY_RECOGNITION },
            alias = "activityRecognition"
        )
    }
)
public class RepwiseStepsPlugin extends Plugin implements SensorEventListener {
    private static final String PREFS = "repwise.steps.v1";
    private static final String KEY_BASELINE = "baseline";
    private static final String KEY_DAY = "day";
    private static final String KEY_LAST = "last";

    private SensorManager sensorManager;
    private Sensor stepCounter;
    private PluginCall pendingPermissionCall;
    private Float latestBootSteps = null;

    @Override
    public void load() {
        Context ctx = getContext();
        sensorManager = (SensorManager) ctx.getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager != null) {
            stepCounter = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
            if (stepCounter != null) {
                sensorManager.registerListener(this, stepCounter, SensorManager.SENSOR_DELAY_NORMAL);
            }
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject out = new JSObject();
        boolean hasSensor = stepCounter != null;
        out.put("available", hasSensor);
        out.put("reason", hasSensor ? "ok" : "No step counter sensor on this device");
        call.resolve(out);
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        JSObject out = new JSObject();
        out.put("granted", hasActivityPermission());
        call.resolve(out);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            JSObject out = new JSObject();
            out.put("granted", true);
            call.resolve(out);
            return;
        }
        if (hasActivityPermission()) {
            JSObject out = new JSObject();
            out.put("granted", true);
            call.resolve(out);
            return;
        }
        pendingPermissionCall = call;
        requestPermissionForAlias("activityRecognition", call, "onActivityRecognitionResult");
    }

    @PermissionCallback
    private void onActivityRecognitionResult(PluginCall call) {
        PluginCall target = call != null ? call : pendingPermissionCall;
        pendingPermissionCall = null;
        if (target == null) {
            return;
        }
        JSObject out = new JSObject();
        out.put("granted", hasActivityPermission());
        target.resolve(out);
    }

    @PluginMethod
    public void getTodaySteps(PluginCall call) {
        if (stepCounter == null) {
            call.reject("No step counter sensor");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && !hasActivityPermission()) {
            call.reject("ACTIVITY_RECOGNITION permission not granted");
            return;
        }

        float bootSteps;
        if (latestBootSteps != null) {
            bootSteps = latestBootSteps;
        } else {
            // Sensor may not have delivered an event yet — report 0 for today.
            JSObject out = new JSObject();
            out.put("steps", 0);
            out.put("dayKey", todayKey());
            out.put("sourceLabel", "Phone");
            call.resolve(out);
            return;
        }

        SharedPreferences prefs = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String today = todayKey();
        String storedDay = prefs.getString(KEY_DAY, "");
        float baseline = prefs.getFloat(KEY_BASELINE, -1f);
        float last = prefs.getFloat(KEY_LAST, bootSteps);

        // Reboot: counter resets toward 0 — re-baseline.
        if (bootSteps + 50 < last) {
            baseline = bootSteps;
            prefs.edit()
                .putFloat(KEY_BASELINE, baseline)
                .putString(KEY_DAY, today)
                .putFloat(KEY_LAST, bootSteps)
                .apply();
        } else if (!today.equals(storedDay) || baseline < 0) {
            baseline = bootSteps;
            prefs.edit()
                .putFloat(KEY_BASELINE, baseline)
                .putString(KEY_DAY, today)
                .putFloat(KEY_LAST, bootSteps)
                .apply();
        } else {
            prefs.edit().putFloat(KEY_LAST, bootSteps).apply();
        }

        int todaySteps = Math.max(0, Math.round(bootSteps - baseline));
        JSObject out = new JSObject();
        out.put("steps", todaySteps);
        out.put("dayKey", today);
        out.put("sourceLabel", "Phone");
        call.resolve(out);
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event == null || event.sensor == null) {
            return;
        }
        if (event.sensor.getType() == Sensor.TYPE_STEP_COUNTER && event.values.length > 0) {
            latestBootSteps = event.values[0];
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        /* ignore */
    }

    private boolean hasActivityPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            return true;
        }
        return ContextCompat.checkSelfPermission(
            getContext(),
            Manifest.permission.ACTIVITY_RECOGNITION
        ) == PackageManager.PERMISSION_GRANTED;
    }

    private String todayKey() {
        Calendar cal = Calendar.getInstance();
        return String.format(
            Locale.US,
            "%04d-%02d-%02d",
            cal.get(Calendar.YEAR),
            cal.get(Calendar.MONTH) + 1,
            cal.get(Calendar.DAY_OF_MONTH)
        );
    }
}
