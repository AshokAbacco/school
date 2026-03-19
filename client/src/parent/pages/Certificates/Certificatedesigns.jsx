// ═══════════════════════════════════════════════════════════════
//  7 CERTIFICATE DESIGNS — Real-world inspired, print-ready
//  Each design is unique per category
//  School Seal is SVG-based circular emblem (logo-ready)
// ═══════════════════════════════════════════════════════════════

import React, { useState } from "react";
import { Download, X } from "lucide-react";

// ─── School Seal Component ────────────────────────────────────────────────────
// A real circular school seal — swap center icon for logo later
const SchoolSeal = ({ schoolName = "Springfield High School", size = 90, color = "#B8860B", bgColor = "transparent", textColor = null }) => {
    const tc = textColor || color;
    const r = size / 2;
    const circumference = 2 * Math.PI * (r - 10);
    const name = schoolName.toUpperCase();

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
            {/* Outer ring */}
            <circle cx={r} cy={r} r={r - 3} fill={bgColor} stroke={color} strokeWidth="2" />
            {/* Inner ring */}
            <circle cx={r} cy={r} r={r - 10} fill="none" stroke={color} strokeWidth="1" strokeDasharray="3,3" />
            {/* Center icon - lamp of knowledge */}
            <text x={r} y={r + 10} textAnchor="middle" fontSize={size * 0.28} fontFamily="serif">🪔</text>
            {/* EST text at bottom */}
            <text x={r} y={r + 26} textAnchor="middle" fontSize={size * 0.09} fontFamily="Georgia, serif" fill={tc} letterSpacing="2">EST. 2010</text>
            {/* School name curved on top using textPath */}
            <defs>
                <path id={`curve-${size}`} d={`M ${r - (r - 12)}, ${r} A ${r - 12},${r - 12} 0 0,1 ${r + (r - 12)},${r}`} />
            </defs>
            <text fontSize={size * 0.095} fontFamily="Georgia, serif" fill={tc} letterSpacing="1.5">
                <textPath href={`#curve-${size}`} startOffset="50%" textAnchor="middle">
                    {name.length > 24 ? name.slice(0, 24) : name}
                </textPath>
            </text>
        </svg>
    );
};

