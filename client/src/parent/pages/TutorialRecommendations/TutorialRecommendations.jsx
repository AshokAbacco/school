import React, { useState, useEffect } from "react";
import { getToken } from "../../../auth/storage";
import { BookOpen, TrendingDown, User, Star, Phone, Monitor, MapPin, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

const C = {
  slate: "#6A89A7", mist: "#BDDDFC", sky: "#88BDF2", deep: "#384959",
  bg: "#EDF3FA", white: "#FFFFFF", border: "#C8DCF0", borderLight: "#DDE9F5",
  text: "#243340", textLight: "#6A89A7",
};

export default function TutorialRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentId, setStudentId] = useState(null);

  useEffect(() => {
    fetchStudent();
  }, []);

  async function fetchStudent() {
    try {
      const res = await fetch(`${API_URL}/api/parent/students`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await res.json();
      const sid = d.data?.[0]?.id;
      if (sid) {
        setStudentId(sid);
        fetchRecommendations(sid);
      }
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  async function fetchRecommendations(sid) {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_URL}/api/parent/tutorial-recommendations?studentId=${sid}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      const d = await res.json();
      setRecommendations(d.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const weaknessLevel = (avg) => {
    if (avg < 30) return { label: "Critical", color: "#dc2626", bg: "#fef2f2" };
    if (avg < 45) return { label: "Weak", color: "#ea580c", bg: "#fff7ed" };
    return { label: "Below Average", color: "#d97706", bg: "#fffbeb" };
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
      <Loader2 size={28} color={C.slate} style={{ animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ padding: "24px", background: C.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{ width: 4, height: 28, borderRadius: 99, background: `linear-gradient(180deg, ${C.sky}, ${C.deep})` }} />
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text }}>Tutorial Recommendations</h1>
        </div>
        <p style={{ margin: "0 0 0 14px", fontSize: 12, color: C.textLight }}>
          Subject-wise coaching suggestions based on your child's recent performance
        </p>
      </div>

      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "12px 16px", borderRadius: 12,
          background: "#fee8e8", border: "1px solid #f5b0b0",
          marginBottom: 20, fontSize: 13, color: "#8b1c1c",
        }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {recommendations.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "60px 0", gap: 12,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: `${C.mist}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <CheckCircle2 size={28} color="#16a34a" />
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.deep }}>
            All subjects are on track! 🎉
          </p>
          <p style={{ margin: 0, fontSize: 12, color: C.textLight, textAlign: "center", maxWidth: 300 }}>
            Your child is performing well. No tutorial recommendations at this time.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {recommendations.map((rec) => {
            const wl = weaknessLevel(rec.averageScore);
                const teachers = Array.isArray(rec.recommendedTeachers)
                ? [...rec.recommendedTeachers].sort((a, b) => {
                    if ((b.rankingScore ?? 0) !== (a.rankingScore ?? 0))
                        return (b.rankingScore ?? 0) - (a.rankingScore ?? 0);
                    return (b.adminPriority ?? 0) - (a.adminPriority ?? 0);
                    })
                : [];

            return (
              <div
                key={rec.id}
                style={{
                  background: C.white, borderRadius: 18,
                  border: `1.5px solid ${C.borderLight}`,
                  overflow: "hidden",
                  boxShadow: "0 2px 12px rgba(56,73,89,0.07)",
                }}
              >
                {/* Subject header */}
                <div style={{
                  padding: "16px 20px",
                  background: `linear-gradient(135deg, ${C.deep}ee, ${C.slate}cc)`,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: "rgba(255,255,255,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <BookOpen size={18} color="#fff" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff" }}>
                        {rec.subject?.name || "Subject"}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
                        Recent average · last 5 tests
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{
                      padding: "4px 10px", borderRadius: 99,
                      background: wl.bg, border: `1px solid ${wl.color}33`,
                      marginBottom: 4,
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: wl.color }}>
                        {wl.label}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <TrendingDown size={13} color="rgba(255,255,255,0.7)" />
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>
                        {rec.averageScore?.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Alert message */}
                <div style={{
                  padding: "12px 20px",
                  background: "#fffbeb",
                  borderBottom: `1px solid #fde68a`,
                  display: "flex", alignItems: "flex-start", gap: 8,
                }}>
                  <AlertCircle size={14} color="#d97706" style={{ marginTop: 1, flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>
                    Your child's average score in <strong>{rec.subject?.name}</strong> is{" "}
                    <strong>{rec.averageScore?.toFixed(1)}%</strong>, which is below the 60% threshold.
                    Consider enrolling in tutorial classes to improve performance.
                  </p>
                </div>

                {/* Teacher cards */}
                {teachers.length > 0 ? (
                  <div style={{ padding: "16px 20px" }}>
                    <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Recommended Tutors ({teachers.length})
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                      {teachers.map((t, idx) => (
                        <TeacherCard key={idx} teacher={t} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "20px", textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: 13, color: C.textLight }}>
                      No tutorial teachers available for this subject right now.
                    </p>
                  </div>
                )}

                <div style={{
                  padding: "10px 20px",
                  borderTop: `1px solid ${C.borderLight}`,
                  background: C.bg,
                }}>
                  <p style={{ margin: 0, fontSize: 10, color: C.textLight }}>
                    Last analysed: {new Date(rec.lastAnalysedAt).toLocaleDateString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TeacherCard({ teacher }) {
  const profile = teacher.teacher || teacher;
  const name = `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Teacher";

  return (
    <div style={{
      padding: "14px", borderRadius: 12,
      border: `1.5px solid ${C.borderLight}`,
      background: C.bg,
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 99, flexShrink: 0,
          background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700, color: "#fff",
        }}>
          {name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {name}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>
            {profile.designation || "Tutor"}
          </p>
        </div>
        {teacher.rankingScore && (
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Star size={11} color="#f59e0b" fill="#f59e0b" />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>
              {teacher.rankingScore?.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {teacher.monthlyFee && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 99, background: "#e8f4fd", color: "#1a6fa8" }}>
            ₹{teacher.monthlyFee}/month
          </span>
        )}
        {teacher.mode && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 99, background: "#f3e8ff", color: "#7c3aed", display: "flex", alignItems: "center", gap: 3 }}>
            {teacher.mode === "ONLINE" ? <Monitor size={9} /> : teacher.mode === "OFFLINE" ? <MapPin size={9} /> : null}
            {teacher.mode}
          </span>
        )}
        {teacher.passPercentage && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 99, background: "#f0fdf4", color: "#16a34a" }}>
            {teacher.passPercentage}% pass rate
          </span>
        )}
      </div>

      {teacher.bio && (
        <p style={{ margin: 0, fontSize: 11, color: C.textLight, lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {teacher.bio}
        </p>
      )}
    </div>
  );
}