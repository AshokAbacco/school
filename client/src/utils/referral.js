// src/utils/referral.js
//
// Centralizes how a referral code enters the app and how it's preserved
// through the payment flow.
//
// A referral code can reach the payment modal in two ways:
//   1. A `?ref=ABARC002` query param on the URL (referral link)
//   2. The user typing it directly into the "Referral Code" field
//
// Previously, only the URL value was ever sent to the backend — it was
// read fresh on every submit and always overwrote whatever the user had
// typed manually, and it was never persisted, so navigating away from the
// `?ref=` URL (or the query string being dropped anywhere along the way)
// before finishing checkout silently lost the code. This module fixes
// that by persisting the captured code to localStorage the moment it's
// seen, and by always letting manual entry take priority at submit time.

const STORAGE_KEY = "referralCode";

// Loose format check: letters/numbers only, reasonable length. Kept
// lenient since Abacco Tech can introduce new prefixes/lengths later —
// this only catches obviously-malformed input, it doesn't police the
// exact code format.
export const isValidReferralCodeFormat = (code) => {
  if (!code) return true; // empty is valid — referral code is optional
  return /^[A-Za-z0-9]{4,20}$/.test(code.trim());
};

export const getStoredReferralCode = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    // localStorage may be unavailable (privacy mode, SSR, etc.)
    return "";
  }
};

export const saveReferralCode = (code) => {
  try {
    if (code && code.trim()) {
      localStorage.setItem(STORAGE_KEY, code.trim().toUpperCase());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // non-fatal — persistence is a nice-to-have, not a hard requirement
  }
};

// Call when a page/modal that can receive `?ref=` mounts (or whenever its
// search params change). If a ref is present in the URL, it's normalized
// and persisted so it survives even if the query string disappears later.
// Returns the resolved code (from the URL, or otherwise from whatever was
// previously stored), or "" if there's none at all.
export const captureReferralCodeFromUrl = (searchParams) => {
  const fromUrl = searchParams?.get("ref");
  if (fromUrl && fromUrl.trim()) {
    const normalized = fromUrl.trim().toUpperCase();
    saveReferralCode(normalized);
    return normalized;
  }
  return getStoredReferralCode();
};

// Resolve the single referral code value to actually submit with the
// order. Manual form entry always wins over whatever was auto-captured;
// falls back to the captured/stored value only when the field is blank.
// Returns null (never "") when there's nothing to send.
export const resolveReferralCode = (formValue, capturedValue) => {
  const manual = (formValue || "").trim();
  if (manual) return manual.toUpperCase();

  const captured = (capturedValue || "").trim();
  return captured ? captured.toUpperCase() : null;
};