import React, { useEffect, useState } from "react";
import { IndianRupee, CreditCard, CheckCircle, AlertCircle, Clock, Loader2, BookOpen, TrendingUp } from "lucide-react";
import { PayModal } from "../../../finance/pages/Studentfinance/PayModal";

const API_URL = import.meta.env.VITE_API_URL;

// ── Design tokens (identical to Timetable) ────────────────────
const C = {
  slate: "#6A89A7",
  mist: "#BDDDFC",
  sky: "#88BDF2",
  deep: "#384959",
  deepDark: "#243340",
  bg: "#EDF3FA",
  white: "#FFFFFF",
  border: "#C8DCF0",
  borderLight: "#DDE9F5",
  text: "#243340",
  textLight: "#6A89A7",
  green: "#22c55e",
  amber: "#f59e0b",
  orange: "#f97316",
  red: "#ef4444",
};

const F = { fontFamily: "'Inter', sans-serif" };

// ── Responsive hook ───────────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const handle = () => setW(window.innerWidth);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);
  return w;
}

// ── Pulse skeleton ────────────────────────────────────────────
function Pulse({ w = "100%", h = 13, r = 8 }) {
  return (
    <div
      className="animate-pulse"
      style={{ width: w, height: h, borderRadius: r, background: `${C.mist}55` }}
    />
  );
}

