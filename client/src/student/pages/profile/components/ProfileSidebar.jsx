// client/src/student/pages/profile/components/ProfileSidebar.jsx
import React, { useState, useEffect } from "react";
import { C, initials } from "./shared.jsx";

const STATUS_COLOR = {
  ACTIVE:              "#16a34a",
  COMPLETED:           "#2563eb",
  GRADUATED:           "#7c3aed",
  INACTIVE:            "#d97706",
  SUSPENDED:           "#dc2626",
  FAILED:              "#dc2626",
  PENDING_READMISSION: "#d97706",
};

export default function ProfileSidebar({ profileData, enrollment, parents, loading }) {
  const pi       = profileData?.personalInfo;
  const imageUrl = pi?.profileImageUrl ?? null;

  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [imageUrl]);

  const fullName  = pi ? `${pi.firstName} ${pi.lastName ?? ""}`.trim() : (profileData?.name ?? "Student");
  const className = enrollment?.classSection?.name    ?? "—";
  const grade     = enrollment?.classSection?.grade   ?? "—";
  const section   = enrollment?.classSection?.section ?? "—";
  const admNo     = enrollment?.admissionNumber       ?? "—";
  const rollNo    = enrollment?.rollNumber            ?? "—";
  const ayName    = enrollment?.academicYear?.name    ?? "—";
  const status    = enrollment?.status                ?? "ACTIVE";
  const statusColor = STATUS_COLOR[status] ?? C.mid;
  const showImage = !!imageUrl && !imgError;

  const STATS = [
    { label: "Grade",   value: grade,   color: C.light   },
    { label: "Section", value: section, color: "#8b5cf6" },
    { label: "Roll No", value: rollNo,  color: "#f59e0b" },
    { label: "Status",  value: status.charAt(0) + status.slice(1).toLowerCase(), color: statusColor },
  ];

  return (
    <div className="pf-sidebar">

      {/* ─── Avatar + name block ─── */}
      {/* On mobile: horizontal strip. On tablet+: vertical centered */}
      <div className="pf-sidebar-mobile">

        {/* Avatar */}
        <div style={{ position: "relative", flexShrink: 0, display: "flex", justifyContent: "center" }}>
          {/* Decorative rings */}
          <div style={{
            position: "absolute", inset: -5, borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.light}44, ${C.pale}77)`, zIndex: 0,
          }} />
          <div style={{
            position: "absolute", inset: -2, borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.mid}33, ${C.light}55)`, zIndex: 0,
          }} />
          {showImage ? (
            <img
              key={imageUrl}
              src={imageUrl}
              alt={fullName}
              onError={() => setImgError(true)}
              style={{
                position: "relative", zIndex: 1,
                width: 80, height: 80, borderRadius: "50%",
                objectFit: "cover",
                border: `3px solid ${C.white}`,
                boxShadow: "0 6px 24px rgba(56,73,89,0.18), 0 2px 8px rgba(136,189,242,0.24)",
                display: "block",
              }}
            />
          ) : (
            <div style={{
              position: "relative", zIndex: 1,
              width: 80, height: 80, borderRadius: "50%",
              background: `linear-gradient(135deg, ${C.light}, ${C.dark})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26, fontWeight: 900, color: C.white,
              border: `3px solid ${C.white}`,
              boxShadow: "0 6px 24px rgba(56,73,89,0.18), 0 2px 8px rgba(136,189,242,0.24)",
              fontFamily: "'Inter', sans-serif", letterSpacing: "-1px",
            }}>
              {loading ? "…" : initials(fullName)}
            </div>
          )}
          {status === "ACTIVE" && (
            <div style={{
              position: "absolute", bottom: 4, right: 4, zIndex: 2,
              width: 13, height: 13, borderRadius: "50%",
              background: statusColor, border: `2.5px solid ${C.white}`,
              boxShadow: `0 0 0 2px ${statusColor}38`,
            }} />
          )}
        </div>

        {/* Name + pills — horizontal on mobile, centered on desktop */}
        <div style={{
          flex: 1, minWidth: 0,
          display: "flex", flexDirection: "column",
        }}>
          {/* Name */}
          <div style={{
            fontWeight: 800, fontSize: 14, color: C.dark,
            lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {loading ? "Loading…" : fullName}
          </div>
          <div style={{ fontSize: 11, color: C.mid, marginTop: 2, fontWeight: 500 }}>{className}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.light, marginTop: 1 }}>{admNo}</div>

          {/* Status + year pills */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
            <span className="pf-badge" style={{
              background: `${statusColor}15`, color: statusColor,
              border: `1px solid ${statusColor}40`,
            }}>
              {status}
            </span>
            <span className="pf-badge" style={{
              background: "rgba(237,243,250,0.90)", color: C.mid,
              border: `1px solid ${C.pale}`,
            }}>
              {ayName}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Quick stats (hidden on mobile horizontal strip, shown below) ─── */}
      <div className="pf-stat-grid" style={{ marginTop: 16, marginBottom: 14 }}>
        {STATS.map(({ label, value, color }) => (
          <div key={label} style={{
            background: C.bg, borderRadius: 10, padding: "8px 8px",
            textAlign: "center", border: `1px solid ${C.pale}`,
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 9, color: C.mid, marginTop: 3, textTransform: "uppercase", letterSpacing: ".06em" }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Divider ─── */}
      <div style={{ height: 1, background: C.pale, marginBottom: 14 }} />

      {/* ─── Parents ─── */}
      {parents.length > 0 && (
        <div>
          <div style={{
            fontSize: 9, fontWeight: 800, color: C.mid,
            textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 9,
          }}>
            Parents / Guardian
          </div>
          {parents.map(({ relation, parent: p }) => (
            <div key={p.id} style={{
              background: C.bg, border: `1px solid ${C.pale}`,
              borderRadius: 10, padding: "9px 12px", marginBottom: 6,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.dark }}>{p.name}</div>
              <div style={{ fontSize: 10, color: C.mid, marginTop: 2 }}>
                {relation.charAt(0) + relation.slice(1).toLowerCase()}
                {p.phone ? ` · ${p.phone}` : ""}
              </div>
              {p.occupation && (
                <div style={{ fontSize: 10, color: C.mid }}>{p.occupation}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}