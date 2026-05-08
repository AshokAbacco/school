import React, { useRef } from "react";
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

const BOY_IMAGES = [
  "/student-avatars/boys/boy1.png",
  "/student-avatars/boys/boy01.png",
  "/student-avatars/boys/boy02.png",
  "/student-avatars/boys/boy03.png",
  "/student-avatars/boys/boy04.png",
  "/student-avatars/boys/boy05.png",
  "/student-avatars/boys/boy06.png",
  "/student-avatars/boys/boy07.png",
  "/student-avatars/boys/boy08.png",
  "/student-avatars/boys/boy09.png",
  "/student-avatars/boys/boy10.png",
  "/student-avatars/boys/boy11.png",
  "/student-avatars/boys/boy12.png",
  "/student-avatars/boys/boy13.png",
  "/student-avatars/boys/boy14.png",
];

const GIRL_IMAGES = [
  "/student-avatars/girls/girl1.png",
  "/student-avatars/girls/girl3.png",
  "/student-avatars/girls/girl4.png",
  "/student-avatars/girls/girl5.png",
  "/student-avatars/girls/girl6.png",
  "/student-avatars/girls/girl7.png",
  "/student-avatars/girls/girl8.png",
  "/student-avatars/girls/girl9.png",
  "/student-avatars/girls/girl10.png",
  "/student-avatars/girls/girl11.png",
  "/student-avatars/girls/girl12.png",
  "/student-avatars/girls/girl13.png",
  "/student-avatars/girls/girl14.png",
];

/**
 * Module-level Map — lives in JS memory only.
 *
 * ✅ Cleared on every page refresh (memory resets)
 * ✅ Stable during the current page session (re-renders don't repick)
 * ✅ Never touches sessionStorage / localStorage
 *
 * Key: `${studentId}_${gender}`  →  Value: image path string
 */
const avatarCache = new Map();

/**
 * Pick a random avatar for this student+gender.
 * Only called once real studentId AND gender are known — prevents the
 * "wrong gender flashes first" bug.
 */
function pickAvatar(studentId, gender, list) {
  const cacheKey = `${studentId}_${gender}`;
  if (avatarCache.has(cacheKey)) {
    return avatarCache.get(cacheKey);
  }
  const path = list[Math.floor(Math.random() * list.length)];
  avatarCache.set(cacheKey, path);
  return path;
}

export default function ProfileSidebar({ profileData, enrollment, parents, loading }) {
  const pi = profileData?.personalInfo;

  const fullName = pi
    ? `${pi.firstName} ${pi.lastName ?? ""}`.trim()
    : profileData?.name ?? "Student";

  const className = enrollment?.classSection?.name ?? "—";

  const grade =
    enrollment?.classSection?.grade ??
    profileData?.currentEnrollment?.classSection?.grade ??
    "0";

  const numericGrade = parseInt(grade, 10) || 0;

  // Strict: only MALE or FEMALE — never undefined or mixed
  const rawGender = pi?.gender?.toUpperCase();
  const gender    = rawGender === "MALE" || rawGender === "FEMALE" ? rawGender : null;
  const imageList = gender === "FEMALE" ? GIRL_IMAGES : BOY_IMAGES;

  /**
   * useRef locks in the avatar path for this component's lifetime.
   * We populate it the first render where BOTH id and gender are real.
   * Until then avatarRef.current stays null → no <img> rendered → no flicker.
   */
  const avatarRef = useRef(null);
  if (avatarRef.current === null && profileData?.id && gender) {
    avatarRef.current = pickAvatar(profileData.id, gender, imageList);
  }

  const avatarImage = avatarRef.current; // null while loading

  const section     = enrollment?.classSection?.section ?? "—";
  const admNo       = enrollment?.admissionNumber ?? "—";
  const rollNo      = enrollment?.rollNumber ?? "—";
  const ayName      = enrollment?.academicYear?.name ?? "—";
  const status      = enrollment?.status ?? "ACTIVE";
  const statusColor = STATUS_COLOR[status] ?? C.mid;

  const STATS = [
    { label: "Grade",   value: grade,   color: C.light   },
    { label: "Section", value: section, color: "#8b5cf6" },
    { label: "Roll No", value: rollNo,  color: "#f59e0b" },
    {
      label: "Status",
      value: status.charAt(0) + status.slice(1).toLowerCase(),
      color: statusColor,
    },
  ];

  return (
    <div className="pf-sidebar">

      {/* ── Avatar ─────────────────────────────────────────────────────── */}
      <div style={{
        width: "100%",
        aspectRatio: "3 / 4",
        maxHeight: 320,
        minHeight: 200,
        position: "relative",
        borderRadius: 14,
        overflow: "hidden",
        background: "rgba(136,189,242,0.06)",
        border: `1.5px solid ${C.pale}`,
        marginBottom: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {numericGrade < 5 ? (
          // Only mount <img> once avatarImage is the correct gender-specific path.
          // The placeholder container shows while data loads — zero flicker.
          avatarImage && (
            <img
              key={avatarImage}
              src={avatarImage}
              alt="student avatar"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                objectPosition: "center center",
                display: "block",
              }}
            />
          )
        ) : (
          <Avatar3D gender={gender ?? "MALE"} studentId={profileData?.id} />
        )}
      </div>

      {/* ── Name block ─────────────────────────────────────────────────── */}
      <div style={{ padding: "0 4px 12px" }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: C.dark }}>
          {loading ? "Loading…" : fullName}
        </div>

        <div style={{ fontSize: 11, color: C.mid, marginTop: 2 }}>{className}</div>

        <div style={{ fontSize: 11, fontWeight: 700, color: C.light, marginTop: 2 }}>
          {admNo}
        </div>

        {/* Status badges */}
        <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
          <span className="pf-badge" style={{
            background: `${statusColor}15`,
            color: statusColor,
            border: `1px solid ${statusColor}40`,
          }}>
            {status}
          </span>

          <span className="pf-badge" style={{
            background: "rgba(237,243,250,0.90)",
            color: C.mid,
            border: `1px solid ${C.pale}`,
          }}>
            {ayName}
          </span>
        </div>
      </div>

      {/* ── Stats grid ─────────────────────────────────────────────────── */}
      <div className="pf-stat-grid">
        {STATS.map(({ label, value, color }) => (
          <div key={label} style={{
            background: C.bg,
            borderRadius: 10,
            padding: "8px",
            textAlign: "center",
            border: `1px solid ${C.pale}`,
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color }}>
              {value}
            </div>
            <div style={{ fontSize: 9, color: C.mid }}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}