// ── Loading skeleton ──────────────────────────────────────────
function LoadingSkeleton({ isMobile }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{
            background: C.white,
            borderRadius: 14,
            border: `1.5px solid ${C.borderLight}`,
            overflow: "hidden",
          }}
        >
          <div style={{ height: 64, background: `${C.mist}55` }} />
          <div style={{ padding: isMobile ? "14px" : "18px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[1, 2, 3].map(j => <Pulse key={j} h={56} r={10} />)}
            </div>
            <Pulse h={8} r={8} />
            <Pulse w="40%" h={36} r={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

function FeesAndPayments() {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const width = useWindowWidth();
  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;
  const pagePadding = isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px";

  useEffect(() => {
    fetchFees();
  }, []);

  const fetchFees = async () => {
    setLoading(true);
    try {
      const auth = JSON.parse(localStorage.getItem("auth"));
      const token = auth?.token;

      const res = await fetch(`${API_URL}/api/parent/fees`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setFees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch fees error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Aggregate KPIs ────────────────────────────────────────
  const totalFeesAll = fees.reduce((a, s) => a + Number(s.fees || 0), 0);
  const totalPaidAll = fees.reduce((a, s) => a + Number(s.paidAmount || 0), 0);
  const totalDueAll = Math.max(0, totalFeesAll - totalPaidAll);
  const collectionPct = totalFeesAll > 0 ? Math.min(100, Math.round((totalPaidAll / totalFeesAll) * 100)) : 0;

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: ${C.sky}; border-radius: 99px; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.38s ease forwards; opacity: 0; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .fade-in { animation: fadeIn 0.3s ease forwards; opacity: 0; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .fee-card {
          background: ${C.white};
          border-radius: 14px;
          border: 1.5px solid ${C.borderLight};
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(56,73,89,0.05);
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .fee-card:hover {
          box-shadow: 0 8px 24px ${C.sky}28;
          transform: translateY(-2px);
        }
        .pay-btn:hover { opacity: 0.88 !important; }
        .stat-card {
          background: ${C.white};
          border-radius: 14px;
          border: 1.5px solid ${C.borderLight};
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 2px 10px rgba(56,73,89,0.05);
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: C.bg,
        padding: pagePadding,
        ...F,
        backgroundImage: `radial-gradient(circle at 10% 0%, ${C.mist}28 0%, transparent 45%)`,
      }}>

        {/* ── Page Header ── */}
        <div className="fade-up" style={{ marginBottom: isMobile ? 16 : 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 5 }}>
            <div style={{
              width: 4, height: isMobile ? 26 : 32, borderRadius: 99,
              background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`,
              flexShrink: 0,
            }} />
            <h1 style={{
              margin: 0, fontSize: isMobile ? 20 : 26,
              fontWeight: 800, color: C.text, letterSpacing: "-0.5px",
            }}>
              Fees &amp; Payments
            </h1>
          </div>
          <p style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: C.textLight, fontWeight: 500 }}>
            Fee records and payment status for your children
          </p>
        </div>

        {/* ── Stat Cards ── */}
        {!loading && fees.length > 0 && (
          <div className="fade-up" style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)",
            gap: isMobile ? 10 : 12,
            marginBottom: isMobile ? 14 : 20,
          }}>
            {[
              {
                label: "TOTAL FEES",
                value: `₹${totalFeesAll.toLocaleString("en-IN")}`,
                sub: `${fees.length} child${fees.length !== 1 ? "ren" : ""}`,
                accent: C.sky,
                icon: <IndianRupee size={isMobile ? 18 : 22} color={C.sky} />,
              },
              {
                label: "AMOUNT PAID",
                value: `₹${totalPaidAll.toLocaleString("en-IN")}`,
                sub: `${collectionPct}% collected`,
                accent: C.green,
                icon: <CheckCircle size={isMobile ? 18 : 22} color={C.green} />,
              },
              {
                label: "AMOUNT DUE",
                value: `₹${totalDueAll.toLocaleString("en-IN")}`,
                sub: totalDueAll === 0 ? "All clear!" : "Pending payment",
                accent: totalDueAll === 0 ? C.green : C.orange,
                icon: <AlertCircle size={isMobile ? 18 : 22} color={totalDueAll === 0 ? C.green : C.orange} />,
                gridColumn: isMobile ? "1 / -1" : undefined,
              },
            ].map((card) => (
              <div
                key={card.label}
                className="stat-card"
                style={{ borderTop: `3px solid ${card.accent}`, gridColumn: card.gridColumn }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: C.textLight, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                    {card.label}
                  </p>
                  <p style={{ margin: "3px 0 1px", fontSize: isMobile ? 18 : 22, fontWeight: 800, color: C.text, letterSpacing: "-0.5px", lineHeight: 1 }}>
                    {card.value}
                  </p>
                  <p style={{ margin: 0, fontSize: 10, color: C.textLight }}>{card.sub}</p>
                </div>
                <div style={{
                  width: isMobile ? 36 : 42, height: isMobile ? 36 : 42, borderRadius: 11,
                  background: `${card.accent}15`, border: `1px solid ${card.accent}30`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  {card.icon}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Collection Progress ── */}
        {!loading && fees.length > 0 && (
          <div className="fade-up" style={{
            background: C.white, borderRadius: 14,
            border: `1.5px solid ${C.borderLight}`,
            padding: isMobile ? "12px 14px" : "14px 20px",
            marginBottom: isMobile ? 14 : 20,
            boxShadow: "0 2px 10px rgba(56,73,89,0.05)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <TrendingUp size={13} color={C.textLight} />
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Collection Progress
                </p>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, color: C.deep,
                background: `${C.sky}18`, border: `1px solid ${C.sky}33`,
                borderRadius: 20, padding: "2px 10px",
              }}>
                {collectionPct}% paid
              </span>
            </div>
            <div style={{ height: 10, background: C.borderLight, borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${collectionPct}%`,
                background: `linear-gradient(90deg, ${C.sky}, ${C.deep})`,
                borderRadius: 99, transition: "width 0.6s ease",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
              <span style={{ fontSize: 10, color: C.textLight }}>₹0</span>
              <span style={{ fontSize: 10, color: C.textLight }}>₹{totalFeesAll.toLocaleString("en-IN")}</span>
            </div>
          </div>
        )}

        {/* ── Loading spinner ── */}
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <Loader2 size={28} color={C.sky} style={{ animation: "spin 0.9s linear infinite" }} />
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && fees.length === 0 && (
          <div className="fade-up" style={{
            textAlign: "center", padding: "56px 24px",
            background: C.white, borderRadius: 14,
            border: `1.5px solid ${C.borderLight}`,
            boxShadow: "0 2px 10px rgba(56,73,89,0.05)",
          }}>
            <div style={{
              width: 46, height: 46, borderRadius: 13,
              background: `${C.sky}18`, border: `1px solid ${C.sky}33`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 12px",
            }}>
              <IndianRupee size={20} color={C.sky} />
            </div>
            <p style={{ fontWeight: 700, margin: 0, fontSize: 14, color: C.text }}>No fee records found</p>
            <p style={{ fontSize: 12, margin: "5px 0 0", color: C.textLight }}>
              No fee records are linked to your children yet.
            </p>
          </div>
        )}

        {/* ── Fee Cards ── */}
        {!loading && fees.length > 0 && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: isMobile ? 12 : 16 }}>
            {fees.map((student) => {
              const total = Number(student.fees || 0);
              const paid = Number(student.paidAmount || 0);
              const due = Math.max(0, total - paid);
              const pct = Math.min(100, total > 0 ? Math.round((paid / total) * 100) : 0);
              const isPaid = due === 0 && total > 0;
              const isPartial = paid > 0 && due > 0;
              const statusColor = isPaid ? C.green : isPartial ? C.amber : C.orange;
              const statusLabel = isPaid ? "PAID" : isPartial ? "PARTIAL" : "DUE";
              const StatusIcon = isPaid ? CheckCircle : isPartial ? Clock : AlertCircle;

              let breakdown = null;
              try {
                breakdown = student.feeBreakdown ? JSON.parse(student.feeBreakdown) : null;
              } catch { }

              return (
                <div key={student.id} className="fee-card">

                  {/* Card header */}
                  <div style={{
                    background: `linear-gradient(135deg, ${C.deepDark}, ${C.deep})`,
                    padding: isMobile ? "14px 16px" : "16px 22px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: `${C.sky}28`, border: `1px solid ${C.sky}44`,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <BookOpen size={16} color={C.sky} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: isMobile ? 14 : 15, fontWeight: 700, color: C.white }}>{student.name}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 10, color: `${C.mist}99` }}>{student.course}</p>
                      </div>
                    </div>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: 10, fontWeight: 700,
                      background: `${statusColor}22`, color: statusColor,
                      border: `1px solid ${statusColor}44`,
                      borderRadius: 20, padding: "4px 12px", flexShrink: 0,
                    }}>
                      <StatusIcon size={10} /> {statusLabel}
                    </span>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: isMobile ? "14px 16px" : "18px 22px" }}>

                    {/* Amount pills */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: isMobile ? 8 : 10, marginBottom: 14 }}>
                      {[
                        { lbl: "Total Fees", val: `₹${total.toLocaleString("en-IN")}`, accent: C.sky },
                        { lbl: "Amount Paid", val: `₹${paid.toLocaleString("en-IN")}`, accent: C.green },
                        { lbl: "Pending", val: `₹${due.toLocaleString("en-IN")}`, accent: due > 0 ? C.orange : C.green },
                      ].map((s) => (
                        <div key={s.lbl} style={{
                          background: C.bg, border: `1.5px solid ${C.borderLight}`,
                          borderTop: `3px solid ${s.accent}`,
                          borderRadius: 10, padding: isMobile ? "8px 10px" : "10px 14px",
                        }}>
                          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                            {s.lbl}
                          </p>
                          <p style={{ margin: "3px 0 0", fontSize: isMobile ? 13 : 15, fontWeight: 800, color: C.text, letterSpacing: "-0.3px" }}>
                            {s.val}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Progress bar */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                          Payment Progress
                        </p>
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: C.deep,
                          background: `${C.sky}18`, border: `1px solid ${C.sky}33`,
                          borderRadius: 20, padding: "1px 8px",
                        }}>
                          {pct}%
                        </span>
                      </div>
                      <div style={{ height: 8, background: C.borderLight, borderRadius: 99, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${pct}%`,
                          background: isPaid
                            ? `linear-gradient(90deg, ${C.green}, #16a34a)`
                            : `linear-gradient(90deg, ${C.sky}, ${C.deep})`,
                          borderRadius: 99, transition: "width 0.5s ease",
                        }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                        <span style={{ fontSize: 10, color: C.textLight }}>₹0</span>
                        <span style={{ fontSize: 10, color: C.textLight }}>
                          {isPaid ? "✓ Fully Paid" : `₹${due.toLocaleString("en-IN")} remaining`}
                        </span>
                        <span style={{ fontSize: 10, color: C.textLight }}>₹{total.toLocaleString("en-IN")}</span>
                      </div>
                    </div>

                    {/* Fee breakdown */}
                    {breakdown && (
                      <div style={{
                        background: C.bg, border: `1.5px solid ${C.borderLight}`,
                        borderRadius: 10, padding: isMobile ? "10px 12px" : "12px 16px", marginBottom: 14,
                      }}>
                        <p style={{ margin: "0 0 8px", fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Fee Breakdown
                        </p>
                        {Object.entries(breakdown)
                          .filter(([k, v]) => k !== "customFees" && Number(v) > 0)
                          .map(([k, v]) => (
                            <div key={k} style={{
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              padding: "5px 0", borderBottom: `1px solid ${C.borderLight}`,
                              fontSize: 12,
                            }}>
                              <span style={{ color: C.textLight }}>
                                {k.replace(/Fee$/, "").replace(/([A-Z])/g, " $1").trim()} Fee
                              </span>
                              <span style={{ fontWeight: 700, color: C.deep }}>
                                ₹{Number(v).toLocaleString("en-IN")}
                              </span>
                            </div>
                          ))}
                        {breakdown.customFees?.filter(c => Number(c.amount) > 0).map((c, i) => (
                          <div key={i} style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "5px 0", borderBottom: `1px solid ${C.borderLight}`,
                            fontSize: 12,
                          }}>
                            <span style={{ color: C.textLight }}>{c.label || "Custom Fee"}</span>
                            <span style={{ fontWeight: 700, color: C.deep }}>₹{Number(c.amount).toLocaleString("en-IN")}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pay button */}
                    {due > 0 && (
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="pay-btn"
                        style={{
                          width: "100%", padding: isMobile ? "10px" : "12px",
                          borderRadius: 10, border: "none",
                          background: `linear-gradient(135deg, ${C.deep}, ${C.deepDark})`,
                          color: C.white, fontWeight: 700,
                          fontSize: isMobile ? 13 : 14, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                          ...F, transition: "opacity 0.15s", opacity: 1,
                          boxShadow: `0 3px 12px ${C.deep}44`,
                        }}
                      >
                        <CreditCard size={15} />
                        Pay Now — ₹{due.toLocaleString("en-IN")}
                      </button>
                    )}

                    {isPaid && (
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                        padding: "9px 14px",
                        background: `${C.green}12`, border: `1px solid ${C.green}33`,
                        borderRadius: 10,
                      }}>
                        <CheckCircle size={14} color={C.green} />
                        <span style={{ color: C.green, fontWeight: 700, fontSize: 13 }}>
                          All fees have been paid!
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PAYMENT MODAL (reuse yours) */}
      {selectedStudent && (
        <PayModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onPaymentDone={() => {
            setSelectedStudent(null);
            fetchFees();
          }}
        />
      )}
    </>
  );
}

export default FeesAndPayments;