// server/src/vehicle/busAlertI18n.js  (NEW FILE)
// ═══════════════════════════════════════════════════════════════════════════════
// Bus alert texts in English, Hindi and Telugu.
// Parents pick their language in the app (Bus alerts → Language).
// Stop / bus names are inserted as entered by the school.
// Please have a native speaker review the Hindi and Telugu wording once.
// ═══════════════════════════════════════════════════════════════════════════════

export const ALERT_LANGUAGES = ["en", "hi", "te"];
export const DEFAULT_ALERT_LANG = ALERT_LANGUAGES.includes(
  process.env.BUS_ALERT_DEFAULT_LANG,
)
  ? process.env.BUS_ALERT_DEFAULT_LANG
  : "en";

const n = (m) => Math.max(1, Math.round(Number(m) || 1));

const T = {
  en: {
    in: (m) => (n(m) === 1 ? "in about 1 minute" : `in about ${n(m)} minutes`),
    away: (m) =>
      n(m) === 1 ? "about 1 minute away" : `about ${n(m)} minutes away`,
    TRIP_STARTED: {
      title: () => "School bus has started",
      message: (v) =>
        (v.session === "DROP"
          ? `The school bus ${v.bus} has left school for the evening drop.`
          : `The school bus ${v.bus} has started the morning pickup.`) +
        (v.mins != null ? ` It will reach ${v.stop} ${T.en.in(v.mins)}.` : ""),
    },
    STOP_DEPARTED: {
      title: (v) => `Bus left ${v.prev}`,
      message: (v) =>
        `The bus has left ${v.prev}.` +
        (v.mins != null ? ` It will reach ${v.stop} ${T.en.in(v.mins)}.` : ""),
    },
    NEXT_ARRIVED: {
      title: () => "Your stop is next",
      message: (v) =>
        `The bus has arrived at ${v.prev}. Your stop is next — please be at ${v.stop} on time.`,
    },
    NEXT_LEFT: {
      title: () => "Your stop is next",
      message: (v) =>
        `The bus has left ${v.prev}. Your stop is next${v.mins != null ? `, ${T.en.away(v.mins)}` : ""} — please be at ${v.stop} on time.`,
    },
    APPROACHING: {
      title: (v) => `Bus arriving in ${v.threshold} min`,
      message: (v) =>
        `The school bus will arrive at ${v.stop} ${T.en.in(v.mins)}.`,
    },
    ARRIVED: {
      title: () => "Bus is at your stop",
      message: (v) =>
        `The school bus has arrived at ${v.stop}. Please board now.`,
    },
    TEST: {
      title: () => "Test bus alert",
      message: (v) =>
        v.mins != null
          ? `Test alert: the school bus will arrive at ${v.stop} ${T.en.in(v.mins)}.`
          : `Test alert: bus alerts are working. You will be told when the bus starts and when it is near ${v.stop}.`,
    },
  },

  hi: {
    in: (m) => `लगभग ${n(m)} मिनट में`,
    away: (m) => `लगभग ${n(m)} मिनट दूर`,
    TRIP_STARTED: {
      title: () => "स्कूल बस निकल चुकी है",
      message: (v) =>
        (v.session === "DROP"
          ? `स्कूल बस ${v.bus} शाम की यात्रा के लिए स्कूल से निकल चुकी है।`
          : `स्कूल बस ${v.bus} सुबह की यात्रा के लिए निकल चुकी है।`) +
        (v.mins != null ? ` यह ${T.hi.in(v.mins)} ${v.stop} पहुँचेगी।` : ""),
    },
    STOP_DEPARTED: {
      title: (v) => `बस ${v.prev} से निकल गई`,
      message: (v) =>
        `बस ${v.prev} से निकल चुकी है।` +
        (v.mins != null ? ` यह ${T.hi.in(v.mins)} ${v.stop} पहुँचेगी।` : ""),
    },
    NEXT_ARRIVED: {
      title: () => "अगला स्टॉप आपका है",
      message: (v) =>
        `बस ${v.prev} पहुँच गई है। अगला स्टॉप आपका है — कृपया समय पर ${v.stop} पर पहुँचें।`,
    },
    NEXT_LEFT: {
      title: () => "अगला स्टॉप आपका है",
      message: (v) =>
        `बस ${v.prev} से निकल चुकी है। अगला स्टॉप आपका है${v.mins != null ? `, ${T.hi.away(v.mins)}` : ""} — कृपया समय पर ${v.stop} पर पहुँचें।`,
    },
    APPROACHING: {
      title: (v) => `बस ${v.threshold} मिनट में पहुँचेगी`,
      message: (v) => `स्कूल बस ${T.hi.in(v.mins)} ${v.stop} पहुँचेगी।`,
    },
    ARRIVED: {
      title: () => "बस आपके स्टॉप पर है",
      message: (v) =>
        `स्कूल बस ${v.stop} पर पहुँच गई है। कृपया अभी बस में चढ़ें।`,
    },
    TEST: {
      title: () => "टेस्ट बस अलर्ट",
      message: (v) =>
        v.mins != null
          ? `टेस्ट अलर्ट: स्कूल बस ${T.hi.in(v.mins)} ${v.stop} पहुँचेगी।`
          : `टेस्ट अलर्ट: बस अलर्ट काम कर रहे हैं। बस निकलने पर और ${v.stop} के पास पहुँचने पर आपको बताया जाएगा।`,
    },
  },

  te: {
    in: (m) => (n(m) === 1 ? "సుమారు 1 నిమిషంలో" : `సుమారు ${n(m)} నిమిషాల్లో`),
    away: (m) =>
      n(m) === 1
        ? "సుమారు 1 నిమిషం దూరంలో ఉంది"
        : `సుమారు ${n(m)} నిమిషాల దూరంలో ఉంది`,
    TRIP_STARTED: {
      title: () => "స్కూల్ బస్ బయలుదేరింది",
      message: (v) =>
        (v.session === "DROP"
          ? `స్కూల్ బస్ ${v.bus} సాయంత్రం ట్రిప్ కోసం స్కూల్ నుండి బయలుదేరింది.`
          : `స్కూల్ బస్ ${v.bus} ఉదయం ట్రిప్ ప్రారంభించింది.`) +
        (v.mins != null
          ? ` ఇది ${T.te.in(v.mins)} ${v.stop} చేరుకుంటుంది.`
          : ""),
    },
    STOP_DEPARTED: {
      title: (v) => `బస్ ${v.prev} నుండి బయలుదేరింది`,
      message: (v) =>
        `బస్ ${v.prev} నుండి బయలుదేరింది.` +
        (v.mins != null
          ? ` ఇది ${T.te.in(v.mins)} ${v.stop} చేరుకుంటుంది.`
          : ""),
    },
    NEXT_ARRIVED: {
      title: () => "తదుపరి స్టాప్ మీదే",
      message: (v) =>
        `బస్ ${v.prev} చేరుకుంది. తదుపరి స్టాప్ మీదే — దయచేసి సమయానికి ${v.stop} వద్ద ఉండండి.`,
    },
    NEXT_LEFT: {
      title: () => "తదుపరి స్టాప్ మీదే",
      message: (v) =>
        `బస్ ${v.prev} నుండి బయలుదేరింది. తదుపరి స్టాప్ మీదే${v.mins != null ? `, ${T.te.away(v.mins)}` : ""} — దయచేసి సమయానికి ${v.stop} వద్ద ఉండండి.`,
    },
    APPROACHING: {
      title: (v) => `బస్ ${v.threshold} నిమిషాల్లో వస్తుంది`,
      message: (v) => `స్కూల్ బస్ ${T.te.in(v.mins)} ${v.stop} చేరుకుంటుంది.`,
    },
    ARRIVED: {
      title: () => "బస్ మీ స్టాప్ వద్ద ఉంది",
      message: (v) =>
        `స్కూల్ బస్ ${v.stop} వద్దకు చేరుకుంది. దయచేసి ఇప్పుడే బస్ ఎక్కండి.`,
    },
    TEST: {
      title: () => "టెస్ట్ బస్ అలర్ట్",
      message: (v) =>
        v.mins != null
          ? `టెస్ట్ అలర్ట్: స్కూల్ బస్ ${T.te.in(v.mins)} ${v.stop} చేరుకుంటుంది.`
          : `టెస్ట్ అలర్ట్: బస్ అలర్ట్‌లు పని చేస్తున్నాయి. బస్ బయలుదేరినప్పుడు మరియు ${v.stop} దగ్గరకు వచ్చినప్పుడు మీకు తెలియజేస్తాము.`,
    },
  },
};

/**
 * @param key   TRIP_STARTED | STOP_DEPARTED | NEXT_ARRIVED | NEXT_LEFT | APPROACHING | ARRIVED | TEST
 * @param lang  en | hi | te
 * @param vars  { bus, stop, prev, mins, session, threshold }
 * @returns { title, message, messageEn, lang }
 */
export function alertText(key, lang, vars) {
  const l = ALERT_LANGUAGES.includes(lang) ? lang : DEFAULT_ALERT_LANG;
  const pack = T[l][key] || T.en[key];
  const en = T.en[key];
  return {
    lang: l,
    title: pack.title(vars),
    message: pack.message(vars),
    messageEn: en.message(vars), // fallback for phones without a Hindi/Telugu voice
  };
}
