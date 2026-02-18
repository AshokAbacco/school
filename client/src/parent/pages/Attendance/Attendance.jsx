import React from 'react';

const AttendanceStats = () => {
    const attendanceData = {
        totalWorkingDays: 290,
        totalAttendance: 263,
        totalAbsent: 27,
        attendanceRate: 90.69
    };

    // Generate attendance data for the calendar (simplified representation)
    const generateAttendanceData = () => {
        const data = [];
        for (let month = 0; month < 12; month++) {
            const monthData = [];
            const daysInMonth = new Date(2024, month + 1, 0).getDate();

            for (let day = 1; day <= daysInMonth; day++) {
                const random = Math.random();
                if (random > 0.9) {
                    monthData.push('absent');
                } else if (random > 0.1) {
                    monthData.push('present');
                } else {
                    monthData.push('none');
                }
            }

            data.push(monthData);
        }

        return data;
    };

    const [yearData] = React.useState(() => generateAttendanceData());

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Calculate stroke dasharray for the donut chart
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = `${(attendanceData.attendanceRate / 100) * circumference} ${circumference}`;

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Attendance</h1>

                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex justify-between items-start mb-8">
                        <div className="flex space-x-8">
                            <div className="flex items-center">
                                <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                                <div>
                                    <div className="text-sm text-gray-500">Total Working Days</div>
                                    <div className="text-2xl font-bold text-gray-800">{attendanceData.totalWorkingDays}</div>
                                </div>
                            </div>

                            <div className="flex items-center">
                                <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                                <div>
                                    <div className="text-sm text-gray-500">Total Attendance</div>
                                    <div className="text-2xl font-bold text-gray-800">{attendanceData.totalAttendance}</div>
                                </div>
                            </div>

                            <div className="flex items-center">
                                <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                                <div>
                                    <div className="text-sm text-gray-500">Total Absent</div>
                                    <div className="text-2xl font-bold text-gray-800">{attendanceData.totalAbsent}</div>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <svg width="180" height="180" className="transform -rotate-90">
                                <circle
                                    cx="90"
                                    cy="90"
                                    r={radius}
                                    stroke="#e5e7eb"
                                    strokeWidth="20"
                                    fill="none"
                                />
                                <circle
                                    cx="90"
                                    cy="90"
                                    r={radius}
                                    stroke="#10b981"
                                    strokeWidth="20"
                                    fill="none"
                                    strokeDasharray={strokeDasharray}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-gray-800">{attendanceData.attendanceRate}%</div>
                                    <div className="text-sm text-gray-500">Attendance Rate</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">My Attendance</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr>
                                        <th className="p-2 text-xs font-medium text-gray-500"></th>
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                            <th key={day} className="p-1 text-xs font-medium text-gray-500 w-8">
                                                {day}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {months.map((month, monthIndex) => (
                                        <tr key={month}>
                                            <td className="p-2 text-xs font-medium text-gray-700 border-r border-gray-200">
                                                {month}
                                            </td>
                                            {yearData[monthIndex].map((status, dayIndex) => (
                                                <td key={dayIndex} className="p-1 border-r border-gray-100 text-center">
                                                    {status === 'present' && (
                                                        <div className="w-2 h-2 bg-green-500 rounded-full mx-auto"></div>
                                                    )}
                                                    {status === 'absent' && (
                                                        <div className="w-2 h-2 bg-red-500 rounded-full mx-auto"></div>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceStats;