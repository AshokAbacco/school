// client/src/parent/components/BusAlerts.jsx  (UPDATED)
// ═══════════════════════════════════════════════════════════════════════════════
// Parent bus alerts — "bus has started", "bus left <stop>", "your stop is next",
// "arriving in 5 min", "bus is at your stop"
//
//   useBusAlerts()       list + live stream + voice + language + phone push
//   <BusAlertsPanel/>    card for the Bus tracking page
//   <BusAlertListener/>  invisible: mount once in the parent layout so alerts pop
//                        up and are spoken on EVERY parent page
//
// Language: English / हिन्दी / తెలుగు — chosen here, saved on the server, so the
//           server writes every alert (and phone push) in that language.
// Voice:    app (Capacitor) → native text-to-speech plugin
//           browser          → Web Speech API (needs one tap: the Voice switch)
// App closed: handled natively by Firebase push + BusAlertMessagingService.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Send,
  X,
  Languages,
} from "lucide-react";
import {
  API_URL,
  fetchJson,
  openLiveStream,
  authHeaders,
} from "../../shared/liveTracking/liveTracking";
import {
  isNativeApp,
  registerParentPush,
  speakNative,
} from "../../shared/push/parentPush";

const BASE = `${API_URL}/api/parent/vehicle-tracking/notifications`;
const VOICE_KEY = "busAlerts.voice";
const LANG_KEY = "busAlerts.lang";
const POLL_MS = 60 * 1000;

export const ALERT_LANGS = [
  {
    code: "en",
    label: "English",
    sample:
      "Voice alerts are on. You will hear when the school bus starts and when it is near your stop.",
  },
  {
    code: "hi",
    label: "हिन्दी",
    sample:
      "वॉइस अलर्ट चालू हैं। स्कूल बस निकलने पर और आपके स्टॉप के पास पहुँचने पर आपको बताया जाएगा।",
  },
  {
    code: "te",
    label: "తెలుగు",
    sample:
      "వాయిస్ అలర్ట్‌లు ఆన్ అయ్యాయి. స్కూల్ బస్ బయలుదేరినప్పుడు మరియు మీ స్టాప్ దగ్గరకు వచ్చినప్పుడు మీకు తెలియజేస్తాము.",
  },
];
const LOCALE = { en: "en-IN", hi: "hi-IN", te: "te-IN" };

const readPref = (k, d) => {
  try {
    const v = localStorage.getItem(k);
    return v == null ? d : v;
  } catch {
    return d;
  }
};
const writePref = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

/**
 * Speak a message in the given language. Messages are QUEUED, so
 * "bus left X" followed by "your stop is next" are both heard in order.
 */
export function speak(
  text,
  { lang = "en", interrupt = false, fallbackEn = null } = {},
) {
  if (!text) return;
  if (isNativeApp()) {
    speakNative(text, lang, { interrupt, fallbackEn });
    return;
  }
  try {
    if (!("speechSynthesis" in window)) return;
    if (interrupt) window.speechSynthesis.cancel();
    const locale = LOCALE[lang] || "en-IN";
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find((v) => v.lang === locale) ||
      voices.find((v) => v.lang?.startsWith(lang));
    const useText = !voice && lang !== "en" && fallbackEn ? fallbackEn : text;
    const u = new SpeechSynthesisUtterance(useText);
    u.lang = voice ? locale : useText === text ? locale : "en-IN";
    u.rate = 0.95;
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

function browserNotify(a) {
  try {
    if (isNativeApp()) return; // native push handles background on the app
    if (!("Notification" in window) || Notification.permission !== "granted")
      return;
    if (document.visibilityState === "visible") return;
    new Notification(a.title || "School bus", {
      body: a.message,
      tag: a.id,
      renotify: true,
    });
  } catch {
    /* ignore */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export function useBusAlerts({ onAlert, speakAlerts = true } = {}) {
  const [alerts, setAlerts] = useState([]);
  const [unread, setUnread] = useState(0);
  const [voice, setVoiceState] = useState(
    () => readPref(VOICE_KEY, "0") === "1",
  );
  const [lang, setLangState] = useState(() => readPref(LANG_KEY, "en"));
  const [pushConfigured, setPushConfigured] = useState(null);
  const [notifPermission, setNotifPermission] = useState(() =>
    typeof Notification === "undefined"
      ? "unsupported"
      : Notification.permission,
  );
  const [error, setError] = useState("");
  const seen = useRef(new Set());
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  const langRef = useRef(lang);
  langRef.current = lang;
  const onAlertRef = useRef(onAlert);
  onAlertRef.current = onAlert;

  // language from the server (source of truth) + phone push registration
  useEffect(() => {
    fetchJson(`${BASE}/settings`)
      .then((d) => {
        if (d.data?.language) {
          setLangState(d.data.language);
          writePref(LANG_KEY, d.data.language);
        }
        setPushConfigured(!!d.data?.pushConfigured);
      })
      .catch(() => {});
    registerParentPush();
  }, []);

  const load = useCallback(async () => {
    try {
      const d = await fetchJson(BASE);
      const list = d.data || [];
      list.forEach((a) => seen.current.add(a.id));
      setAlerts(list);
      setUnread(d.unread || 0);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // live = arrived over the stream right now → toast + voice
  // polled = caught up later (e.g. app resumed; the phone already spoke it) → list only
  const handleNew = useCallback(
    (a, { live = true } = {}) => {
      if (!a?.id || seen.current.has(a.id)) return;
      seen.current.add(a.id);
      setAlerts((prev) => [{ ...a, read: false }, ...prev].slice(0, 50));
      setUnread((n) => n + 1);
      if (!live) return;
      if (speakAlerts && voiceRef.current)
        speak(a.message, {
          lang: a.lang || langRef.current,
          fallbackEn: a.messageEn,
        });
      if (speakAlerts) browserNotify(a);
      onAlertRef.current?.(a);
    },
    [speakAlerts],
  );

  useEffect(() => {
    load();
    const id = setInterval(async () => {
      try {
        const d = await fetchJson(BASE);
        (d.data || [])
          .slice()
          .reverse()
          .forEach((a) => handleNew(a, { live: false }));
        setUnread(d.unread || 0);
      } catch {
        /* ignore */
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [load, handleNew]);

  useEffect(() => {
    const close = openLiveStream({
      url: `${BASE}/stream`,
      onEvent: (event, payload) => {
        if (event === "alert") handleNew(payload, { live: true });
      },
    });
    return close;
  }, [handleNew]);

  const setVoice = (on) => {
    setVoiceState(on);
    writePref(VOICE_KEY, on ? "1" : "0");
    if (on)
      speak(ALERT_LANGS.find((l) => l.code === langRef.current)?.sample, {
        lang: langRef.current,
        interrupt: true,
      });
    else if (!isNativeApp()) window.speechSynthesis?.cancel?.();
  };

  const setLang = async (code) => {
    setLangState(code);
    writePref(LANG_KEY, code);
    try {
      await fetchJson(`${BASE}/settings`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ language: code }),
      });
    } catch (e) {
      setError(e.message);
    }
    if (voiceRef.current)
      speak(ALERT_LANGS.find((l) => l.code === code)?.sample, {
        lang: code,
        interrupt: true,
      });
  };

  const enableBrowserNotifications = async () => {
    try {
      setNotifPermission(await Notification.requestPermission());
    } catch {
      /* ignore */
    }
  };

  const markRead = async () => {
    setUnread(0);
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    fetchJson(`${BASE}/read`, {
      method: "PATCH",
      headers: authHeaders(),
    }).catch(() => {});
  };

  const sendTest = async (studentId) => {
    const q = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
    await fetchJson(`${BASE}/test${q}`, {
      method: "POST",
      headers: authHeaders(),
    });
    setTimeout(load, 1500);
  };

  return {
    alerts,
    unread,
    voice,
    setVoice,
    lang,
    setLang,
    pushConfigured,
    notifPermission,
    enableBrowserNotifications,
    markRead,
    sendTest,
    error,
    reload: load,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
const TYPE_STYLE = {
  TRIP_STARTED: { bg: "#EEF2FF", color: "#3730A3", icon: "🚌" },
  STOP_DEPARTED: { bg: "#F5F3FF", color: "#5B21B6", icon: "➡️" },
  NEXT_IS_YOURS: { bg: "#FEF3C7", color: "#92400E", icon: "🔔" },
  APPROACHING: { bg: "#FFFBEB", color: "#92400E", icon: "⏱️" },
  ARRIVED: { bg: "#F0FDF4", color: "#166534", icon: "📍" },
  TEST: { bg: "#F3F4F6", color: "#374151", icon: "🔔" },
};

const timeAgo = (iso) => {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
};

export function BusAlertToast({ alert, onClose }) {
  useEffect(() => {
    if (!alert) return;
    const id = setTimeout(onClose, 12000);
    return () => clearTimeout(id);
  }, [alert, onClose]);
  if (!alert) return null;
  const st = TYPE_STYLE[alert.type] || TYPE_STYLE.TEST;
  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10000,
        width: "min(92vw, 440px)",
        background: "#fff",
        border: `2px solid ${st.color}`,
        borderRadius: 14,
        boxShadow: "0 12px 32px rgba(15,23,42,.25)",
        padding: "12px 14px",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        fontFamily: "system-ui,-apple-system,sans-serif",
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1 }}>{st.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: st.color }}>
          {alert.title}
        </div>
        <div
          style={{
            fontSize: 13.5,
            color: "#111827",
            marginTop: 2,
            lineHeight: 1.45,
          }}
        >
          {alert.message}
        </div>
      </div>
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          border: "none",
          background: "none",
          cursor: "pointer",
          color: "#6B7280",
          padding: 2,
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

/** Mount once in the parent layout → alerts pop up + speak on every page. */
export function BusAlertListener() {
  const [toast, setToast] = useState(null);
  useBusAlerts({ onAlert: setToast });
  return <BusAlertToast alert={toast} onClose={() => setToast(null)} />;
}

/**
 * Card for the Bus tracking page.
 * If <BusAlertListener/> is mounted in the parent layout, pass
 * listenerMounted so the alert isn't shown / spoken twice.
 */
export function BusAlertsPanel({ studentId = null, listenerMounted = false }) {
  const showToasts = !listenerMounted;
  const [toast, setToast] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState("");
  const a = useBusAlerts({
    onAlert: showToasts ? setToast : undefined,
    speakAlerts: showToasts,
  });

  const runTest = async () => {
    setTesting(true);
    setTestMsg("");
    try {
      await a.sendTest(studentId);
      setTestMsg(
        isNativeApp()
          ? "Test alert sent. Close the app and send another to hear it with the app closed."
          : "Test alert sent.",
      );
    } catch (e) {
      setTestMsg(e.message);
    } finally {
      setTesting(false);
    }
  };

  const chip = (on) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 11px",
    borderRadius: 99,
    border: `1.5px solid ${on ? "#4F46E5" : "#E5E7EB"}`,
    background: on ? "#EEF2FF" : "#fff",
    color: on ? "#4338CA" : "#374151",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
  });

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: 14,
        padding: "14px 16px",
      }}
    >
      {showToasts && (
        <BusAlertToast alert={toast} onClose={() => setToast(null)} />
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontWeight: 800,
            fontSize: 14.5,
          }}
        >
          {a.unread ? (
            <BellRing size={16} color="#DC2626" />
          ) : (
            <Bell size={16} color="#4F46E5" />
          )}{" "}
          Bus alerts
          {a.unread > 0 && (
            <span
              style={{
                background: "#DC2626",
                color: "#fff",
                borderRadius: 99,
                fontSize: 11,
                padding: "1px 7px",
              }}
            >
              {a.unread}
            </span>
          )}
        </div>
        {a.unread > 0 && (
          <button
            onClick={a.markRead}
            style={{
              border: "none",
              background: "none",
              color: "#4F46E5",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Language */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <Languages size={14} color="#6B7280" aria-hidden />
        {ALERT_LANGS.map((l) => (
          <button
            key={l.code}
            onClick={() => a.setLang(l.code)}
            style={chip(a.lang === l.code)}
            aria-pressed={a.lang === l.code}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div
        style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}
      >
        <button
          onClick={() => a.setVoice(!a.voice)}
          style={chip(a.voice)}
          aria-pressed={a.voice}
        >
          {a.voice ? <Volume2 size={13} /> : <VolumeX size={13} />} Voice alerts{" "}
          {a.voice ? "on" : "off"}
        </button>
        {!isNativeApp() && a.notifPermission === "default" && (
          <button onClick={a.enableBrowserNotifications} style={chip(false)}>
            <Bell size={13} /> Allow notifications
          </button>
        )}
        <button onClick={runTest} disabled={testing} style={chip(false)}>
          <Send size={13} /> {testing ? "Sending…" : "Send test alert"}
        </button>
      </div>
      {isNativeApp() && a.pushConfigured === false && (
        <div style={{ fontSize: 11.5, color: "#B45309", marginBottom: 8 }}>
          Alerts with the app closed are not set up on the server yet
          (Firebase).
        </div>
      )}
      {testMsg && (
        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>
          {testMsg}
        </div>
      )}
      {a.error && (
        <div style={{ fontSize: 12, color: "#B91C1C", marginBottom: 8 }}>
          {a.error}
        </div>
      )}

      {a.alerts.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "#9CA3AF" }}>
          No alerts yet. You'll be told when the bus starts, as it leaves each
          stop before yours, when your stop is next, and when it's 10, 5 and 2
          minutes away.
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {a.alerts.slice(0, 12).map((n) => {
            const st = TYPE_STYLE[n.type] || TYPE_STYLE.TEST;
            return (
              <div
                key={n.id}
                style={{
                  display: "flex",
                  gap: 8,
                  background: st.bg,
                  borderRadius: 10,
                  padding: "8px 10px",
                  opacity: n.read ? 0.75 : 1,
                }}
              >
                <span style={{ fontSize: 16 }}>{st.icon}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{ fontSize: 12.5, fontWeight: 700, color: st.color }}
                  >
                    {n.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: "#111827",
                      lineHeight: 1.4,
                    }}
                  >
                    {n.message}
                  </div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                    {timeAgo(n.createdAt)}
                  </div>
                </div>
                <button
                  onClick={() =>
                    speak(n.message, {
                      lang: n.lang || a.lang,
                      interrupt: true,
                    })
                  }
                  aria-label="Play"
                  title="Play"
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: st.color,
                    padding: 2,
                    alignSelf: "flex-start",
                  }}
                >
                  <Volume2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default BusAlertsPanel;
