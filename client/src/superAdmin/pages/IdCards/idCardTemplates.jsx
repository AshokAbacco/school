// client/src/superAdmin/pages/IdCards/idCardTemplates.js
// ─────────────────────────────────────────────────────────────────────────────
// All ID card template renderers live here.
// Each template is a React component that accepts:
//   { theme: { primary, accent }, logo, student }
// student shape:
//   { name, admissionNo, class, fatherName, busNo, bloodGroup, contactNo }
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { User, BookOpen, Hash, Users, Bus, Droplets, Phone } from "lucide-react";

// ── Responsive card wrapper ───────────────────────────────────────────────────
// Keeps the card at its natural pixel size internally (so design stays perfect)
// but scales it down proportionally on small screens using CSS scale().
// cardWidth: the natural pixel width of the card (280 for portrait, 380 for landscape)
export function ResponsiveCard({ cardWidth = 280, children }) {
  return (
    <div style={{ width: "100%", maxWidth: cardWidth, margin: "0 auto" }}>
      <div
        style={{
          width: cardWidth,
          transformOrigin: "top left",
          // Scale = container width / card natural width
          // We use a CSS custom property trick via inline style + clamp
        }}
        className="id-card-scaler"
      >
        {children}
      </div>
      <style>{`
        .id-card-scaler {
          transform: scale(1);
        }
        @media (max-width: 320px) {
          .id-card-scaler {
            transform: scale(0.78);
            transform-origin: top left;
            margin-bottom: calc((${cardWidth}px * -0.22));
          }
        }
        @media (min-width: 321px) and (max-width: 399px) {
          .id-card-scaler {
            transform: scale(0.88);
            transform-origin: top left;
            margin-bottom: calc((${cardWidth}px * -0.12));
          }
        }
      `}</style>
    </div>
  );
}

