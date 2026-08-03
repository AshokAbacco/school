// server/src/certificates/certificate.constants.js
//
// Single source of truth for certificate types, their display metadata, and
// which fields are editable at generation time (vs auto-filled from the
// Student record). Both the PDF generator and the frontend dashboard cards
// are driven off this list via GET /api/certificates/types.

export const ALL_CERTIFICATE_TYPES = [
  {
    key: "TRANSFER_CERTIFICATE",
    label: "Transfer Certificate",
    shortLabel: "TC",
    description:
      "Official record issued when a student leaves the school, following the traditional TC format.",
    icon: "FileOutput",
    editableFields: [
      "reasonForLeaving",
      "workingDays",
      "presentDays",
      "conduct",
      "remarks",
    ],
  },
  {
    key: "HALL_TICKET",
    label: "Hall Ticket",
    shortLabel: "Hall Ticket",
    description:
      "Modern, themeable examination admit card — subjects and timings pulled automatically from the Examination Module.",
    icon: "Ticket",
    editableFields: [
      "examCentre",
      "schoolCode",
      "hallTicketNumber",
      "instructions",
      "theme",
      "subjects", // auto-fetched from the Examination Module, not typed in
    ],
  },
  {
    key: "STUDY_CERTIFICATE",
    label: "Study Certificate",
    shortLabel: "Study Certificate",
    description: "Certifies the period of study of a student at the school.",
    icon: "BookOpen",
    editableFields: ["remarks"],
  },
  {
    key: "BONAFIDE_CERTIFICATE",
    label: "Bonafide Certificate",
    shortLabel: "Bonafide",
    description: "Certifies that the student is a genuine, currently enrolled student.",
    icon: "BadgeCheck",
    editableFields: ["remarks"],
  },
  {
    key: "CONDUCT_CERTIFICATE",
    label: "Conduct Certificate",
    shortLabel: "Conduct",
    description: "Certifies the conduct and behaviour of the student.",
    icon: "ShieldCheck",
    editableFields: ["conduct", "remarks"],
  },
  {
    key: "CHARACTER_CERTIFICATE",
    label: "Character Certificate",
    shortLabel: "Character",
    description: "Certifies the moral character of the student.",
    icon: "UserCheck",
    editableFields: ["conduct", "remarks"],
  },
  {
    key: "MIGRATION_CERTIFICATE",
    label: "Migration Certificate",
    shortLabel: "Migration",
    description: "Permits the student to seek admission in another institution/board.",
    icon: "ArrowRightLeft",
    editableFields: ["remarks"],
  },
];

// ── Active/exposed types ─────────────────────────────────────────────────────
// Only these show up on the dashboard, the type-selection step, the History
// filter dropdown, and pass validation when generating. Everything else
// above (Transfer, Bonafide, Conduct, Character, Migration) is fully built —
// controller/service/PDF template all still work — it's just not surfaced
// right now. To bring one back later, add its key to this array; no other
// code needs to change.
const ACTIVE_CERTIFICATE_TYPE_KEYS = ["HALL_TICKET", "STUDY_CERTIFICATE"];

export const CERTIFICATE_TYPES = ALL_CERTIFICATE_TYPES.filter((t) =>
  ACTIVE_CERTIFICATE_TYPE_KEYS.includes(t.key)
);

export const CERTIFICATE_TYPE_KEYS = CERTIFICATE_TYPES.map((t) => t.key);

export const getCertificateTypeMeta = (key) =>
  CERTIFICATE_TYPES.find((t) => t.key === key) || null;

// Prefix used for certificate numbers per type, e.g. SCH-TC-000001
export const CERTIFICATE_NUMBER_PREFIX = {
  TRANSFER_CERTIFICATE: "TC",
  HALL_TICKET: "HT",
  STUDY_CERTIFICATE: "SC",
  BONAFIDE_CERTIFICATE: "BC",
  CONDUCT_CERTIFICATE: "CC",
  CHARACTER_CERTIFICATE: "CH",
  MIGRATION_CERTIFICATE: "MC",
};

// ── Hall Ticket color themes ─────────────────────────────────────────────────
// Admin picks one of these before generating; only colors change, the layout
// stays identical. Only palettes with a fully specified color set are listed
// here — add more the same way once their exact colors are provided.
export const HALL_TICKET_THEMES = [
  {
    id: "GREEN",
    name: "Classic Green",
    primary: "#0B6E4F",
    secondary: "#1F8A70",
    accent: "#D4AF37",
    background: "#FFFFFF",
    text: "#1F2937",
    border: "#0B6E4F",
  },
  {
    id: "BLUE",
    name: "Blue Professional",
    primary: "#0A4D9E",
    secondary: "#2563EB",
    accent: "#60A5FA",
    background: "#FFFFFF",
    text: "#1F2937",
    border: "#0A4D9E",
  },
  {
    id: "RED",
    name: "Red Premium",
    primary: "#B91C1C",
    secondary: "#DC2626",
    accent: "#FCA5A5",
    background: "#FFFFFF",
    text: "#1F2937",
    border: "#B91C1C",
  },
  {
    id: "GRAY",
    name: "Gray Corporate",
    primary: "#374151",
    secondary: "#6B7280",
    accent: "#D1D5DB",
    background: "#FFFFFF",
    text: "#111827",
    border: "#374151",
  },
];

export const DEFAULT_HALL_TICKET_THEME = "GREEN";

export const getHallTicketTheme = (id) =>
  HALL_TICKET_THEMES.find((t) => t.id === id) || HALL_TICKET_THEMES[0];

export const DEFAULT_HALL_TICKET_INSTRUCTIONS = [
  "Candidates must bring this hall ticket to every examination.",
  "No candidate will be permitted to enter the examination hall without this hall ticket.",
  "Report to the exam centre at least 30 minutes before the reporting time.",
  "Mobile phones and electronic devices are strictly prohibited inside the exam hall.",
  "Candidates must occupy only the seat allotted to them.",
].join("\n");