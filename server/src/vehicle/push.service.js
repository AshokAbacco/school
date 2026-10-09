// server/src/vehicle/push.service.js  (NEW FILE)
// ═══════════════════════════════════════════════════════════════════════════════
// Firebase Cloud Messaging (FCM) — sends bus alerts to the parent's phone so
// they arrive (and are SPOKEN on Android) even when the app is closed.
//
// npm i firebase-admin
//
// .env (use ONE of the two options)
//   FIREBASE_SERVICE_ACCOUNT_BASE64=<base64 of the service-account JSON file>
// or
//   FIREBASE_PROJECT_ID=your-project-id
//   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@your-project-id.iam.gserviceaccount.com
//   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
//   PUSH_ENABLED=1            (set 0 to switch push off)
//
// Android gets a DATA-only, high-priority message → BusAlertMessagingService
// (native, in the app) shows the notification and speaks it with the phone's
// text-to-speech in the parent's language.
// iOS gets a normal notification (title + text + sound) — iOS does not allow a
// closed app to speak.
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from "../config/db.js";

const ENABLED = process.env.PUSH_ENABLED !== "0";
let messaging = null;
let initPromise = null;
let warned = false;

function credentialsFromEnv() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const json = JSON.parse(
      Buffer.from(
        process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
        "base64",
      ).toString("utf8"),
    );
    return {
      projectId: json.project_id,
      clientEmail: json.client_email,
      privateKey: json.private_key,
    };
  }
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }
  return null;
}

async function getMessaging() {
  if (!ENABLED) return null;
  if (messaging) return messaging;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const cred = credentialsFromEnv();
    if (!cred) {
      if (!warned)
        console.warn(
          "[push] Firebase not configured — push notifications are off (see push.service.js)",
        );
      warned = true;
      return null;
    }
    try {
      const admin = (await import("firebase-admin")).default;
      const app =
        admin.apps.find((a) => a?.name === "bus-alerts") ||
        admin.initializeApp(
          { credential: admin.credential.cert(cred) },
          "bus-alerts",
        );
      messaging = admin.messaging(app);
      console.log(`🔥 Firebase push ready (project ${cred.projectId})`);
      return messaging;
    } catch (e) {
      console.error(
        "[push] Firebase init failed:",
        e.message,
        "— run `npm i firebase-admin` and check the .env keys",
      );
      return null;
    } finally {
      initPromise = null;
    }
  })();
  return initPromise;
}

export const isPushConfigured = () => !!credentialsFromEnv() && ENABLED;

// ─────────────────────────────────────────────────────────────────────────────
// Device tokens
// ─────────────────────────────────────────────────────────────────────────────
export async function savePushToken({ parentId, token, platform, appVersion }) {
  if (!token || token.length < 20)
    throw { status: 400, message: "Invalid push token" };
  const plat = ["android", "ios", "web"].includes(platform)
    ? platform
    : "android";
  return prisma.parentPushToken.upsert({
    where: { token },
    create: { token, parentId, platform: plat, appVersion: appVersion || null },
    update: {
      parentId,
      platform: plat,
      appVersion: appVersion || null,
      lastSeenAt: new Date(),
    },
  });
}

export async function deletePushToken({ parentId, token }) {
  await prisma.parentPushToken.deleteMany({ where: { token, parentId } });
}

// ─────────────────────────────────────────────────────────────────────────────
// Send one alert to every phone of a parent
// alert: { id, type, title, message, messageEn, lang }
// ─────────────────────────────────────────────────────────────────────────────
export async function pushToParent(parentId, alert) {
  const m = await getMessaging();
  if (!m) return { sent: 0, skipped: "not-configured" };

  const tokens = await prisma.parentPushToken.findMany({
    where: { parentId },
    select: { token: true, platform: true },
  });
  if (!tokens.length) return { sent: 0, skipped: "no-devices" };

  const data = {
    kind: "bus_alert",
    alertId: String(alert.id || ""),
    type: String(alert.type || ""),
    title: String(alert.title || "School bus"),
    message: String(alert.message || ""),
    messageEn: String(alert.messageEn || alert.message || ""),
    lang: String(alert.lang || "en"),
    speak: "1",
  };

  const android = tokens
    .filter((t) => t.platform !== "ios")
    .map((t) => t.token);
  const ios = tokens.filter((t) => t.platform === "ios").map((t) => t.token);
  const bad = [];

  const run = async (list, extra) => {
    if (!list.length) return 0;
    const res = await m.sendEachForMulticast({ tokens: list, data, ...extra });
    res.responses.forEach((r, i) => {
      const code = r.error?.code || "";
      if (
        code.includes("registration-token-not-registered") ||
        code.includes("invalid-registration-token") ||
        code.includes("invalid-argument")
      )
        bad.push(list[i]);
      else if (r.error)
        console.warn("[push] send failed:", code || r.error.message);
    });
    return res.successCount;
  };

  let sent = 0;
  try {
    // Android: data-only + high priority → native service speaks it even if the app is closed
    sent += await run(android, {
      android: { priority: "high", ttl: 10 * 60 * 1000 },
    });
    // iOS: visible notification with sound (iOS can't speak from a closed app)
    sent += await run(ios, {
      apns: {
        headers: { "apns-priority": "10", "apns-push-type": "alert" },
        payload: {
          aps: {
            alert: { title: data.title, body: data.message },
            sound: "default",
          },
        },
      },
    });
  } catch (e) {
    console.error("[push] error:", e.message);
  }
  if (bad.length)
    await prisma.parentPushToken
      .deleteMany({ where: { token: { in: bad } } })
      .catch(() => {});
  return { sent, removed: bad.length };
}
