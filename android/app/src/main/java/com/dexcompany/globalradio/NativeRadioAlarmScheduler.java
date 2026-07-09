package com.dexcompany.globalradio;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import java.util.Calendar;

public final class NativeRadioAlarmScheduler {
    private static final String PREFS = "native_radio_alarm";
    private static final String KEY_ENABLED = "enabled";
    private static final String KEY_HOUR = "hour";
    private static final String KEY_MINUTE = "minute";
    private static final String KEY_URL = "url";
    private static final String KEY_TITLE = "title";
    private static final String KEY_SUBTITLE = "subtitle";
    private static final int REQUEST_CODE = 7103;

    private NativeRadioAlarmScheduler() {
    }

    public static boolean saveAndSchedule(Context context, int hour, int minute, String url, String title, String subtitle) {
        if (!canScheduleExactAlarms(context)) {
            cancel(context);
            return false;
        }

        SharedPreferences.Editor editor = prefs(context).edit();
        editor.putBoolean(KEY_ENABLED, true);
        editor.putInt(KEY_HOUR, hour);
        editor.putInt(KEY_MINUTE, minute);
        editor.putString(KEY_URL, url);
        editor.putString(KEY_TITLE, title);
        editor.putString(KEY_SUBTITLE, subtitle);
        editor.apply();

        boolean scheduled = scheduleStored(context);
        if (!scheduled) {
            cancel(context);
        }
        return scheduled;
    }

    public static boolean scheduleStored(Context context) {
        SharedPreferences preferences = prefs(context);
        if (!preferences.getBoolean(KEY_ENABLED, false)) {
            return false;
        }

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null || !canScheduleExactAlarms(context)) {
            return false;
        }

        long triggerAt = nextTriggerAt(preferences.getInt(KEY_HOUR, 7), preferences.getInt(KEY_MINUTE, 0));
        PendingIntent pendingIntent = alarmIntent(context);
        alarmManager.cancel(pendingIntent);
        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
        return true;
    }

    public static void cancel(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pendingIntent = alarmIntent(context);
        if (alarmManager != null) {
            alarmManager.cancel(pendingIntent);
        }
        prefs(context).edit().clear().apply();
    }

    public static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static boolean canScheduleExactAlarms(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return true;
        }

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        return alarmManager != null && alarmManager.canScheduleExactAlarms();
    }

    public static Intent exactAlarmSettingsIntent(Context context) {
        Intent intent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
        } else {
            intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return intent;
    }

    public static long nextTriggerAt(int hour, int minute) {
        Calendar calendar = Calendar.getInstance();
        calendar.set(Calendar.HOUR_OF_DAY, hour);
        calendar.set(Calendar.MINUTE, minute);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        if (calendar.getTimeInMillis() <= System.currentTimeMillis()) {
            calendar.add(Calendar.DAY_OF_YEAR, 1);
        }
        return calendar.getTimeInMillis();
    }

    private static PendingIntent alarmIntent(Context context) {
        Intent intent = new Intent(context, NativeRadioAlarmReceiver.class);
        return PendingIntent.getBroadcast(
            context,
            REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
