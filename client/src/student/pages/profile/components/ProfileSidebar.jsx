import React from "react";
import { C } from "./shared.jsx";
import Avatar3D from "../../../../components/Avatar3D.jsx";

const STATUS_COLOR = {
  ACTIVE: "#16a34a",
  COMPLETED: "#2563eb",
  GRADUATED: "#7c3aed",
  INACTIVE: "#d97706",
  SUSPENDED: "#dc2626",
  FAILED: "#dc2626",
  PENDING_READMISSION: "#d97706",
};

export default function ProfileSidebar({ profileData, enrollment, parents, loading }) {
  const pi = profileData?.personalInfo;

  const fullName = pi
    ? `${pi.firstName} ${pi.lastName ?? ""}`.trim()
    : (profileData?.name ?? "Student");

  const className = enrollment?.classSection?.name ?? "—";
  const grade = enrollment?.classSection?.grade ?? "—";
  const section = enrollment?.classSection?.section ?? "—";
  const admNo = enrollment?.admissionNumber ?? "—";
  const rollNo = enrollment?.rollNumber ?? "—";
  const ayName = enrollment?.academicYear?.name ?? "—";
  const status = enrollment?.status ?? "ACTIVE";
  const statusColor = STATUS_COLOR[status] ?? C.mid;

  const STATS = [
    { label: "Grade", value: grade, color: C.light },
    { label: "Section", value: section, color: "#8b5cf6" },
    { label: "Roll No", value: rollNo, color: "#f59e0b" },
    {
      label: "Status",
      value: status.charAt(0) + status.slice(1).toLowerCase(),
      color: statusColor,
    },
  ];

  return (
    <div className="pf-sidebar">

      {/* 🔥 FULL WIDTH 3D AVATAR (NO SHAPE, NO BACKGROUND) */}
      <div
        style={{
          width: "100%",
          height: 260,
          marginBottom: 10,
        }}
      >
        <Avatar3D />
      </div>

      {/* Name */}
      <div style={{ padding: "0 4px" }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: 14,
            color: C.dark,
            lineHeight: 1.3,
          }}
        >
          {loading ? "Loading…" : fullName}
        </div>

        <div style={{ fontSize: 11, color: C.mid, marginTop: 2 }}>
          {className}
        </div>

        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.light,
            marginTop: 1,
          }}
        >
          {admNo}
        </div>

        {/* Status pills */}
        <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
          <span
            className="pf-badge"
            style={{
              background: `${statusColor}15`,
              color: statusColor,
              border: `1px solid ${statusColor}40`,
            }}
          >
            {status}
          </span>

          <span
            className="pf-badge"
            style={{
              background: "rgba(237,243,250,0.90)",
              color: C.mid,
              border: `1px solid ${C.pale}`,
            }}
          >
            {ayName}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div
        className="pf-stat-grid"
        style={{ marginTop: 16, marginBottom: 14 }}
      >
        {STATS.map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              background: C.bg,
              borderRadius: 10,
              padding: "8px",
              textAlign: "center",
              border: `1px solid ${C.pale}`,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color }}>
              {value}
            </div>
            <div
              style={{
                fontSize: 9,
                color: C.mid,
                marginTop: 3,
                textTransform: "uppercase",
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: C.pale, marginBottom: 14 }} />

      {/* Parents */}
      {parents.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 800,
              color: C.mid,
              marginBottom: 9,
            }}
          >
            PARENTS / GUARDIAN
          </div>

          {parents.map(({ relation, parent: p }) => (
            <div
              key={p.id}
              style={{
                background: C.bg,
                border: `1px solid ${C.pale}`,
                borderRadius: 10,
                padding: "9px 12px",
                marginBottom: 6,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700 }}>
                {p.name}
              </div>

              <div style={{ fontSize: 10, color: C.mid }}>
                {relation} {p.phone ? `· ${p.phone}` : ""}
              </div>

              {p.occupation && (
                <div style={{ fontSize: 10, color: C.mid }}>
                  {p.occupation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}