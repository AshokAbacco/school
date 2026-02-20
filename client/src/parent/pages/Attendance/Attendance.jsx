import React, { useState } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, TrendingUp, Award, AlertCircle } from 'lucide-react';

function Attendance() {
    const [selectedYear, setSelectedYear] = useState(2026);

    // Sample attendance data
    const attendanceStats = {
        totalWorkingDays: 290,
        totalPresentDays: 263,
        totalAbsentDays: 27,
        percentage: 90.69,
    };

    // attendance data keyed by "YYYY-MM-DD"
    const attendanceData = {
        '2026-01-01': 'present', '2026-01-02': 'present', '2026-01-03': 'present',
        '2026-01-04': 'present', '2026-01-05': 'present', '2026-01-06': 'present',
        '2026-01-07': 'present', '2026-01-08': 'absent', '2026-01-09': 'absent',
        '2026-01-10': 'present', '2026-01-11': 'present', '2026-01-12': 'present',
        '2026-01-13': 'present', '2026-01-14': 'present', '2026-01-15': 'present',
        '2026-01-16': 'present', '2026-01-17': 'present', '2026-01-18': 'present',
        '2026-01-19': 'present', '2026-01-20': 'present', '2026-01-21': 'present',
        '2026-01-22': 'absent', '2026-01-23': 'absent', '2026-01-24': 'absent',
        '2026-01-25': 'present', '2026-01-26': 'present', '2026-01-27': 'present',
        '2026-01-28': 'present', '2026-01-29': 'present', '2026-01-30': 'present',
        '2026-01-31': 'present',
    };

    const months = [
        { name: 'Jan', num: 1 },
        { name: 'Feb', num: 2 },
        { name: 'Mar', num: 3 },
        { name: 'Apr', num: 4 },
        { name: 'May', num: 5 },
        { name: 'Jun', num: 6 },
        { name: 'Jul', num: 7 },
        { name: 'Aug', num: 8 },
        { name: 'Sep', num: 9 },
        { name: 'Oct', num: 10 },
        { name: 'Nov', num: 11 },
        { name: 'Dec', num: 12 },
    ];

    const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

    const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();

    const getCellStatus = (year, monthNum, dayNum) => {
        const key = `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        return attendanceData[key] || null;
    };

    const getCellStyle = (status, isValidDay) => {
        if (!isValidDay) return 'bg-white border border-gray-200';
        if (status === 'present') return 'bg-green-500 border border-green-600';
        if (status === 'absent') return 'bg-red-500 border border-red-600';
        if (status === 'late') return 'bg-yellow-400 border border-yellow-500';
        return 'bg-white border border-gray-200';
    };

    // Circular progress
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const pct = attendanceStats.percentage;
    const strokeDashoffset = circumference - (pct / 100) * circumference;

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            {/* ── Header ── */}
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Attendance</h1>

            {/* ── Top Stats Row ── */}
            <div className="flex items-center gap-4 mb-6">
                {/* Stat Boxes */}
                <div className="flex gap-4 flex-1">
                    <div className="bg-gray-100 rounded-xl px-6 py-4 flex-1 border border-gray-200 bg-white shadow-sm">
                        <p className="text-sm font-medium text-gray-600 mb-1">Total Working Days</p>
                        <p className="text-4xl font-bold text-blue-600">{attendanceStats.totalWorkingDays}</p>
                    </div>
                    <div className="bg-gray-100 rounded-xl px-6 py-4 flex-1 border border-gray-200 bg-white shadow-sm">
                        <p className="text-sm font-medium text-gray-600 mb-1">Total Present Days</p>
                        <p className="text-4xl font-bold text-green-600">{attendanceStats.totalPresentDays}</p>
                    </div>
                    <div className="bg-gray-100 rounded-xl px-6 py-4 flex-1 border border-gray-200 bg-white shadow-sm">
                        <p className="text-sm font-medium text-gray-600 mb-1">Total Absent Days</p>
                        <p className="text-4xl font-bold text-red-600">{attendanceStats.totalAbsentDays}</p>
                    </div>
                </div>

                {/* Circular Progress */}
                <div className="flex-shrink-0 flex items-center justify-center w-36 h-36">
                    <svg width="144" height="144" viewBox="0 0 144 144">
                        {/* Background ring */}
                        <circle
                            cx="72" cy="72" r={radius}
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="10"
                        />
                        {/* Blue arc */}
                        <circle
                            cx="72" cy="72" r={radius}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="10"
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference * 0.75}
                            strokeLinecap="round"
                            transform="rotate(-90 72 72)"
                        />
                        {/* Green progress arc */}
                        <circle
                            cx="72" cy="72" r={radius}
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="10"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            transform="rotate(-90 72 72)"
                        />
                        <text
                            x="72" y="72"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{ fontSize: '18px', fontWeight: '700', fill: '#16a34a' }}
                        >
                            {pct}%
                        </text>
                    </svg>
                </div>
            </div>

            {/* ── Attendance Grid ── */}
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                {/* Grid Header Bar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
                    <span className="text-sm font-semibold text-gray-700">My Attendance</span>
                    <div className="flex items-center gap-4">
                        {/* Year Selector */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setSelectedYear(y => y - 1)}
                                className="text-gray-500 hover:text-gray-800 px-1 font-bold text-lg leading-none"
                            >
                                {'<'}
                            </button>
                            <span className="text-sm font-semibold text-gray-700 min-w-[60px] text-center">
                                {selectedYear} &gt;&gt;
                            </span>
                            <button
                                onClick={() => setSelectedYear(y => y + 1)}
                                className="text-gray-500 hover:text-gray-800 px-1 font-bold text-lg leading-none"
                            >
                                {'>'}
                            </button>
                        </div>
                        <span className="text-sm text-gray-500 border border-gray-300 rounded px-2 py-0.5 cursor-pointer hover:bg-gray-50">
                            Select Class &gt;
                        </span>
                    </div>
                </div>

                {/* Grid Table */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse" style={{ minWidth: '700px' }}>
                        <thead>
                            <tr>
                                {/* Month label column */}
                                <th className="border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 px-2 py-1 w-12 text-left" />
                                {days.map((d) => (
                                    <th
                                        key={d}
                                        className="border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 px-0 py-1 text-center"
                                        style={{ width: '28px', minWidth: '28px' }}
                                    >
                                        {d}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {months.map((month) => {
                                const daysInMonth = getDaysInMonth(selectedYear, month.num);
                                return (
                                    <tr key={month.name}>
                                        {/* Month label */}
                                        <td className="border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 px-2 py-1 text-left whitespace-nowrap">
                                            {month.name}
                                        </td>
                                        {days.map((d, idx) => {
                                            const dayNum = idx + 1;
                                            const isValidDay = dayNum <= daysInMonth;
                                            const status = isValidDay
                                                ? getCellStatus(selectedYear, month.num, dayNum)
                                                : null;
                                            return (
                                                <td
                                                    key={d}
                                                    className={`border border-gray-200 p-0 ${getCellStyle(status, isValidDay && status)}`}
                                                    style={{ width: '28px', minWidth: '28px', height: '28px' }}
                                                    title={isValidDay ? `${month.name} ${dayNum}, ${selectedYear}: ${status || 'no data'}` : ''}
                                                />
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Attendance;