// ─── 1. ACADEMIC — Ivory parchment, ornate gold border, classical ─────────────
export const AcademicCertificate = ({ cert, student, school }) => {
    const date = new Date(cert.issuedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

    return (
        <div style={{
            width: 794, height: 562,
            background: "linear-gradient(160deg, #FEFCE8 0%, #FEF9E7 50%, #FFFDF0 100%)",
            position: "relative", overflow: "hidden",
            fontFamily: "'Georgia', 'Times New Roman', serif",
            boxSizing: "border-box",
        }}>
            {/* Outer gold border */}
            <div style={{ position: "absolute", inset: 10, border: "3px solid #B8860B", pointerEvents: "none" }} />
            {/* Inner thin border */}
            <div style={{ position: "absolute", inset: 16, border: "1px solid #DAA52066", pointerEvents: "none" }} />

            {/* Corner ornaments */}
            {/* Corner ornaments */}
            {[
                { top: 8, left: 8, rotate: "0deg" },
                { top: 8, right: 8, rotate: "90deg" },
                { bottom: 8, right: 8, rotate: "180deg" },
                { bottom: 8, left: 8, rotate: "270deg" },
            ].map(({ rotate, ...pos }, i) => (
                <div key={i} style={{ position: "absolute", ...pos, width: 24, height: 24, transform: `rotate(${rotate})` }}>
                    <svg viewBox="0 0 24 24" width="24" height="24">
                        <path d="M2,2 L10,2 L10,4 L4,4 L4,10 L2,10 Z" fill="#B8860B" />
                    </svg>
                </div>
            ))}

            {/* Watermark background text */}
            <div style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 100, color: "rgba(184,134,11,0.04)", fontWeight: 900, letterSpacing: -2, userSelect: "none",
                transform: "rotate(-20deg)",
            }}>EXCELLENCE</div>

            {/* Main layout */}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "28px 56px 24px" }}>

                {/* Top: seal + school */}
                <div style={{ display: "flex", alignItems: "center", gap: 18, width: "100%" }}>
                    <SchoolSeal schoolName={school.name} size={80} color="#B8860B" />
                    <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#78350F", letterSpacing: 5, textTransform: "uppercase" }}>{school.name}</div>
                        <div style={{ fontSize: 9, color: "#A16207", letterSpacing: 3, marginTop: 2 }}>{school.city}{school.state ? `, ${school.state}` : ""}</div>
                        <div style={{ width: "100%", height: 1, background: "linear-gradient(90deg, transparent, #B8860B, transparent)", marginTop: 8 }} />
                    </div>
                    {/* Trophy icon right */}
                    <div style={{ width: 80, display: "flex", justifyContent: "flex-end" }}>
                        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #DAA520, #B8860B)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(184,134,11,0.4)" }}>
                            <span style={{ fontSize: 26 }}>🎓</span>
                        </div>
                    </div>
                </div>

                {/* Title */}
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, letterSpacing: 8, color: "#A16207", textTransform: "uppercase", marginBottom: 6 }}>Certificate of Achievement</div>
                    <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 6 }}>This is to proudly certify that</div>
                    <div style={{ fontSize: 34, fontWeight: 700, color: "#1C1917", letterSpacing: 1, marginBottom: 4, fontStyle: "italic" }}>
                        {student.firstName} {student.lastName}
                    </div>
                    <div style={{ fontSize: 10, color: "#78716C", letterSpacing: 2 }}>
                        CLASS {student.classSection?.toUpperCase()} &nbsp;·&nbsp; ROLL NO. {student.rollNumber || "—"} &nbsp;·&nbsp; {student.academicYear}
                    </div>
                </div>

                {/* Award box */}
                <div style={{ textAlign: "center", width: "100%" }}>
                    <div style={{ fontSize: 11, color: "#57534E" }}>has been honored with the prestigious</div>
                    <div style={{ margin: "8px auto", padding: "10px 32px", border: "1px solid #DAA520", background: "rgba(218,165,32,0.06)", display: "inline-block", borderRadius: 2 }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: "#78350F", letterSpacing: 0.5 }}>{cert.title}</div>
                        {cert.description && <div style={{ fontSize: 10, color: "#A16207", marginTop: 2, fontStyle: "italic" }}>{cert.description}</div>}
                    </div>
                </div>

                {/* Footer signatures */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", width: "100%", borderTop: "1px solid #DAA52044", paddingTop: 12 }}>
                    <div style={{ textAlign: "center", minWidth: 160 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#1C1917", fontStyle: "italic" }}>{cert.issuedBy}</div>
                        <div style={{ width: 120, height: 1, background: "#B8860B", margin: "4px auto" }} />
                        <div style={{ fontSize: 9, color: "#78716C", letterSpacing: 1 }}>{cert.issuedByDesignation?.toUpperCase()}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "#A16207", letterSpacing: 4, textTransform: "uppercase" }}>Date of Issue</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#1C1917" }}>{date}</div>
                    </div>
                    <div style={{ textAlign: "center", minWidth: 160 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#1C1917", fontStyle: "italic" }}>{school.name}</div>
                        <div style={{ width: 120, height: 1, background: "#B8860B", margin: "4px auto" }} />
                        <div style={{ fontSize: 9, color: "#78716C", letterSpacing: 1 }}>PRINCIPAL</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── 2. SPORTS — Bold red-orange, dynamic diagonal, medal feel ────────────────
export const SportsCertificate = ({ cert, student, school }) => {
    const date = new Date(cert.issuedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
    const RIBBON = {
        WINNER: { text: "1ST PLACE", icon: "🥇", bg: "#FEF3C7", color: "#92400E" },
        RUNNER_UP: { text: "2ND PLACE", icon: "🥈", bg: "#F1F5F9", color: "#334155" },
        THIRD_PLACE: { text: "3RD PLACE", icon: "🥉", bg: "#FEF9C3", color: "#713F12" },
        PARTICIPATED: { text: "PARTICIPANT", icon: "🎖️", bg: "#EFF6FF", color: "#1D4ED8" },
        SPECIAL_AWARD: { text: "SPECIAL AWARD", icon: "⭐", bg: "#FDF4FF", color: "#7E22CE" },
    };
    const ribbon = cert.resultType ? RIBBON[cert.resultType] : RIBBON.PARTICIPATED;

    return (
        <div style={{
            width: 794, height: 562,
            background: "#FFFFFF",
            position: "relative", overflow: "hidden",
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            boxSizing: "border-box",
        }}>
            {/* Diagonal red-orange background stripe */}
            <div style={{
                position: "absolute", top: -60, left: -40,
                width: 340, height: 700,
                background: "linear-gradient(175deg, #DC2626, #EA580C)",
                transform: "skewX(-8deg)",
            }} />

            {/* Dark overlay stripe edge */}
            <div style={{
                position: "absolute", top: -60, left: 260,
                width: 18, height: 700,
                background: "rgba(0,0,0,0.15)",
                transform: "skewX(-8deg)",
            }} />

            {/* Subtle geometric circles background */}
            <div style={{ position: "absolute", top: -30, left: -30, width: 180, height: 180, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)" }} />
            <div style={{ position: "absolute", top: -10, left: -10, width: 120, height: 120, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.07)" }} />

            {/* Right side subtle pattern */}
            <div style={{ position: "absolute", right: 20, top: 20, opacity: 0.04 }}>
                {[...Array(6)].map((_, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                        {[...Array(5)].map((_, j) => (
                            <div key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: "#DC2626" }} />
                        ))}
                    </div>
                ))}
            </div>

            {/* Left panel content */}
            <div style={{ position: "absolute", left: 0, top: 0, width: 280, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 32px", gap: 16 }}>
                <SchoolSeal schoolName={school.name} size={90} color="rgba(255,255,255,0.9)" bgColor="rgba(255,255,255,0.08)" textColor="rgba(255,255,255,0.9)" />
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>{school.name}</div>
                    <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", letterSpacing: 2 }}>{school.city}</div>
                </div>
                {/* Big trophy */}
                <div style={{ fontSize: 52, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" }}>🏆</div>
                {/* Ribbon badge */}
                <div style={{ background: ribbon.bg, color: ribbon.color, padding: "6px 14px", borderRadius: 4, fontSize: 11, fontWeight: 900, letterSpacing: 2, textAlign: "center" }}>
                    {ribbon.icon} {ribbon.text}
                </div>
            </div>

            {/* Right panel content */}
            <div style={{ position: "absolute", left: 296, top: 0, right: 0, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 40px 32px 60px" }}>
                <div style={{ fontSize: 9, color: "#9CA3AF", letterSpacing: 5, textTransform: "uppercase", marginBottom: 16 }}>
                    Certificate of Achievement
                </div>

                <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "Georgia, serif", fontWeight: 400, marginBottom: 6 }}>
                    Proudly presented to
                </div>

                <div style={{ fontSize: 36, fontWeight: 900, color: "#111827", lineHeight: 1.1, marginBottom: 6, letterSpacing: -1 }}>
                    {student.firstName}<br />{student.lastName}
                </div>

                <div style={{ fontSize: 10, color: "#9CA3AF", letterSpacing: 2, marginBottom: 20 }}>
                    CLASS {student.classSection?.toUpperCase()} &nbsp;·&nbsp; {student.academicYear}
                </div>

                <div style={{ width: 40, height: 3, background: "#DC2626", marginBottom: 12 }} />

                <div style={{ fontSize: 10, color: "#6B7280", fontFamily: "Georgia, serif", marginBottom: 6 }}>for outstanding performance in</div>

                <div style={{ fontSize: 22, fontWeight: 900, color: "#DC2626", letterSpacing: -0.5, marginBottom: 4 }}>
                    {cert.title}
                </div>
                {cert.description && (
                    <div style={{ fontSize: 11, color: "#4B5563", fontFamily: "Georgia, serif", marginBottom: 4 }}>{cert.description}</div>
                )}
                {cert.teamName && (
                    <div style={{ fontSize: 10, color: "#9CA3AF" }}>Team: {cert.teamName}</div>
                )}

                {/* Footer */}
                <div style={{ marginTop: "auto", paddingTop: 20, borderTop: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <div>
                        <div style={{ fontFamily: "Georgia, serif", fontSize: 11, fontWeight: 700, color: "#111827", fontStyle: "italic" }}>{cert.issuedBy}</div>
                        <div style={{ width: 100, height: 1, background: "#D1D5DB", marginTop: 4 }} />
                        <div style={{ fontSize: 9, color: "#9CA3AF", letterSpacing: 1, marginTop: 2 }}>{cert.issuedByDesignation?.toUpperCase()}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: "#DC2626", fontWeight: 700 }}>{date}</div>
                        <div style={{ fontSize: 9, color: "#9CA3AF" }}>Date of Issue</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── 3. CULTURAL — Artistic purple-pink, side art panel, performing arts feel ──
export const CulturalCertificate = ({ cert, student, school }) => {
    const date = new Date(cert.issuedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

    return (
        <div style={{
            width: 794, height: 562,
            background: "#FDFAFF",
            position: "relative", overflow: "hidden",
            fontFamily: "'Georgia', serif",
            boxSizing: "border-box",
        }}>
            {/* Top purple swoosh */}
            <div style={{
                position: "absolute", top: -100, right: -100,
                width: 400, height: 400, borderRadius: "50%",
                background: "linear-gradient(135deg, #7C3AED22, #EC4899)",
                opacity: 0.15,
            }} />
            {/* Bottom swoosh */}
            <div style={{
                position: "absolute", bottom: -80, left: -80,
                width: 300, height: 300, borderRadius: "50%",
                background: "linear-gradient(135deg, #EC4899, #7C3AED)",
                opacity: 0.10,
            }} />

            {/* Top decorative border */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, background: "linear-gradient(90deg, #7C3AED, #EC4899, #F59E0B, #EC4899, #7C3AED)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 8, background: "linear-gradient(90deg, #7C3AED, #EC4899, #F59E0B, #EC4899, #7C3AED)" }} />

            {/* Side decorative bars */}
            <div style={{ position: "absolute", left: 0, top: 8, bottom: 8, width: 6, background: "linear-gradient(180deg, #7C3AED, #EC4899, #F59E0B)" }} />
            <div style={{ position: "absolute", right: 0, top: 8, bottom: 8, width: 6, background: "linear-gradient(180deg, #7C3AED, #EC4899, #F59E0B)" }} />

            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 56px 20px" }}>

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%", marginBottom: 12 }}>
                    <SchoolSeal schoolName={school.name} size={76} color="#7C3AED" bgColor="rgba(124,58,237,0.05)" />
                    <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#4C1D95", letterSpacing: 4, textTransform: "uppercase" }}>{school.name}</div>
                        <div style={{ fontSize: 9, color: "#7C3AED88", letterSpacing: 2, marginTop: 2 }}>Cultural & Arts Excellence Program</div>
                    </div>
                    <div style={{ fontSize: 48, filter: "drop-shadow(0 2px 8px rgba(124,58,237,0.3))" }}>🎭</div>
                </div>

                <div style={{ width: "100%", height: 1, background: "linear-gradient(90deg, transparent, #7C3AED44, #EC489944, transparent)", marginBottom: 16 }} />

                {/* Certificate type */}
                <div style={{ textAlign: "center", marginBottom: 8 }}>
                    <div style={{ display: "inline-block", padding: "4px 20px", border: "1px solid #7C3AED44", borderRadius: 99, fontSize: 9, color: "#7C3AED", letterSpacing: 5, textTransform: "uppercase", background: "rgba(124,58,237,0.05)" }}>
                        Certificate of Cultural Excellence
                    </div>
                </div>

                {/* Student name */}
                <div style={{ textAlign: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 6 }}>This certificate is proudly awarded to</div>
                    <div style={{ fontSize: 40, fontWeight: 700, color: "#1F1235", letterSpacing: -1, lineHeight: 1, fontStyle: "italic" }}>
                        {student.firstName} {student.lastName}
                    </div>
                    <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 6, letterSpacing: 2 }}>
                        {student.classSection} &nbsp;|&nbsp; {student.academicYear}
                    </div>
                </div>

                {/* Decorative divider */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, width: "80%", marginBottom: 10 }}>
                    <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, #EC4899)" }} />
                    <span style={{ fontSize: 16, color: "#EC4899" }}>✦</span>
                    <span style={{ fontSize: 12, color: "#F59E0B" }}>✦</span>
                    <span style={{ fontSize: 16, color: "#7C3AED" }}>✦</span>
                    <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, #7C3AED, transparent)" }} />
                </div>

                {/* Award */}
                <div style={{ textAlign: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>in recognition of exceptional talent in</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: "#7C3AED", marginBottom: 4 }}>{cert.title}</div>
                    {cert.description && <div style={{ fontSize: 11, color: "#6B7280", fontStyle: "italic" }}>{cert.description}</div>}
                </div>

                {/* Footer */}
                <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", width: "100%", alignItems: "flex-end", borderTop: "1px solid rgba(124,58,237,0.15)", paddingTop: 12 }}>
                    <div style={{ textAlign: "center", minWidth: 140 }}>
                        <div style={{ fontStyle: "italic", fontSize: 11, fontWeight: 700, color: "#374151" }}>{cert.issuedBy}</div>
                        <div style={{ width: 120, height: 1, background: "linear-gradient(90deg, #7C3AED, #EC4899)", margin: "4px 0" }} />
                        <div style={{ fontSize: 9, color: "#9CA3AF", letterSpacing: 1 }}>{cert.issuedByDesignation?.toUpperCase()}</div>
                    </div>
                    <div style={{ textAlign: "center", fontSize: 28 }}>🎨</div>
                    <div style={{ textAlign: "center", minWidth: 140 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#374151" }}>{date}</div>
                        <div style={{ width: 120, height: 1, background: "linear-gradient(90deg, #EC4899, #7C3AED)", margin: "4px 0" }} />
                        <div style={{ fontSize: 9, color: "#9CA3AF", letterSpacing: 1 }}>DATE OF ISSUE</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── 4. ATTENDANCE — Fresh green, dotted pattern, badge-centered ──────────────
export const AttendanceCertificate = ({ cert, student, school }) => {
    const date = new Date(cert.issuedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

    return (
        <div style={{
            width: 794, height: 562,
            background: "#F0FDF4",
            position: "relative", overflow: "hidden",
            fontFamily: "'Arial', sans-serif",
            boxSizing: "border-box",
        }}>
            {/* Dot grid pattern */}
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, #86EFAC55 1px, transparent 1px)", backgroundSize: "22px 22px" }} />

            {/* Green border frame */}
            <div style={{ position: "absolute", inset: 12, border: "2px solid #16A34A44", borderRadius: 4, pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 18, border: "1px dashed #16A34A33", borderRadius: 2, pointerEvents: "none" }} />

            {/* Top green bar */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: "linear-gradient(90deg, #16A34A, #22C55E, #16A34A)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, background: "linear-gradient(90deg, #16A34A, #22C55E, #16A34A)" }} />

            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", padding: "28px 52px 24px" }}>

                {/* Left: seal + details */}
                <div style={{ width: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, borderRight: "1px solid #86EFAC88", paddingRight: 24 }}>
                    <SchoolSeal schoolName={school.name} size={86} color="#16A34A" bgColor="rgba(22,163,74,0.06)" />
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "#15803D", letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>{school.name}</div>
                        <div style={{ fontSize: 8, color: "#4ADE8088", marginTop: 2 }}>{school.city}</div>
                    </div>
                    {/* Big checkmark badge */}
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #22C55E, #16A34A)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px rgba(34,197,94,0.4)" }}>
                        <span style={{ fontSize: 30 }}>✅</span>
                    </div>
                    <div style={{ fontSize: 9, color: "#15803D", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", textAlign: "center" }}>
                        100% Present
                    </div>
                </div>

                {/* Right: main content */}
                <div style={{ flex: 1, paddingLeft: 28, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                        <div style={{ fontSize: 9, color: "#16A34A", letterSpacing: 6, textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>
                            Certificate of Perfect Attendance
                        </div>

                        <div style={{ fontSize: 12, color: "#4B5563", marginBottom: 8 }}>This is to certify that</div>

                        <div style={{ fontSize: 34, fontWeight: 900, color: "#14532D", marginBottom: 4, lineHeight: 1.1, letterSpacing: -0.5 }}>
                            {student.firstName} {student.lastName}
                        </div>

                        <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 20, letterSpacing: 1 }}>
                            CLASS {student.classSection?.toUpperCase()} &nbsp;·&nbsp; {student.academicYear}
                        </div>

                        <div style={{ background: "rgba(22,163,74,0.08)", border: "1px solid #86EFAC", borderRadius: 8, padding: "12px 20px", marginBottom: 12 }}>
                            <div style={{ fontSize: 9, color: "#16A34A", letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>Achievement</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: "#14532D" }}>{cert.title}</div>
                            {cert.description && <div style={{ fontSize: 10, color: "#15803D", marginTop: 4 }}>{cert.description}</div>}
                            {cert.achievementText && cert.achievementText !== cert.title && (
                                <div style={{ fontSize: 10, color: "#4ADE80", marginTop: 2 }}>{cert.achievementText}</div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "1px solid #86EFAC66", paddingTop: 12 }}>
                        <div>
                            <div style={{ fontStyle: "italic", fontSize: 11, fontWeight: 700, color: "#1F2937" }}>{cert.issuedBy}</div>
                            <div style={{ width: 120, height: 1, background: "#16A34A", marginTop: 4 }} />
                            <div style={{ fontSize: 9, color: "#6B7280", letterSpacing: 1, marginTop: 2 }}>{cert.issuedByDesignation?.toUpperCase()}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#1F2937" }}>{date}</div>
                            <div style={{ fontSize: 9, color: "#9CA3AF" }}>Date of Issue</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── 5. DISCIPLINE — Deep navy blue, shield crest, formal & authoritative ─────
export const DisciplineCertificate = ({ cert, student, school }) => {
    const date = new Date(cert.issuedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

    return (
        <div style={{
            width: 794, height: 562,
            background: "linear-gradient(160deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)",
            position: "relative", overflow: "hidden",
            fontFamily: "'Georgia', serif",
            boxSizing: "border-box",
            color: "#E2E8F0",
        }}>
            {/* Gold border frame */}
            <div style={{ position: "absolute", inset: 10, border: "2px solid #CA8A0422", pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 14, border: "1px solid #CA8A0411", pointerEvents: "none" }} />

            {/* Gold corner marks */}
            {[
                { top: 8, left: 8 }, { top: 8, right: 8 },
                { bottom: 8, left: 8 }, { bottom: 8, right: 8 }
            ].map((pos, i) => (
                <div key={i} style={{ position: "absolute", ...pos, color: "#CA8A04", fontSize: 18 }}>✦</div>
            ))}

            {/* Subtle grid lines */}
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(202,138,4,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(202,138,4,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

            {/* Right: large shield/crest */}
            <div style={{ position: "absolute", right: 40, top: "50%", transform: "translateY(-50%)", opacity: 0.06, fontSize: 200 }}>🛡️</div>

            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", padding: "28px 50px 24px" }}>

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
                    <SchoolSeal schoolName={school.name} size={78} color="#CA8A04" bgColor="rgba(202,138,4,0.06)" textColor="#CA8A04" />
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#CA8A04", letterSpacing: 5, textTransform: "uppercase" }}>{school.name}</div>
                        <div style={{ fontSize: 9, color: "#64748B", letterSpacing: 2, marginTop: 2 }}>{school.city} &nbsp;·&nbsp; Office of Student Affairs</div>
                        <div style={{ width: 200, height: 1, background: "linear-gradient(90deg, #CA8A04, transparent)", marginTop: 8 }} />
                    </div>
                </div>

                {/* Center content */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ fontSize: 9, color: "#CA8A04", letterSpacing: 8, textTransform: "uppercase", marginBottom: 10 }}>
                        Certificate of Discipline & Character
                    </div>

                    <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 6, fontStyle: "italic" }}>
                        Be it known to all that
                    </div>

                    <div style={{ fontSize: 40, fontWeight: 700, color: "#F8FAFC", letterSpacing: -1, marginBottom: 6, lineHeight: 1 }}>
                        {student.firstName} {student.lastName}
                    </div>

                    <div style={{ fontSize: 10, color: "#64748B", letterSpacing: 2, marginBottom: 20 }}>
                        CLASS {student.classSection?.toUpperCase()} &nbsp;·&nbsp; {student.academicYear}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
                        <div style={{ flex: 1, height: 1, background: "rgba(202,138,4,0.3)" }} />
                        <span style={{ color: "#CA8A04", fontSize: 14 }}>✦</span>
                        <div style={{ flex: 1, height: 1, background: "rgba(202,138,4,0.3)" }} />
                    </div>

                    <div style={{ marginBottom: 4 }}>
                        <div style={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic", marginBottom: 6 }}>
                            has demonstrated exemplary conduct and been awarded
                        </div>
                        <div style={{ fontSize: 26, fontWeight: 700, color: "#CA8A04" }}>{cert.title}</div>
                        {cert.description && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{cert.description}</div>}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "1px solid rgba(202,138,4,0.2)", paddingTop: 14 }}>
                    <div>
                        <div style={{ fontStyle: "italic", fontSize: 11, fontWeight: 700, color: "#CBD5E1" }}>{cert.issuedBy}</div>
                        <div style={{ width: 120, height: 1, background: "#CA8A04", marginTop: 4 }} />
                        <div style={{ fontSize: 9, color: "#64748B", letterSpacing: 1, marginTop: 2 }}>{cert.issuedByDesignation?.toUpperCase()}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 32 }}>🛡️</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#CBD5E1" }}>{date}</div>
                        <div style={{ fontSize: 9, color: "#64748B" }}>Date of Issue</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── 6. LEADERSHIP — Premium warm gold-black, executive, embossed feel ────────
export const LeadershipCertificate = ({ cert, student, school }) => {
    const date = new Date(cert.issuedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

    return (
        <div style={{
            width: 794, height: 562,
            background: "#FFFBF0",
            position: "relative", overflow: "hidden",
            fontFamily: "'Georgia', serif",
            boxSizing: "border-box",
        }}>
            {/* Rich gold top band */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 100, background: "linear-gradient(135deg, #78350F, #92400E, #B45309)" }} />
            {/* Gold bottom band */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 14, background: "linear-gradient(135deg, #78350F, #92400E, #B45309)" }} />

            {/* Ornamental wavy line on top band */}
            <div style={{ position: "absolute", top: 96, left: 0, right: 0, height: 8, background: "linear-gradient(90deg, #FFFBF0, #DAA520, #FFFBF0, #DAA520, #FFFBF0)" }} />

            {/* Crown watermark */}
            <div style={{ position: "absolute", right: 60, bottom: 60, fontSize: 180, opacity: 0.04, userSelect: "none" }}>👑</div>

            {/* Thin border inside */}
            <div style={{ position: "absolute", inset: 22, insetBlockStart: 116, border: "1px solid #B4530933", pointerEvents: "none" }} />

            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column" }}>

                {/* Top band content */}
                <div style={{ height: 104, display: "flex", alignItems: "center", padding: "0 40px", gap: 20, overflow: "hidden" }}>
                    <SchoolSeal schoolName={school.name} size={72} color="rgba(255,251,240,0.9)" bgColor="rgba(255,255,255,0.08)" textColor="rgba(255,251,240,0.9)" />
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#FEFCE8", letterSpacing: 5, textTransform: "uppercase" }}>{school.name}</div>
                        <div style={{ fontSize: 9, color: "rgba(255,251,240,0.6)", letterSpacing: 2, marginTop: 2 }}>Office of Leadership & Excellence</div>
                    </div>
                    <div style={{ marginLeft: "auto", fontSize: 44, flexShrink: 0, lineHeight: 1, display: "flex", alignItems: "center" }}>👑</div>
                </div>

                {/* Main content */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px 60px 0" }}>
                    <div style={{ fontSize: 9, color: "#92400E", letterSpacing: 7, textTransform: "uppercase", marginBottom: 12 }}>
                        Certificate of Leadership Excellence
                    </div>

                    <div style={{ fontSize: 12, color: "#78716C", marginBottom: 6 }}>
                        This certificate is presented with honour to
                    </div>

                    <div style={{ fontSize: 42, fontWeight: 700, color: "#1C1917", letterSpacing: -1, marginBottom: 4, fontStyle: "italic", textAlign: "center" }}>
                        {student.firstName} {student.lastName}
                    </div>

                    <div style={{ fontSize: 10, color: "#A8A29E", letterSpacing: 2, marginBottom: 16 }}>
                        CLASS {student.classSection?.toUpperCase()} &nbsp;·&nbsp; {student.academicYear}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "70%", marginBottom: 12 }}>
                        <svg style={{ flex: 1 }} height="2" xmlns="http://www.w3.org/2000/svg">
                            <line x1="0" y1="1" x2="100%" y2="1" stroke="#B45309" strokeWidth="1" />
                        </svg>
                        <span style={{ color: "#B45309" }}>❋</span>
                        <svg style={{ flex: 1 }} height="2" xmlns="http://www.w3.org/2000/svg">
                            <line x1="0" y1="1" x2="100%" y2="1" stroke="#B45309" strokeWidth="1" />
                        </svg>
                    </div>

                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "#78716C", marginBottom: 6 }}>in recognition of exceptional</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: "#92400E" }}>{cert.title}</div>
                        {cert.description && <div style={{ fontSize: 11, color: "#78716C", fontStyle: "italic", marginTop: 4 }}>{cert.description}</div>}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: "14px 60px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <div style={{ textAlign: "center", minWidth: 150 }}>
                        <div style={{ fontStyle: "italic", fontSize: 11, fontWeight: 700, color: "#1C1917" }}>{cert.issuedBy}</div>
                        <div style={{ width: 130, height: 1, background: "#B45309", margin: "4px auto" }} />
                        <div style={{ fontSize: 9, color: "#A8A29E", letterSpacing: 1 }}>{cert.issuedByDesignation?.toUpperCase()}</div>
                    </div>
                    <div style={{ textAlign: "center", minWidth: 150 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#1C1917" }}>{date}</div>
                        <div style={{ width: 130, height: 1, background: "#B45309", margin: "4px auto" }} />
                        <div style={{ fontSize: 9, color: "#A8A29E", letterSpacing: 1 }}>DATE OF ISSUE</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── 7. SPECIAL — Dark luxury editorial, gold foil, geometric diamond ────────
// ─── 7. SPECIAL — Dark luxury, fully balanced layout ─────────────────────────
export const SpecialCertificate = ({ cert, student, school }) => {
    const date = new Date(cert.issuedDate).toLocaleDateString("en-IN", {
        day: "2-digit", month: "long", year: "numeric",
    });

    return (
        <div style={{
            width: 794, height: 562,
            background: "#080808",
            position: "relative", overflow: "hidden",
            fontFamily: "'Georgia', serif",
            boxSizing: "border-box",
        }}>

            {/* ── Gold border frame ── */}
            <div style={{ position: "absolute", inset: 0, border: "6px solid #C9A84C", pointerEvents: "none", zIndex: 10 }} />
            <div style={{ position: "absolute", inset: 12, border: "1px solid rgba(201,168,76,0.25)", pointerEvents: "none", zIndex: 10 }} />

            {/* ── Subtle dot grid ── */}
            <div style={{
                position: "absolute", inset: 0,
                backgroundImage: "radial-gradient(circle, rgba(201,168,76,0.07) 1px, transparent 1px)",
                backgroundSize: "30px 30px",
            }} />

            {/* ── Diamond BG shapes ── */}
            <div style={{
                position: "absolute", right: 70, top: "50%",
                transform: "translateY(-50%) rotate(45deg)",
                width: 240, height: 240,
                border: "1px solid rgba(201,168,76,0.18)",
                pointerEvents: "none",
            }} />
            <div style={{
                position: "absolute", right: 90, top: "50%",
                transform: "translateY(-50%) rotate(45deg)",
                width: 180, height: 180,
                border: "1px solid rgba(201,168,76,0.10)",
                background: "rgba(201,168,76,0.03)",
                pointerEvents: "none",
            }} />

            {/* ══ MAIN LAYOUT ══ */}
            <div style={{
                position: "relative", zIndex: 2,
                width: "100%", height: "100%",
                display: "flex", flexDirection: "column",
                padding: "24px 36px 20px 36px",
                boxSizing: "border-box",
            }}>

                {/* ── ROW 1: Header ── */}
                <div style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between",
                    paddingBottom: 14,
                    borderBottom: "1px solid rgba(201,168,76,0.2)",
                    marginBottom: 16,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <SchoolSeal
                            schoolName={school.name} size={52}
                            color="#C9A84C" bgColor="rgba(201,168,76,0.06)"
                            textColor="#C9A84C"
                        />
                        <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#C9A84C", letterSpacing: 3, textTransform: "uppercase", fontFamily: "'Arial', sans-serif" }}>
                                {school.name}
                            </div>
                            <div style={{ fontSize: 8, color: "rgba(201,168,76,0.55)", letterSpacing: 2, marginTop: 2, fontFamily: "'Arial', sans-serif" }}>
                                {school.city}
                            </div>
                        </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 8, color: "#C9A84C", letterSpacing: 5, textTransform: "uppercase", fontFamily: "'Arial', sans-serif", lineHeight: 1.8 }}>
                            Certificate of Special Achievement
                        </div>
                    </div>
                </div>

                {/* ── ROW 2: Main content ── */}
                <div style={{ flex: 1, display: "flex", gap: 28 }}>

                    {/* LEFT: name + award */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontStyle: "italic", marginBottom: 5 }}>
                            In rare recognition, this honour is bestowed upon
                        </div>

                        <div style={{ fontSize: 46, fontWeight: 700, color: "#FFFFFF", lineHeight: 1, letterSpacing: -1.5, marginBottom: 8 }}>
                            {student.firstName} {student.lastName}
                        </div>

                        <svg width="160" height="2" style={{ marginBottom: 8 }} xmlns="http://www.w3.org/2000/svg">
                            <line x1="0" y1="1" x2="160" y2="1" stroke="#C9A84C" strokeWidth="1.5" />
                        </svg>

                        <div style={{ fontSize: 9, color: "#C9A84C", letterSpacing: 3, marginBottom: 16, fontFamily: "'Arial', sans-serif" }}>
                            CLASS {student.classSection?.toUpperCase()} &nbsp;·&nbsp; {student.academicYear}
                        </div>

                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontStyle: "italic", marginBottom: 4 }}>
                            for extraordinary achievement in
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: "#F0D080", letterSpacing: -0.3, marginBottom: 5 }}>
                            {cert.title}
                        </div>
                        {cert.description && (
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontStyle: "italic" }}>
                                {cert.description}
                            </div>
                        )}
                        {cert.teamName && (
                            <div style={{ fontSize: 9, color: "rgba(201,168,76,0.6)", marginTop: 4, fontFamily: "'Arial', sans-serif" }}>
                                Team: {cert.teamName}
                            </div>
                        )}
                    </div>

                    {/* RIGHT: badge panel */}
                    <div style={{
                        width: 168,
                        borderLeft: "1px solid rgba(201,168,76,0.18)",
                        paddingLeft: 24,
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        gap: 12,
                    }}>
                        <div style={{ fontSize: 44 }}>⭐</div>

                        <div style={{
                            border: "1px solid rgba(201,168,76,0.4)",
                            background: "rgba(201,168,76,0.06)",
                            padding: "12px 16px",
                            textAlign: "center", width: "100%",
                        }}>
                            <div style={{ fontSize: 22, marginBottom: 6 }}>💎</div>
                            <div style={{ fontSize: 8, color: "#C9A84C", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Arial', sans-serif", lineHeight: 1.8 }}>
                                Special<br />Achievement<br />Award
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 8, fontSize: 10, color: "#C9A84C" }}>
                            ✦ ✦ ✦
                        </div>
                    </div>
                </div>

                {/* ── ROW 3: Footer ── */}
                <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "flex-end",
                    paddingTop: 12, borderTop: "1px solid rgba(201,168,76,0.2)", marginTop: 14,
                }}>
                    <div>
                        <div style={{ fontStyle: "italic", fontSize: 11, fontWeight: 700, color: "#E2D5B0" }}>
                            {cert.issuedBy}
                        </div>
                        <svg width="130" height="1" style={{ marginTop: 4, display: "block" }} xmlns="http://www.w3.org/2000/svg">
                            <line x1="0" y1="1" x2="130" y2="1" stroke="#C9A84C" strokeWidth="0.8" />
                        </svg>
                        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", letterSpacing: 2, marginTop: 3, fontFamily: "'Arial', sans-serif" }}>
                            {cert.issuedByDesignation?.toUpperCase()}
                        </div>
                    </div>
                    <div style={{ fontSize: 18 }}>🏅</div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "#C9A84C", fontWeight: 700 }}>{date}</div>
                        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", fontFamily: "'Arial', sans-serif", marginTop: 2 }}>
                            Date of Issue
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

// ─── Master picker — one design per category ──────────────────────────────────
export function CertificateDesign({ cert, student, school }) {
    const cat = cert.category;
    const src = cert.source;

    // Source=EVENT always picks based on category or Sports as fallback
    if (cat === "SPORTS" || (src === "EVENT" && !cat))
        return <SportsCertificate cert={cert} student={student} school={school} />;
    if (cat === "ATTENDANCE")
        return <AttendanceCertificate cert={cert} student={student} school={school} />;
    if (cat === "CULTURAL")
        return <CulturalCertificate cert={cert} student={student} school={school} />;
    if (cat === "DISCIPLINE")
        return <DisciplineCertificate cert={cert} student={student} school={school} />;
    if (cat === "LEADERSHIP")
        return <LeadershipCertificate cert={cert} student={student} school={school} />;
    if (cat === "SPECIAL")
        return <SpecialCertificate cert={cert} student={student} school={school} />;
    // ACADEMIC + fallback
    return <AcademicCertificate cert={cert} student={student} school={school} />;
}