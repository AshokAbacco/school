// client/src/admin/pages/certificates/components/theme.js
// Shared color palette + small helpers for the Certificates module, matching
// the palette already used across admin/pages/* (students, holidays, etc).

export const C = {
  slate: "#6A89A7",
  mist: "#BDDDFC",
  sky: "#88BDF2",
  deep: "#384959",
  bg: "#EDF3FA",
  white: "#FFFFFF",
  border: "#C8DCF0",
  borderLight: "#DDE9F5",
  text: "#243340",
  textLight: "#6A89A7",
  danger: "#BE123C",
  success: "#15803D",
};

export const API_URL = import.meta.env.VITE_API_URL;

export const fmtDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// Hall Ticket color themes — mirrors HALL_TICKET_THEMES in the backend's
// certificate.constants.js (kept in sync manually; client/server aren't
// sharing a module here). Only the fields the mock preview needs.
export const HALL_TICKET_THEMES = [
  { id: "GREEN", name: "Classic Green", primary: "#0B6E4F", secondary: "#1F8A70", accent: "#D4AF37" },
  { id: "BLUE", name: "Blue Professional", primary: "#0A4D9E", secondary: "#2563EB", accent: "#60A5FA" },
  { id: "RED", name: "Red Premium", primary: "#B91C1C", secondary: "#DC2626", accent: "#FCA5A5" },
  { id: "GRAY", name: "Gray Corporate", primary: "#374151", secondary: "#6B7280", accent: "#D1D5DB" },
];

export const getHallTicketTheme = (id) =>
  HALL_TICKET_THEMES.find((t) => t.id === id) || HALL_TICKET_THEMES[0];

export const DEFAULT_HALL_TICKET_INSTRUCTIONS = [
  "Candidates must bring this hall ticket to every examination.",
  "No candidate will be permitted to enter the examination hall without this hall ticket.",
].join("\n");