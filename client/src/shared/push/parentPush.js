// client/src/shared/push/parentPush.js  (NEW FILE)
// ═══════════════════════════════════════════════════════════════════════════════
// Capacitor app ↔ Firebase push for parents.
//   registerParentPush()   ask permission, get the FCM token, send it to the server
//   unregisterParentPush() call on logout so the phone stops getting alerts
//   speakNative(text, lang) native text-to-speech (WebView has no speech API)
//
// Needs (in the client project):
//   npm i @capacitor/push-notifications @capacitor-community/text-to-speech
//   npx cap sync android
// On the web (browser) these functions do nothing / fall back gracefully.
// ═══════════════════════════════════════════════════════════════════════════════

import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { API_URL, fetchJson, authHeaders } from "../liveTracking/liveTracking";

const BASE = `${API_URL}/api/parent/vehicle-tracking/push`;
const TOKEN_KEY = "parentPushToken";

export const isNativeApp = () => Capacitor.isNativePlatform();

let registering = null;

/** Safe to call many times (e.g. on every app start after login). */
export function registerParentPush() {
  if (!isNativeApp()) return Promise.resolve({ native: false });
  if (registering) return registering;
  registering = (async () => {
    try {
      let perm = await PushNotifications.checkPermissions();
      if (
        perm.receive === "prompt" ||
        perm.receive === "prompt-with-rationale"
      ) {
        perm = await PushNotifications.requestPermissions();
      }
      if (perm.receive !== "granted") return { native: true, granted: false };

      await PushNotifications.removeAllListeners();

      await PushNotifications.addListener("registration", async ({ value }) => {
        try {
          localStorage.setItem(TOKEN_KEY, value);
        } catch {
          /* ignore */
        }
        await fetchJson(`${BASE}/register`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            token: value,
            platform: Capacitor.getPlatform(),
          }),
        }).catch((e) => console.warn("[push] register failed:", e.message));
      });

      await PushNotifications.addListener("registrationError", (e) =>
        console.warn("[push] registration error:", e?.error || e),
      );

      // Parent tapped the notification → tell the app (open bus tracking)
      await PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (action) => {
          window.dispatchEvent(
            new CustomEvent("busAlertOpen", {
              detail: action?.notification?.data || {},
            }),
          );
        },
      );

      await PushNotifications.register();
      return { native: true, granted: true };
    } catch (e) {
      console.warn("[push] setup failed:", e.message);
      return { native: true, granted: false, error: e.message };
    } finally {
      registering = null;
    }
  })();
  return registering;
}

export async function unregisterParentPush() {
  if (!isNativeApp()) return;
  let token = null;
  try {
    token = localStorage.getItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
  if (token)
    await fetchJson(`${BASE}/unregister`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ token }),
    }).catch(() => {});
  await PushNotifications.removeAllListeners().catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// Native text-to-speech (queued). lang: en | hi | te
// ─────────────────────────────────────────────────────────────────────────────
const LOCALE = { en: "en-IN", hi: "hi-IN", te: "te-IN" };
let queue = Promise.resolve();

export function speakNative(
  text,
  lang = "en",
  { fallbackEn = null, interrupt = false } = {},
) {
  if (!text) return Promise.resolve();
  if (interrupt) {
    TextToSpeech.stop().catch(() => {});
    queue = Promise.resolve();
  }
  queue = queue.then(async () => {
    try {
      const locale = LOCALE[lang] || "en-IN";
      let supported = true;
      if (lang !== "en") {
        try {
          const r = await TextToSpeech.isLanguageSupported({ lang: locale });
          supported = r?.supported !== false;
        } catch {
          /* assume supported */
        }
      }
      if (supported)
        await TextToSpeech.speak({
          text,
          lang: locale,
          rate: 0.95,
          category: "playback",
        });
      else if (fallbackEn)
        await TextToSpeech.speak({
          text: fallbackEn,
          lang: "en-IN",
          rate: 0.95,
          category: "playback",
        });
    } catch (e) {
      console.warn("[tts]", e.message);
    }
  });
  return queue;
}
