package com.dexcompany.globalradio;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.text.TextUtils;

import java.io.IOException;

public class NativeRadioService extends Service {
    public static final String ACTION_PLAY = "com.dexcompany.globalradio.PLAY";
    public static final String ACTION_PAUSE = "com.dexcompany.globalradio.PAUSE";
    public static final String ACTION_STOP = "com.dexcompany.globalradio.STOP";
    public static final String EXTRA_URL = "url";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_SUBTITLE = "subtitle";
    public static final String EXTRA_FROM_ALARM = "fromAlarm";

    private static final String CHANNEL_ID = "radio_playback";
    private static final int NOTIFICATION_ID = 8901;

    private static String status = "idle";
    private static String currentTitle = "";
    private static String currentSubtitle = "";
    private static String currentUrl = "";
    private MediaPlayer player;
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private AudioManager.OnAudioFocusChangeListener focusChangeListener;

    public static Intent playIntent(Context context, String url, String title, String subtitle, boolean fromAlarm) {
        Intent intent = new Intent(context, NativeRadioService.class);
        intent.setAction(ACTION_PLAY);
        intent.putExtra(EXTRA_URL, url);
        intent.putExtra(EXTRA_TITLE, title);
        intent.putExtra(EXTRA_SUBTITLE, subtitle);
        intent.putExtra(EXTRA_FROM_ALARM, fromAlarm);
        return intent;
    }

    public static String currentStatus() {
        return status;
    }

    public static String currentTitle() {
        return currentTitle;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;

        if (ACTION_PAUSE.equals(action)) {
            pausePlayback();
            return START_STICKY;
        }

        if (ACTION_STOP.equals(action)) {
            stopPlayback();
            stopSelf();
            return START_NOT_STICKY;
        }

        if (ACTION_PLAY.equals(action)) {
            String nextUrl = intent.getStringExtra(EXTRA_URL);
            String nextTitle = intent.getStringExtra(EXTRA_TITLE);
            String nextSubtitle = intent.getStringExtra(EXTRA_SUBTITLE);
            startPlayback(nextUrl, nextTitle, nextSubtitle);
            return START_STICKY;
        }

        return START_NOT_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        stopPlayback();
        super.onDestroy();
    }

    private void startPlayback(String url, String title, String subtitle) {
        if (!isHttpUrl(url)) {
            status = "error";
            startForeground(NOTIFICATION_ID, buildNotification(false, "Invalid stream URL"));
            return;
        }

        currentUrl = url;
        currentTitle = TextUtils.isEmpty(title) ? "Jigu Radio" : title;
        currentSubtitle = TextUtils.isEmpty(subtitle) ? "Radio stream" : subtitle;
        status = "loading";
        startForeground(NOTIFICATION_ID, buildNotification(false, "Connecting"));

        releasePlayer();

        if (!requestAudioFocus()) {
            status = "error";
            updateNotification("Audio focus unavailable");
            return;
        }

        MediaPlayer nextPlayer = new MediaPlayer();
        player = nextPlayer;
        nextPlayer.setAudioAttributes(new AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .build());
        nextPlayer.setOnPreparedListener(preparedPlayer -> {
            preparedPlayer.start();
            status = "playing";
            updateNotification(null);
        });
        nextPlayer.setOnErrorListener((failedPlayer, what, extra) -> {
            status = "error";
            updateNotification("Stream playback failed");
            releasePlayer();
            abandonAudioFocus();
            return true;
        });
        nextPlayer.setOnCompletionListener(completedPlayer -> {
            status = "idle";
            updateNotification("Stream ended");
            releasePlayer();
            abandonAudioFocus();
        });

        try {
            nextPlayer.setDataSource(this, Uri.parse(url));
            nextPlayer.prepareAsync();
        } catch (IOException | IllegalArgumentException | SecurityException exception) {
            status = "error";
            updateNotification("Stream playback failed");
            releasePlayer();
            abandonAudioFocus();
        }
    }

    private void pausePlayback() {
        if (player != null && player.isPlaying()) {
            player.pause();
        }
        status = "paused";
        updateNotification(null);
        abandonAudioFocus();
    }

    private void stopPlayback() {
        status = "idle";
        currentUrl = "";
        currentTitle = "";
        currentSubtitle = "";
        releasePlayer();
        abandonAudioFocus();
        stopForeground(true);
    }

    private void releasePlayer() {
        if (player == null) {
            return;
        }

        try {
            player.stop();
        } catch (IllegalStateException ignored) {
        }
        player.release();
        player = null;
    }

    private boolean requestAudioFocus() {
        if (audioManager == null) {
            return true;
        }

        focusChangeListener = focusChange -> {
            if (focusChange == AudioManager.AUDIOFOCUS_LOSS || focusChange == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
                pausePlayback();
            }
        };

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build())
                .setOnAudioFocusChangeListener(focusChangeListener)
                .build();
            return audioManager.requestAudioFocus(focusRequest) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        }

        return audioManager.requestAudioFocus(focusChangeListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN)
            == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
    }

    private void abandonAudioFocus() {
        if (audioManager == null) {
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && focusRequest != null) {
            audioManager.abandonAudioFocusRequest(focusRequest);
            focusRequest = null;
        } else if (focusChangeListener != null) {
            audioManager.abandonAudioFocus(focusChangeListener);
        }
        focusChangeListener = null;
    }

    private void updateNotification(String statusText) {
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.notify(NOTIFICATION_ID, buildNotification("playing".equals(status), statusText));
        }
    }

    private Notification buildNotification(boolean isPlaying, String statusText) {
        Intent contentIntent = new Intent(this, MainActivity.class);
        contentIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentPendingIntent = PendingIntent.getActivity(
            this,
            0,
            contentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent toggleIntent = new Intent(this, NativeRadioService.class);
        toggleIntent.setAction(isPlaying ? ACTION_PAUSE : ACTION_PLAY);
        if (!TextUtils.isEmpty(currentUrl)) {
            toggleIntent.putExtra(EXTRA_URL, currentUrl);
            toggleIntent.putExtra(EXTRA_TITLE, currentTitle);
            toggleIntent.putExtra(EXTRA_SUBTITLE, currentSubtitle);
        }
        PendingIntent togglePendingIntent = PendingIntent.getService(
            this,
            1,
            toggleIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent stopIntent = new Intent(this, NativeRadioService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPendingIntent = PendingIntent.getService(
            this,
            2,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(this, CHANNEL_ID)
            : new Notification.Builder(this);

        String contentText = TextUtils.isEmpty(statusText) ? currentSubtitle : statusText;
        return builder
            .setSmallIcon(getApplicationInfo().icon)
            .setContentTitle(TextUtils.isEmpty(currentTitle) ? "Jigu Radio" : currentTitle)
            .setContentText(contentText)
            .setContentIntent(contentPendingIntent)
            .setOngoing(isPlaying || "loading".equals(status))
            .setOnlyAlertOnce(true)
            .addAction(getApplicationInfo().icon, isPlaying ? "Pause" : "Play", togglePendingIntent)
            .addAction(getApplicationInfo().icon, "Stop", stopPendingIntent)
            .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Radio playback",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Persistent controls for radio playback.");
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.createNotificationChannel(channel);
        }
    }

    private boolean isHttpUrl(String url) {
        return !TextUtils.isEmpty(url) && (url.startsWith("https://") || url.startsWith("http://"));
    }
}
