import { useState } from "react";

// ── Percentage Circular Progress (green dual-ring style) ───────────────────
const PercentageCircle = ({ percentage }) => {
    const size = 160;
    const outerR = 70;
    const innerR = 58;
    const outerC = 2 * Math.PI * outerR;
    const innerC = 2 * Math.PI * innerR;
    const outerOffset = outerC - (percentage / 100) * outerC;
    const innerOffset = innerC - (percentage / 100) * innerC;

    return (
        <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-semibold text-gray-700">Percentage</p>
            <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox="0 0 160 160" className="-rotate-90">
                    {/* Outer ring track */}
                    <circle cx="80" cy="80" r={outerR} fill="none" stroke="#1a1a1a" strokeWidth="8" />
                    {/* Outer ring progress - dark green */}
                    <circle
                        cx="80" cy="80" r={outerR}
                        fill="none"
                        stroke="#166534"
                        strokeWidth="8"
                        strokeDasharray={outerC}
                        strokeDashoffset={outerOffset}
                        strokeLinecap="round"
                    />
                    {/* Inner ring track */}
                    <circle cx="80" cy="80" r={innerR} fill="none" stroke="#e5e7eb" strokeWidth="7" />
                    {/* Inner ring progress - bright green */}
                    <circle
                        cx="80" cy="80" r={innerR}
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="7"
                        strokeDasharray={innerC}
                        strokeDashoffset={innerOffset}
                        strokeLinecap="round"
                    />
                </svg>
                <span
                    className="absolute font-bold italic text-blue-600"
                    style={{ fontSize: '28px' }}
                >
                    {percentage}%
                </span>
            </div>
        </div>
    );
};

// ── Score Circular (blue ring, score/total) ────────────────────────────────
const ScoreCircle = ({ score, total }) => {
    const size = 160;
    const r = 68;
    const C = 2 * Math.PI * r;
    const offset = C - (score / total) * C;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox="0 0 160 160" className="-rotate-90">
                <circle cx="80" cy="80" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle
                    cx="80" cy="80" r={r}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="8"
                    strokeDasharray={C}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute text-center leading-tight">
                <p className="font-bold text-gray-800" style={{ fontSize: '26px', lineHeight: 1 }}>{score}</p>
                <div className="w-10 h-0.5 bg-gray-500 mx-auto my-1" />
                <p className="font-bold text-gray-800" style={{ fontSize: '22px', lineHeight: 1 }}>{total}</p>
            </div>
        </div>
    );
};

// ── Dropdown Button (styled like the image) ────────────────────────────────
const DropdownSelect = ({ value, onChange, options }) => (
    <div className="relative">
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="appearance-none bg-blue-700 text-white text-sm font-semibold pl-3 pr-8 py-1.5 rounded-lg border-0 outline-none cursor-pointer"
        >
            {options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
            ))}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white text-xs">▼</span>
    </div>
);

const subjectRows = Array(8).fill(null);

const MarksResults = () => {
    const [academicYear, setAcademicYear] = useState("2025-2026");
    const [test, setTest] = useState("Test");

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-800">Results Page</h1>
                <span className="bg-blue-100 text-blue-700 font-bold px-4 py-1.5 rounded-full text-sm">
                    Class Rank #21
                </span>
            </div>

            {/* ── Filter Bar ── */}
            <div className="flex items-center gap-3 bg-blue-600 rounded-xl px-4 py-2.5 mb-5">
                <DropdownSelect
                    value={academicYear}
                    onChange={setAcademicYear}
                    options={[
                        { value: "2025-2026", label: "Academic Year" },
                        { value: "2024-2025", label: "2024-2025" },
                        { value: "2023-2024", label: "2023-2024" },
                    ]}
                />
                <DropdownSelect
                    value={test}
                    onChange={setTest}
                    options={[
                        { value: "Test", label: "Test" },
                        { value: "Mid Term", label: "Mid Term" },
                        { value: "Final", label: "Final" },
                    ]}
                />
                <div className="flex-1" />
                <button className="flex items-center gap-2 bg-white text-blue-700 font-semibold text-sm px-4 py-1.5 rounded-lg hover:bg-blue-50 transition">
                    Download Result
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </button>
                <span className="bg-blue-800 text-white text-sm font-semibold px-4 py-1.5 rounded-lg">
                    {academicYear}
                </span>
            </div>

            {/* ── Content Row ── */}
            <div className="flex gap-5 items-start">
                {/* ── Left: Table + Sports ── */}
                <div className="flex-1 min-w-0">
                    {/* Table */}
                    <div className="bg-white rounded-xl shadow overflow-hidden mb-5">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-white">
                                        {["No", "Subject Name", "Subject Code", "Internal Marks", "External Marks", "Practical Marks", "Practical Marks", "Total Marks", "Grade", "Result", "Date"].map((h, i) => (
                                            <th
                                                key={i}
                                                className="px-2 py-3 text-left text-gray-600 font-semibold whitespace-nowrap border border-gray-200"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {subjectRows.map((_, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-2 py-3 border border-gray-200 text-gray-700">{idx + 1}</td>
                                            {Array(10).fill(null).map((__, i) => (
                                                <td key={i} className="px-2 py-3 border border-gray-200">&nbsp;</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Sports & Other Points */}
                    <div className="bg-white rounded-xl shadow p-4">
                        <h3 className="font-bold text-gray-800 text-base mb-3 pb-2 border-b-2 border-blue-600 italic">
                            Sports &amp; Other Points
                        </h3>
                        <div className="flex gap-4">
                            {[
                                { label: "Sport 1", points: "99 Points" },
                                { label: "Sport 2", points: "89 Points" },
                                { label: "Sport 3", points: "59 Points" },
                            ].map((sport, idx) => (
                                <div key={idx} className="flex items-center gap-2 flex-1">
                                    <div className="w-1 h-8 bg-blue-600 rounded-full flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700">{sport.label}</p>
                                        <p className="text-sm text-gray-500">{sport.points}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Right: Circular Charts ── */}
                <div className="flex flex-col gap-4 items-center flex-shrink-0">
                    {/* Percentage Circle */}
                    <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center">
                        <PercentageCircle percentage={78} />
                    </div>

                    {/* Score Circle */}
                    <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center">
                        <ScoreCircle score={780} total={1000} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarksResults;