import { useState, useEffect } from "react";
import { getStudentFees, getParentStudents } from "../Profile/components/api";
import { getAuth } from "../../../auth/storage"; // adjust path as needed

// ── Main Fees & Payments Page ─────────────────────────────────────────────────
const FeesAndPayments = () => {
    const [students, setStudents] = useState([]);
    const [feesData, setFeesData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedIdx, setSelectedIdx] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const auth = getAuth();
                console.log("AUTH:", auth);
                const userType = auth?.user?.role;
                console.log("ROLE:", userType);

                if (userType?.toLowerCase() === "parent") {
                    const data = await getParentStudents();
                    console.log("PARENT STUDENTS:", data);
                    setStudents(data || []);
                } else {
                    const { getMyProfile } = await import("../Profile/components/api");
                    const data = await getMyProfile();
                    setStudents(data ? [data] : []);
                }
            } catch (err) {
                console.error("FETCH ERROR:", err.response?.data || err.message);
                setError("Failed to load student data.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (!students.length) return;
        const fetchFees = async () => {
            try {
                const studentId = students[selectedIdx]?.id;
                const data = await getStudentFees(studentId);
                setFeesData(data || {});
            } catch (err) {
                console.error(err.message);
                setFeesData({});
            }
        };
        fetchFees();
    }, [students, selectedIdx]);

    if (loading) return <div className="p-6 text-center text-gray-500">Loading...</div>;
    if (error) return <div className="p-6 text-center text-red-500">{error}</div>;
    if (!students.length) return <div className="p-6 text-center text-gray-500">No student data found.</div>;

    const student = students[selectedIdx];
    const p = student?.personalInfo || {};
    const fees = feesData || {};

    const studentName = `${p.firstName || ""} ${p.lastName || ""}`.trim() || student.name || "—";
    const gradeSection = p.grade && p.className
        ? `Grade ${p.grade} • Section ${p.className}`
        : p.grade || p.className || "—";

    const totalFees = fees.totalFees;
    const amountPaid = fees.paidAmount;
    const amountDue = fees.pendingAmount;
    const dueDate = fees.nextDueDate;
    const outstandingBalance = fees.pendingAmount;

    const paymentHistory = (fees.feeRecords || []).filter(f => f.status === "Paid");

    const isParentWithMultiple = students.length > 1;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">

            {/* ── Breadcrumb + Title ── */}
            <p className="text-xs text-gray-400 mb-0.5">Parent CRM</p>
            <h1 className="text-xl font-bold text-gray-900 mb-5">Student Fees</h1>

            {/* ── Child Switcher (only shown when parent has multiple children) ── */}
            {isParentWithMultiple && (
                <div className="mb-5 flex gap-3 flex-wrap">
                    {students.map((s, idx) => {
                        const sp = s.personalInfo;
                        const label = sp ? `${sp.firstName} ${sp.lastName}` : s.name;
                        return (
                            <button
                                key={s.id}
                                onClick={() => setSelectedIdx(idx)}
                                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all border-2 ${selectedIdx === idx
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-blue-600 border-blue-300 hover:border-blue-500"
                                    }`}
                            >
                                {label}
                                {sp?.grade && (
                                    <span className="ml-2 text-xs opacity-75">Gr. {sp.grade}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Student Info Card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4 flex items-center gap-4 mb-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                        <path d="M6 12v5c3 3 9 3 12 0v-5" />
                    </svg>
                </div>
                <div>
                    <p className="font-semibold text-gray-900 text-base">{studentName}</p>
                    <p className="text-sm text-gray-500">{gradeSection}</p>
                </div>
            </div>

            {/* ── 3 Stat Cards ── */}
            <div className="grid grid-cols-3 gap-4 mb-4">
                {/* Total Fees */}
                <div className="bg-white rounded-2xl border border-gray-200 px-5 py-5">
                    <p className="text-sm text-gray-500 mb-2">Total Fees</p>
                    <p className="text-2xl font-bold text-gray-900">
                        {totalFees ? `₹${Number(totalFees).toLocaleString('en-IN')}` : "—"}
                    </p>
                </div>

                {/* Amount Paid */}
                <div className="bg-white rounded-2xl border border-gray-200 px-5 py-5">
                    <p className="text-sm text-gray-500 mb-2">Amount Paid</p>
                    <p className="text-2xl font-bold text-green-600">
                        {amountPaid ? `₹${Number(amountPaid).toLocaleString('en-IN')}` : "—"}
                    </p>
                </div>

                {/* Amount Due */}
                <div className="bg-white rounded-2xl border border-gray-200 px-5 py-5">
                    <p className="text-sm text-gray-500 mb-2">Amount Due</p>
                    <p className="text-2xl font-bold text-red-500">
                        {amountDue ? `₹${Number(amountDue).toLocaleString('en-IN')}` : "—"}
                    </p>
                    {dueDate && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <path d="M16 2v4M8 2v4M3 10h18" />
                            </svg>
                            Due by {dueDate?.slice?.(0, 10) || dueDate}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Outstanding Balance ── */}
            <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4 flex items-center justify-between mb-4">
                <div>
                    <p className="text-sm font-semibold text-gray-800 mb-1">Outstanding Balance</p>
                    <p className="text-2xl font-bold text-red-500">
                        {outstandingBalance ? `₹${Number(outstandingBalance).toLocaleString('en-IN')}` : "—"}
                    </p>
                </div>
                <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <path d="M2 10h20" />
                    </svg>
                    Pay Now
                </button>
            </div>

            {/* ── Payment History ── */}
            <div className="bg-white rounded-2xl border border-gray-200 px-5 py-5">
                {/* Section Header */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <path d="M4 2h16v20l-2-1-2 1-2-1-2 1-2-1-2 1V2z" />
                            <path d="M8 7h8M8 11h8M8 15h4" />
                        </svg>
                    </div>
                    <h2 className="text-base font-bold text-gray-800">Payment History</h2>
                </div>

                {/* History Rows */}
                {paymentHistory.length === 0 ? (
                    <div className="text-center text-gray-400 py-8 text-sm">No payment history found.</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {paymentHistory.map((fee, idx) => (
                            <div key={idx} className="flex items-center justify-between py-3.5">
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">
                                        {fee.amount ? `₹${Number(fee.amount).toLocaleString('en-IN')}` : "—"}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {fee.paidDate?.slice?.(0, 10) || fee.paidDate || "—"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5 text-green-600 text-sm font-semibold">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="m9 12 2 2 4-4" />
                                    </svg>
                                    Paid
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
};

export default FeesAndPayments;