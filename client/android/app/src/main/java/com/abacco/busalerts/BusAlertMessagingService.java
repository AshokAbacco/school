// client/native/android/BusAlertMessagingService.java  (NEW FILE — copied into android/app/src/main/java/com/abacco/busalerts/ by scripts/build-foundation.js)
// ═══════════════════════════════════════════════════════════════════════════════
// Receives Firebase bus alerts on Android — also when the app is CLOSED — and
//   1. shows a notification ("School bus has started", "Your stop is next" …)
//   2. speaks the message aloud with the phone's text-to-speech, in the parent's
//      language (English / Hindi / Telugu). If the phone has no voice for that
//      language it speaks the English version instead.
//
// It extends the Capacitor push plugin's service, so the JS side
// (@capacitor/push-notifications) keeps working exactly as before.
// When the app is open on screen it does nothing extra — the app itself shows
// and speaks the alert.
//
// Registered in AndroidManifest.xml (see AndroidManifest.busalerts.xml).
// The package name here does NOT need to match your app id.
// ═══════════════════════════════════════════════════════════════════════════════
package com.abacco.busalerts;

import android.app.ActivityManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public class BusAlertMessagingService extends MessagingService {
    private static final String TAG = "BusAlerts";
    private static final String CHANNEL_ID = "bus_alerts";

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        super.onMessageReceived(message); // keep Capacitor JS events working

        Map<String, String> data = message.getData();
        if (data == null || !"bus_alert".equals(data.get("kind"))) return;
        if (isAppInForeground()) return; // the open app shows + speaks it itself

        String title = nonEmpty(data.get("title"), "School bus");
        String body = nonEmpty(data.get("message"), "");
        String bodyEn = nonEmpty(data.get("messageEn"), body);
        String lang = nonEmpty(data.get("lang"), "en");
        String alertId = nonEmpty(data.get("alertId"), String.valueOf(System.currentTimeMillis()));

        showNotification(title, body, alertId);
        if (!"0".equals(data.get("speak"))) speak(body, bodyEn, lang);
    }

    // ── Notification ───────────────────────────────────────────────────────────
    private void showNotification(String title, String body, String alertId) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "School bus alerts", NotificationManager.IMPORTANCE_HIGH);
                ch.setDescription("Bus started, your stop is next, bus arriving");
                ch.enableVibration(true);
                NotificationManager nm = getSystemService(NotificationManager.class);
                if (nm != null) nm.createNotificationChannel(ch);
            }
            Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (open != null) open.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
            PendingIntent pi = open != null ? PendingIntent.getActivity(this, 0, open, flags) : null;

            int icon = getResources().getIdentifier("ic_stat_bus", "drawable", getPackageName());
            if (icon == 0) icon = getApplicationInfo().icon;

            NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setSmallIcon(icon)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setCategory(NotificationCompat.CATEGORY_REMINDER)
                    .setAutoCancel(true);
            if (pi != null) b.setContentIntent(pi);

            NotificationManagerCompat nmc = NotificationManagerCompat.from(this);
            if (nmc.areNotificationsEnabled()) nmc.notify(alertId.hashCode(), b.build());
        } catch (Exception e) {
            Log.w(TAG, "notification failed", e);
        }
    }

    // ── Text-to-speech (waits until spoken, max 25 s) ────────────────────────
    private void speak(final String text, final String textEn, final String lang) {
        if (text == null || text.isEmpty()) return;
        final CountDownLatch done = new CountDownLatch(1);
        final TextToSpeech[] holder = new TextToSpeech[1];
        try {
            holder[0] = new TextToSpeech(getApplicationContext(), status -> {
                TextToSpeech tts = holder[0];
                if (status != TextToSpeech.SUCCESS || tts == null) {
                    done.countDown();
                    return;
                }
                Locale loc = "hi".equals(lang) ? new Locale("hi", "IN")
                        : "te".equals(lang) ? new Locale("te", "IN")
                        : new Locale("en", "IN");
                int r = tts.setLanguage(loc);
                String say = text;
                if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) {
                    tts.setLanguage(new Locale("en", "IN"));
                    say = textEn; // phone has no Hindi/Telugu voice → English
                }
                tts.setSpeechRate(0.95f);
                if (Build.VERSION.SDK_INT >= 21) {
                    tts.setAudioAttributes(new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_NOTIFICATION) // follows silent / vibrate mode
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build());
                }
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String id) { }
                    @Override public void onDone(String id) { done.countDown(); }
                    @Override public void onError(String id) { done.countDown(); }
                });
                Bundle params = new Bundle();
                tts.speak(say, TextToSpeech.QUEUE_ADD, params, "busalert");
            });
            done.await(25, TimeUnit.SECONDS);
        } catch (Exception e) {
            Log.w(TAG, "tts failed", e);
        } finally {
            if (holder[0] != null) {
                try { holder[0].shutdown(); } catch (Exception ignored) { }
            }
        }
    }

    private boolean isAppInForeground() {
        ActivityManager am = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        if (am == null) return false;
        List<ActivityManager.RunningAppProcessInfo> procs = am.getRunningAppProcesses();
        if (procs == null) return false;
        for (ActivityManager.RunningAppProcessInfo p : procs) {
            if (getPackageName().equals(p.processName)) {
                return p.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND;
            }
        }
        return false;
    }

    private static String nonEmpty(String v, String d) {
        return v == null || v.isEmpty() ? d : v;
    }
}