// ── Sample data (used in previews) ───────────────────────────────────────────
export const SAMPLE_STUDENT = {
  name:        "Aaliya Fathima",
  admissionNo: "ADM-2024-042",
  class:       "Grade 7 — Section A",
  fatherName:  "Mr. Mohammed Aslam",
  busNo:       "07",
  bloodGroup:  "B+",
  contactNo:   "9876543210",
};

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 1 — Classic Vertical
// Traditional portrait card: colored header with logo, photo, name ribbon,
// detail rows, colored footer.
// ─────────────────────────────────────────────────────────────────────────────
export function ClassicVerticalCard({ theme, logo, student = SAMPLE_STUDENT }) {
  const { primary, accent } = theme;
  const accentLight = accent + "55";
  const s = { ...SAMPLE_STUDENT, ...student };

  return (
    <div style={{
      width: "100%", maxWidth: 280, minHeight: 460, background: "white",
      borderRadius: 16, border: `2px solid ${primary}`,
      fontFamily: "sans-serif", overflow: "hidden",
      display: "flex", flexDirection: "column", position: "relative",
    }}>
      {/* Lanyard hole */}
      <div style={{
        width: 38, height: 13, background: "#e5e7eb",
        borderRadius: "0 0 8px 8px", position: "absolute",
        top: 0, left: "50%", transform: "translateX(-50%)", zIndex: 10,
        border: `1px solid ${primary}33`,
      }} />

      {/* Header */}
      <div style={{
        background: primary, minHeight: 105,
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: 32, paddingBottom: 16, paddingLeft: 16, paddingRight: 16,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -20, left: -40, width: 110, height: 150,
          background: accentLight, transform: "rotate(30deg)", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", top: -20, right: -40, width: 110, height: 150,
          background: accentLight, transform: "rotate(-30deg)", pointerEvents: "none",
        }} />
        <div style={{
          width: 68, height: 68, borderRadius: "50%", background: "white",
          border: `3px solid ${accent}`, overflow: "hidden", position: "relative", zIndex: 1,
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8,
        }}>
          {logo
            ? <img src={logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6 }} />
            : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: primary }}>
                <BookOpen size={22} />
                <span style={{ fontSize: 7, fontWeight: 700, marginTop: 2 }}>LOGO</span>
              </div>}
        </div>
      </div>

      {/* School name */}
      <div style={{
        background: "white", borderBottom: `2px solid ${accent}`,
        textAlign: "center", padding: "8px 12px",
      }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: primary, letterSpacing: 1, textTransform: "uppercase", margin: 0, lineHeight: 1.2 }}>
          School Name
        </p>
        <p style={{ fontSize: 8, color: accent, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", margin: 0 }}>
          Location
        </p>
      </div>

      {/* Photo */}
      <div style={{ display: "flex", justifyContent: "center", padding: "12px 16px 8px" }}>
        <div style={{
          width: 80, height: 100, borderRadius: 8,
          border: `2px solid ${accent}`, background: "#f3f4f6",
          overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {s.photo
            ? <img src={s.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <User size={36} color="#9ca3af" />}
        </div>
      </div>

      {/* Name ribbon */}
      <div style={{
        background: accent, margin: "0 16px 8px",
        borderRadius: 8, padding: "6px 16px", textAlign: "center",
      }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: "white", textTransform: "uppercase", letterSpacing: 0.5, margin: 0 }}>
          {s.name}
        </p>
      </div>

      {/* Details */}
      <div style={{ flex: 1, padding: "0 16px 8px" }}>
        {[
          { icon: Hash,     label: "Admission No.", value: s.admissionNo },
          { icon: BookOpen, label: "Class",         value: s.class },
          { icon: Users,    label: "Father's Name", value: s.fatherName },
          { icon: Bus,      label: "Bus No.",        value: s.busNo },
          { icon: Droplets, label: "Blood Group",   value: s.bloodGroup },
          { icon: Phone,    label: "Contact No.",   value: s.contactNo },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Icon size={10} style={{ color: primary, flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: "#6b7280", minWidth: 72 }}>{label}</span>
            <span style={{ fontSize: 9, color: "#111827", fontWeight: 600 }}>: {value}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ background: primary, padding: "8px 16px", textAlign: "center" }}>
        <p style={{ fontSize: 9, fontWeight: 800, color: accent, letterSpacing: 2, textTransform: "uppercase", margin: 0 }}>
          Student ID Card
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 2 — Horizontal Split
// Landscape card: left colored panel with logo + photo, right white panel
// with name, details and footer stripe.
// ─────────────────────────────────────────────────────────────────────────────
export function HorizontalSplitCard({ theme, logo, student = SAMPLE_STUDENT }) {
  const { primary, accent } = theme;
  const s = { ...SAMPLE_STUDENT, ...student };

  return (
    <div style={{
      width: "100%", maxWidth: 380, height: "auto", minHeight: 200, background: "white",
      borderRadius: 14, border: `2px solid ${primary}`,
      fontFamily: "sans-serif", overflow: "hidden",
      display: "flex", flexDirection: "row",
    }}>
      {/* Left panel */}
      <div style={{
        width: 120, background: primary,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "16px 8px", gap: 10,
      }}>
        {/* Logo */}
        <div style={{
          width: 52, height: 52, borderRadius: "50%", background: "white",
          border: `2.5px solid ${accent}`, overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {logo
            ? <img src={logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} />
            : <BookOpen size={18} color={primary} />}
        </div>

        {/* Photo */}
        <div style={{
          width: 72, height: 88, borderRadius: 8,
          border: `2px solid ${accent}`, background: "#f3f4f6",
          overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {s.photo
            ? <img src={s.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <User size={28} color="#9ca3af" />}
        </div>

        {/* School abbr */}
        <p style={{ fontSize: 7, color: accent, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", textAlign: "center", margin: 0 }}>
          School Name
        </p>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Top accent bar */}
        <div style={{ background: accent, height: 6 }} />

        {/* Content */}
        <div style={{ flex: 1, padding: "10px 14px" }}>
          {/* Name */}
          <p style={{ fontSize: 13, fontWeight: 800, color: primary, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 2px" }}>
            {s.name}
          </p>
          <p style={{ fontSize: 8, color: accent, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 8px" }}>
            Student ID Card
          </p>

          {/* Details grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 8px" }}>
            {[
              { label: "Admission No", value: s.admissionNo },
              { label: "Class",        value: s.class },
              { label: "Father",       value: s.fatherName },
              { label: "Bus No.",       value: s.busNo },
              { label: "Blood Group",  value: s.bloodGroup },
              { label: "Contact",      value: s.contactNo },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ fontSize: 7, color: "#9ca3af", margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</p>
                <p style={{ fontSize: 8, color: "#111827", fontWeight: 700, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stripe */}
        <div style={{
          background: primary, padding: "4px 14px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 7, color: accent, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
            Academic Year 2024–25
          </span>
          <span style={{ fontSize: 7, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>
            {s.admissionNo}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 3 — Minimal Modern
// Clean portrait card: thin top accent bar, circular photo, minimal
// typography, no heavy header block. Elegant and simple.
// ─────────────────────────────────────────────────────────────────────────────
export function MinimalModernCard({ theme, logo, student = SAMPLE_STUDENT }) {
  const { primary, accent } = theme;
  const s = { ...SAMPLE_STUDENT, ...student };

  return (
    <div style={{
      width: "100%", maxWidth: 260, minHeight: 400, background: "white",
      borderRadius: 16, border: `1.5px solid #e5e7eb`,
      fontFamily: "sans-serif", overflow: "hidden",
      display: "flex", flexDirection: "column",
      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    }}>
      {/* Top accent bar */}
      <div style={{ background: accent, height: 6 }} />

      {/* Header row: logo + school name */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 16px 8px", borderBottom: `1px solid #f3f4f6`,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: primary,
          overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {logo
            ? <img src={logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 3 }} />
            : <BookOpen size={14} color="white" />}
        </div>
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, color: primary, margin: 0, letterSpacing: 0.5, textTransform: "uppercase" }}>
            School Name
          </p>
          <p style={{ fontSize: 7, color: "#9ca3af", margin: 0, letterSpacing: 0.5 }}>Location</p>
        </div>
      </div>

      {/* Photo — circular */}
      <div style={{ display: "flex", justifyContent: "center", padding: "16px 0 8px" }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          border: `3px solid ${accent}`, background: "#f3f4f6",
          overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {s.photo
            ? <img src={s.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <User size={32} color="#9ca3af" />}
        </div>
      </div>

      {/* Name + class */}
      <div style={{ textAlign: "center", padding: "0 16px 12px" }}>
        <p style={{ fontSize: 14, fontWeight: 800, color: primary, margin: "0 0 2px", letterSpacing: 0.3 }}>
          {s.name}
        </p>
        <p style={{ fontSize: 9, color: accent, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>
          {s.class}
        </p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#f3f4f6", margin: "0 16px" }} />

      {/* Details — pill style */}
      <div style={{ flex: 1, padding: "10px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          { label: "Admission No.", value: s.admissionNo },
          { label: "Father's Name", value: s.fatherName },
          { label: "Bus No.",        value: s.busNo },
          { label: "Blood Group",   value: s.bloodGroup },
          { label: "Contact No.",   value: s.contactNo },
        ].map(({ label, value }) => (
          <div key={label} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#f9fafb", borderRadius: 6, padding: "4px 8px",
          }}>
            <span style={{ fontSize: 8, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
            <span style={{ fontSize: 9, color: primary, fontWeight: 700 }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        background: primary, padding: "6px 16px",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 8, color: accent, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>
          Student ID Card
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 4 — Royal South Indian
// Very common in South Indian schools — dark header with ornate logo circle,
// diagonal shine lines, photo in bordered frame, details with dot separators,
// gold/accent watermark crest in background body.
// ─────────────────────────────────────────────────────────────────────────────
export function RoyalSouthIndianCard({ theme, logo, student = SAMPLE_STUDENT }) {
  const { primary, accent } = theme;
  const s = { ...SAMPLE_STUDENT, ...student };

  return (
    <div style={{
      width: "100%", maxWidth: 280, minHeight: 480, background: "white",
      borderRadius: 14, overflow: "hidden", fontFamily: "sans-serif",
      border: `3px solid ${primary}`, display: "flex", flexDirection: "column",
      position: "relative",
    }}>
      {/* Lanyard */}
      <div style={{
        width: 36, height: 12, background: "#d1d5db", borderRadius: "0 0 6px 6px",
        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", zIndex: 10,
      }} />

      {/* Header with shine */}
      <div style={{
        background: primary, paddingTop: 28, paddingBottom: 12,
        display: "flex", flexDirection: "column", alignItems: "center",
        position: "relative", overflow: "hidden",
      }}>
        {/* Shine diagonal */}
        <div style={{
          position: "absolute", top: -10, left: "30%", width: 30, height: 200,
          background: "rgba(255,255,255,0.08)", transform: "rotate(20deg)",
        }} />
        <div style={{
          position: "absolute", top: -10, left: "45%", width: 15, height: 200,
          background: "rgba(255,255,255,0.05)", transform: "rotate(20deg)",
        }} />

        {/* Logo with double ring */}
        <div style={{ position: "relative", zIndex: 1, marginBottom: 6 }}>
          <div style={{
            width: 74, height: 74, borderRadius: "50%",
            border: `3px solid ${accent}`,
            padding: 3, background: "white", overflow: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: "100%", height: "100%", borderRadius: "50%",
              border: `2px solid ${accent}55`,
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
            }}>
              {logo
                ? <img src={logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} />
                : <BookOpen size={24} color={primary} />}
            </div>
          </div>
        </div>

        {/* School name */}
        <p style={{ fontSize: 11, fontWeight: 900, color: "white", letterSpacing: 1.5, textTransform: "uppercase", textAlign: "center", margin: "0 8px 1px", lineHeight: 1.2 }}>
          School Name
        </p>
        <p style={{ fontSize: 7.5, color: accent, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: 0 }}>
          Affiliated to CBSE · New Delhi
        </p>
      </div>

      {/* Accent border strip */}
      <div style={{ height: 4, background: accent }} />

      {/* Watermark crest in body */}
      <div style={{
        position: "absolute", top: "35%", left: "50%", transform: "translate(-50%, 0)",
        width: 120, height: 120, borderRadius: "50%",
        border: `3px solid ${accent}15`, zIndex: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ width: 90, height: 90, borderRadius: "50%", border: `2px solid ${accent}10` }} />
      </div>

      {/* Photo */}
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 14, paddingBottom: 8, position: "relative", zIndex: 1 }}>
        <div style={{
          width: 82, height: 100, borderRadius: 8,
          border: `2.5px solid ${accent}`,
          outline: `3px solid ${primary}20`,
          background: "#f9fafb", overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {s.photo ? <img src={s.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <User size={36} color="#9ca3af" />}
        </div>
      </div>

      {/* Name plate */}
      <div style={{
        margin: "0 14px 10px", padding: "6px 10px", textAlign: "center",
        background: primary, borderRadius: 6,
        borderLeft: `4px solid ${accent}`, borderRight: `4px solid ${accent}`,
      }}>
        <p style={{ fontSize: 12, fontWeight: 900, color: "white", textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>
          {s.name}
        </p>
      </div>

      {/* Details */}
      <div style={{ flex: 1, padding: "0 14px 8px", position: "relative", zIndex: 1 }}>
        {[
          { label: "Adm. No.",      value: s.admissionNo },
          { label: "Class",         value: s.class },
          { label: "Father",        value: s.fatherName },
          { label: "Bus No.",        value: s.busNo },
          { label: "Blood Group",   value: s.bloodGroup },
          { label: "Contact",       value: s.contactNo },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
            <span style={{
              fontSize: 8, fontWeight: 700, color: primary, minWidth: 62,
              textTransform: "uppercase", letterSpacing: 0.3,
            }}>{label}</span>
            <span style={{ fontSize: 8, color: accent, marginRight: 4, fontWeight: 900 }}>◆</span>
            <span style={{ fontSize: 9, color: "#1f2937", fontWeight: 600, flex: 1 }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Footer double bar */}
      <div>
        <div style={{ background: accent, height: 3 }} />
        <div style={{ background: primary, padding: "5px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 7, color: accent, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>Student ID Card</span>
          <span style={{ fontSize: 7, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>2024–25</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 5 — Maroon & Cream (Karnataka / Tamil Nadu style)
// Warm maroon header, cream/off-white body, serif-feeling bold typography,
// decorative corner accents, common in state board schools.
// ─────────────────────────────────────────────────────────────────────────────
export function MaroonCreamCard({ theme, logo, student = SAMPLE_STUDENT }) {
  const { primary, accent } = theme;
  const s = { ...SAMPLE_STUDENT, ...student };
  const cream = "#fdf6e3";

  return (
    <div style={{
      width: "100%", maxWidth: 280, minHeight: 480, background: cream,
      borderRadius: 12, overflow: "hidden", fontFamily: "Georgia, serif",
      border: `3px double ${primary}`, display: "flex", flexDirection: "column",
    }}>
      {/* Top decorative strip */}
      <div style={{ height: 6, background: `repeating-linear-gradient(90deg, ${primary} 0px, ${primary} 8px, ${accent} 8px, ${accent} 16px)` }} />

      {/* Header */}
      <div style={{
        background: primary, padding: "16px 12px 12px",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        {/* Logo with ornate border */}
        <div style={{
          width: 68, height: 68, borderRadius: "50%", background: cream,
          border: `3px solid ${accent}`, overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8,
        }}>
          {logo
            ? <img src={logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 5 }} />
            : <BookOpen size={22} color={primary} />}
        </div>
        <p style={{ fontSize: 13, fontWeight: 900, color: cream, letterSpacing: 1, textTransform: "uppercase", textAlign: "center", margin: "0 0 2px" }}>
          School Name
        </p>
        <p style={{ fontSize: 7.5, color: accent, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", margin: 0 }}>
          Est. 1985 · Location
        </p>
      </div>

      {/* Ornate divider */}
      <div style={{ textAlign: "center", padding: "6px 0", background: cream }}>
        <span style={{ fontSize: 10, color: accent, letterSpacing: 4 }}>✦ ✦ ✦</span>
      </div>

      {/* Photo */}
      <div style={{ display: "flex", justifyContent: "center", paddingBottom: 8 }}>
        <div style={{
          width: 84, height: 104, background: "#f5f0e8",
          border: `3px solid ${primary}`, borderRadius: 4,
          overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `3px 3px 0 ${accent}`,
        }}>
          {s.photo ? <img src={s.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <User size={36} color="#9ca3af" />}
        </div>
      </div>

      {/* Name */}
      <div style={{ textAlign: "center", padding: "0 14px 8px" }}>
        <p style={{ fontSize: 14, fontWeight: 900, color: primary, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 2px" }}>
          {s.name}
        </p>
        <p style={{ fontSize: 9, color: accent, fontWeight: 700, margin: 0 }}>{s.class}</p>
      </div>

      {/* Divider line */}
      <div style={{ margin: "0 14px 8px", borderTop: `1px solid ${primary}44` }} />

      {/* Details */}
      <div style={{ flex: 1, padding: "0 14px 6px" }}>
        {[
          { label: "Admission No.", value: s.admissionNo },
          { label: "Father's Name", value: s.fatherName },
          { label: "Bus No.",        value: s.busNo },
          { label: "Blood Group",   value: s.bloodGroup },
          { label: "Contact No.",   value: s.contactNo },
        ].map(({ label, value }) => (
          <div key={label} style={{
            display: "flex", justifyContent: "space-between",
            borderBottom: `1px dotted ${primary}33`, paddingBottom: 3, marginBottom: 3,
          }}>
            <span style={{ fontSize: 8, color: primary, fontWeight: 700, fontFamily: "sans-serif" }}>{label}</span>
            <span style={{ fontSize: 8.5, color: "#1f2937", fontWeight: 600, fontFamily: "sans-serif" }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Bottom decorative strip + footer */}
      <div style={{ textAlign: "center", padding: "4px 0", background: cream }}>
        <span style={{ fontSize: 10, color: accent, letterSpacing: 4 }}>✦ ✦ ✦</span>
      </div>
      <div style={{ height: 4, background: `repeating-linear-gradient(90deg, ${primary} 0px, ${primary} 8px, ${accent} 8px, ${accent} 16px)` }} />
      <div style={{ background: primary, padding: "5px", textAlign: "center" }}>
        <span style={{ fontSize: 8, color: accent, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>
          Student Identity Card
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 6 — CBSE Green Clean
// Clean modern style common in CBSE schools — green and white, structured
// layout, barcode strip at bottom, academic year badge.
// ─────────────────────────────────────────────────────────────────────────────
export function CBSEGreenCard({ theme, logo, student = SAMPLE_STUDENT }) {
  const { primary, accent } = theme;
  const s = { ...SAMPLE_STUDENT, ...student };

  return (
    <div style={{
      width: "100%", maxWidth: 280, minHeight: 480, background: "white",
      borderRadius: 10, overflow: "hidden", fontFamily: "'Arial', sans-serif",
      border: `1.5px solid ${primary}`, display: "flex", flexDirection: "column",
    }}>
      {/* Top bar */}
      <div style={{ background: primary, height: 8 }} />

      {/* Header row: logo left, school info right */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 12px", background: "#f8fffe",
        borderBottom: `2px solid ${primary}`,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 8, border: `2px solid ${primary}`,
          background: "white", overflow: "hidden", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {logo ? <img src={logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} /> : <BookOpen size={20} color={primary} />}
        </div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 900, color: primary, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 1px", lineHeight: 1.2 }}>
            School Name
          </p>
          <p style={{ fontSize: 7, color: "#6b7280", margin: "0 0 1px" }}>Affiliated to CBSE, New Delhi</p>
          <span style={{
            fontSize: 7, fontWeight: 700, color: "white", background: accent,
            padding: "1px 6px", borderRadius: 10,
          }}>
            Academic Year 2024–25
          </span>
        </div>
      </div>

      {/* Photo + name side by side */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px 8px" }}>
        <div style={{
          width: 76, height: 94, borderRadius: 6, border: `2px solid ${primary}`,
          background: "#f9fafb", overflow: "hidden", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {s.photo ? <img src={s.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <User size={30} color="#9ca3af" />}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 900, color: primary, textTransform: "uppercase", margin: "0 0 3px", lineHeight: 1.2 }}>
            {s.name}
          </p>
          <div style={{
            display: "inline-block", background: accent, color: "white",
            fontSize: 8, fontWeight: 700, padding: "2px 8px", borderRadius: 4, marginBottom: 4,
          }}>
            {s.class}
          </div>
          <p style={{ fontSize: 8, color: "#6b7280", margin: 0 }}>
            Adm: <strong style={{ color: primary }}>{s.admissionNo}</strong>
          </p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ margin: "0 12px", borderTop: `1.5px solid ${primary}22` }} />

      {/* Details */}
      <div style={{ flex: 1, padding: "8px 12px" }}>
        {[
          { label: "Father's Name", value: s.fatherName },
          { label: "Bus No.",        value: s.busNo },
          { label: "Blood Group",   value: s.bloodGroup },
          { label: "Contact No.",   value: s.contactNo },
        ].map(({ label, value }) => (
          <div key={label} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "4px 8px", borderRadius: 6, marginBottom: 4,
            background: "#f8fffe", border: `1px solid ${primary}18`,
          }}>
            <span style={{ fontSize: 8, color: "#6b7280", minWidth: 70, fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: 9, color: primary, fontWeight: 700 }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Barcode strip */}
      <div style={{ padding: "6px 12px 4px", borderTop: `1px solid ${primary}22` }}>
        <div style={{ display: "flex", gap: 1, justifyContent: "center", marginBottom: 2 }}>
          {[3,1,2,4,1,3,2,1,4,2,1,3,2,4,1,2,3,1,4,2,1,3,1,2].map((w, i) => (
            <div key={i} style={{ width: w * 2, height: 18, background: i % 3 === 0 ? primary : "#374151" }} />
          ))}
        </div>
        <p style={{ fontSize: 7, textAlign: "center", color: "#9ca3af", margin: 0, letterSpacing: 2 }}>
          {s.admissionNo}
        </p>
      </div>

      {/* Footer */}
      <div style={{ background: primary, padding: "5px", textAlign: "center" }}>
        <span style={{ fontSize: 8, color: accent, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>
          Student ID Card
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 7 — Corporate Sidebar
// Professional style — thin left colored sidebar with vertical school name,
// large right white area with photo, name and clean detail rows.
// Common in private schools and international schools in India.
// ─────────────────────────────────────────────────────────────────────────────
export function CorporateSidebarCard({ theme, logo, student = SAMPLE_STUDENT }) {
  const { primary, accent } = theme;
  const s = { ...SAMPLE_STUDENT, ...student };

  return (
    <div style={{
      width: "100%", maxWidth: 280, minHeight: 480, background: "white",
      borderRadius: 12, overflow: "hidden", fontFamily: "'Arial', sans-serif",
      border: `1.5px solid #e5e7eb`, display: "flex", flexDirection: "row",
      boxShadow: "0 2px 16px rgba(0,0,0,0.10)",
    }}>
      {/* Left sidebar */}
      <div style={{
        width: 44, background: primary, flexShrink: 0,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "space-between", padding: "12px 0",
      }}>
        {/* Logo at top */}
        <div style={{
          width: 32, height: 32, borderRadius: "50%", background: "white",
          border: `2px solid ${accent}`, overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {logo ? <img src={logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 3 }} /> : <BookOpen size={14} color={primary} />}
        </div>

        {/* Vertical school name */}
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          marginTop: 10,
        }}>
          <p style={{
            fontSize: 8, fontWeight: 900, color: "white", textTransform: "uppercase",
            letterSpacing: 2, margin: 0, writingMode: "vertical-rl",
            textOrientation: "mixed", transform: "rotate(180deg)",
          }}>
            School Name
          </p>
        </div>

        {/* Accent dot at bottom */}
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: accent }} />
      </div>

      {/* Right content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Top accent line */}
        <div style={{ height: 4, background: accent }} />

        {/* ID Card label */}
        <div style={{ padding: "8px 12px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 8, fontWeight: 800, color: primary, letterSpacing: 1.5, textTransform: "uppercase" }}>
            Student ID Card
          </span>
          <span style={{
            fontSize: 7, fontWeight: 700, color: "white", background: accent,
            padding: "1px 6px", borderRadius: 8,
          }}>2024–25</span>
        </div>

        {/* Photo centered */}
        <div style={{ display: "flex", justifyContent: "center", paddingBottom: 8 }}>
          <div style={{
            width: 80, height: 96, borderRadius: 8, border: `2.5px solid ${primary}`,
            background: "#f9fafb", overflow: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {s.photo ? <img src={s.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <User size={32} color="#9ca3af" />}
          </div>
        </div>

        {/* Name */}
        <div style={{ padding: "0 12px 6px", textAlign: "center" }}>
          <p style={{ fontSize: 13, fontWeight: 900, color: primary, textTransform: "uppercase", margin: "0 0 2px", lineHeight: 1.2 }}>
            {s.name}
          </p>
          <p style={{ fontSize: 8.5, color: accent, fontWeight: 700, margin: 0 }}>{s.class}</p>
        </div>

        {/* Thin divider */}
        <div style={{ margin: "0 12px 6px", height: 1, background: `${primary}20` }} />

        {/* Details */}
        <div style={{ flex: 1, padding: "0 12px 8px" }}>
          {[
            { label: "Adm. No.",    value: s.admissionNo },
            { label: "Father",      value: s.fatherName },
            { label: "Bus No.",      value: s.busNo },
            { label: "Blood",       value: s.bloodGroup },
            { label: "Contact",     value: s.contactNo },
          ].map(({ label, value }) => (
            <div key={label} style={{
              display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 4,
            }}>
              <span style={{ fontSize: 7.5, color: "#9ca3af", minWidth: 46, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, paddingTop: 1 }}>
                {label}
              </span>
              <span style={{ fontSize: 9, color: "#111827", fontWeight: 700, flex: 1 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Bottom accent */}
        <div style={{ height: 4, background: accent }} />
      </div>
    </div>
  );
}


export const TEMPLATE_REGISTRY = {
  CLASSIC_VERTICAL:  ClassicVerticalCard,
  NAVY_HORIZONTAL:   HorizontalSplitCard,
  MINIMAL_MODERN:    MinimalModernCard,
  ROYAL_SOUTH:       RoyalSouthIndianCard,
  MAROON_CREAM:      MaroonCreamCard,
  CBSE_GREEN:        CBSEGreenCard,
  CORPORATE_SIDEBAR: CorporateSidebarCard,
};

// Helper: resolve which component to render for a given template record
export function getTemplateComponent(templateKey) {
  return TEMPLATE_REGISTRY[templateKey] || ClassicVerticalCard;
}