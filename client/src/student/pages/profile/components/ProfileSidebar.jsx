import React, { useMemo } from "react";
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
  "/student-avatars/boys/boy1.jpg",
  "/student-avatars/boys/boy2.jpg",
];

const GIRL_IMAGES = [
  "/student-avatars/girls/girl1.png",
  "/student-avatars/girls/girl2.png",
  "/student-avatars/girls/girl3.png",
  "/student-avatars/girls/girl4.png",
  "/student-avatars/girls/girl5.png",
  "/student-avatars/girls/girl6.png",
];

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

  const gender = pi?.gender?.toUpperCase() || "UNKNOWN";

  const IMAGE_LIST =
    gender === "MALE"
      ? BOY_IMAGES
      : gender === "FEMALE"
      ? GIRL_IMAGES
      : [...BOY_IMAGES, ...GIRL_IMAGES];

  const avatarImage = useMemo(() => {
    const key = (profileData?.id || "") + gender;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash += key.charCodeAt(i);
    }
    const index = hash % IMAGE_LIST.length;
    return IMAGE_LIST[index];
  }, [profileData?.id, gender, IMAGE_LIST]);

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

      {/* Avatar */}
      <div style={{
        width: "100%",
        marginBottom: 10,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}>
        {numericGrade < 5 ? (
          <img
            src={avatarImage}
            alt="student avatar"
            style={{
              width: "100%",
              height: "auto",
              maxHeight: 280,
              objectFit: "contain",
              objectPosition: "center top",
              borderRadius: 10,
              display: "block",
            }}
          />
        ) : (
          <div style={{ height: 380, width: "100%" }}>
            <Avatar3D gender={gender} studentId={profileData?.id} />
          </div>
        )}
      </div>
 
      {/* Name */}
      <div style={{ padding: "12px 4px" }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: C.dark }}>
          {loading ? "Loading…" : fullName}
        </div>

        <div style={{ fontSize: 11, color: C.mid }}>{className}</div>

        <div style={{ fontSize: 11, fontWeight: 700, color: C.light }}>
          {admNo}
        </div>

        {/* Status */}
        <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
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
 
      {/* Stats */}
      <div className="pf-stat-grid" style={{ marginTop: 16 }}>
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