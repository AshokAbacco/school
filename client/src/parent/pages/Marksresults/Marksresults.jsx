import { useState } from "react";

const CircularProgress = ({ percentage, color = "#22c55e", size = 120 }) => {
    const radius = 46;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="7" />
                <circle
                    cx="50" cy="50" r={radius} fill="none"
                    stroke={color}
                    strokeWidth="7"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                />
            </svg>
            <span className="absolute font-bold text-gray-800" style={{ fontSize: size * 0.2 }}>
                {percentage}%
            </span>
        </div>
    );
};

const subjectRows = Array(8).fill(null);

const MarksResults = () => {
    const [academicYear, setAcademicYear] = useState("2025-2026");
    const [test, setTest] = useState("Test");

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-800">Marks &amp; Results Page</h1>
                <span className="bg-blue-100 text-blue-700 font-bold px-4 py-1.5 rounded-full text-sm">Class Rank #21</span>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-3 bg-blue-600 rounded-xl px-4 py-3 mb-5">
                <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="bg-white text-gray-700 text-sm font-medium rounded-lg px-3 py-1.5 border-0 outline-none cursor-pointer"
                >
                    <option>2025-2026</option>
                    <option>2024-2025</option>
                    <option>2023-2024</option>
                </select>
                <select
                    value={test}
                    onChange={(e) => setTest(e.target.value)}
                    className="bg-white text-gray-700 text-sm font-medium rounded-lg px-3 py-1.5 border-0 outline-none cursor-pointer"
                >
                    <option>Test</option>
                    <option>Mid Term</option>
                    <option>Final</option>
                </select>
                <div className="flex-1" />
                <button className="flex items-center gap-2 bg-white text-blue-700 font-semibold text-sm px-4 py-1.5 rounded-lg hover:bg-blue-50 transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Result
                </button>
                <span className="bg-blue-800 text-white text-sm font-semibold px-4 py-1.5 rounded-lg">{academicYear}</span>
            </div>

            {/* Content Row */}
            <div className="flex gap-5">
                {/* Table */}
                <div className="flex-1">
                    <div className="bg-white rounded-xl shadow overflow-hidden mb-5">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        {["No", "Subject Name", "Subject Code", "Internal Marks", "External Marks", "Practical Marks", "Practical Marks", "Total Marks", "Grade", "Result", "Date"].map((h, i) => (
                                            <th key={i} className="px-2 py-3 text-left text-gray-600 font-semibold whitespace-nowrap border-r border-gray-100 last:border-r-0">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {subjectRows.map((_, idx) => (
                                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-2 py-3 border-r border-gray-100">{idx + 1}</td>
                                            {Array(10).fill(null).map((__, i) => (
                                                <td key={i} className="px-2 py-3 border-r border-gray-100 last:border-r-0">&nbsp;</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Sports & Other Points */}
                    <div className="bg-white rounded-xl shadow p-4">
                        <h3 className="font-bold text-gray-800 text-base mb-3 pb-2 border-b-2 border-blue-600">
                            Sports &amp; Other Points
                        </h3>
                        <div className="flex gap-4">
                            {[
                                { label: "Sport 1", points: "99 Points" },
                                { label: "Sport 2", points: "89 Points" },
                                { label: "Sport 3", points: "59 Points" },
                            ].map((sport, idx) => (
                                <div key={idx} className="flex items-center gap-2 flex-1">
                                    <div className="w-1 h-8 bg-blue-600 rounded-full" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">{sport.label}</p>
                                        <p className="text-sm text-gray-500">{sport.points}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right - Circular Charts */}
                <div className="flex flex-col gap-5 w-32 items-center">
                    <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center gap-2">
                        <p className="text-sm font-semibold text-gray-700">Percentage</p>
                        <CircularProgress percentage={78} color="#22c55e" size={110} />
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center gap-2">
                        <div className="relative flex items-center justify-center w-24 h-24">
                            <svg width="96" height="96" viewBox="0 0 100 100" className="-rotate-90">
                                <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="7" />
                                <circle cx="50" cy="50" r="42" fill="none" stroke="#3b82f6" strokeWidth="7"
                                    strokeDasharray={`${2 * Math.PI * 42 * 0.78} ${2 * Math.PI * 42}`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute text-center">
                                <p className="text-sm font-bold text-gray-800 leading-none">780</p>
                                <div className="w-8 h-px bg-gray-400 mx-auto my-0.5" />
                                <p className="text-xs text-gray-500">1000</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarksResults;