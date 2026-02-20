import { useState } from "react";

const liveClasses = [
    // Empty = no live classes today
];

const upcomingClasses = [
    {
        id: 1,
        title: "Data Structures – Live Class",
        date: "Tomorrow",
        time: "2:00 PM – 3:30 PM",
        instructor: "Dr. Sharma",
    },
    {
        id: 2,
        title: "Database Management Systems",
        date: "18 Mar",
        time: "9:00 AM – 10:30 AM",
        instructor: "Ms. Patel",
    },
    {
        id: 3,
        title: "Operating Systems",
        date: "15 Mar",
        time: "9:00 AM – 10:30 AM",
        instructor: "Mr. Khan",
    },
];

const MyClassroom = () => {
    const [scheduleOpen, setScheduleOpen] = useState(false);

    return (
        <div className="p-6 bg-white min-h-screen max-w-5xl">
            {/* ── Page Title ── */}
            <h1 className="text-3xl font-bold text-gray-900 mb-6">My Classroom</h1>

            {/* ── Live Classes Box ── */}
            <div className="bg-gray-100 rounded-2xl p-6 mb-8">
                {/* Header row */}
                <div className="flex items-center justify-between mb-4">
                    <span className="text-base font-semibold text-gray-800">Live Classes</span>
                    <button
                        onClick={() => setScheduleOpen((o) => !o)}
                        className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"
                    >
                        Live Class Schedule
                        <svg
                            className={`w-4 h-4 text-gray-500 transition-transform ${scheduleOpen ? "rotate-180" : ""}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>

                {/* Live class content */}
                {liveClasses.length === 0 ? (
                    <p className="text-blue-600 text-2xl font-semibold py-6">
                        NO Live Classes Today............!
                    </p>
                ) : (
                    <div className="space-y-3">
                        {liveClasses.map((cls) => (
                            <div key={cls.id} className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm">
                                <div>
                                    <p className="font-semibold text-gray-800">{cls.title}</p>
                                    <p className="text-sm text-gray-500">{cls.time} · {cls.instructor}</p>
                                </div>
                                <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
                                    Join
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Schedule dropdown */}
                {scheduleOpen && (
                    <div className="mt-4 bg-white rounded-xl shadow-sm p-4 border border-gray-200">
                        <p className="text-sm text-gray-500 text-center">No schedule available.</p>
                    </div>
                )}
            </div>

            {/* ── Upcoming Classes ── */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Upcoming Classes</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {upcomingClasses.map((cls) => (
                    <div
                        key={cls.id}
                        className="bg-gray-50 rounded-xl p-4 border-l-4 border-blue-600"
                    >
                        <p className="font-bold text-gray-900 text-sm mb-1">{cls.title}</p>
                        <p className="text-sm text-gray-600 mb-1">
                            {cls.date} · {cls.time}
                        </p>
                        <p className="text-sm font-semibold text-gray-800">
                            Instructor: {cls.instructor}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MyClassroom;