import { useState } from "react";

const meetings = [
    {
        id: 1,
        title: "Parent-Teacher Meeting",
        teacher: "Mr. Sharma",
        subject: "Mathematics",
        date: "20 Feb 2026",
        time: "10:00 AM",
        status: "Scheduled",
        type: "In-Person",
        venue: "Room 101",
        agenda: "Discuss student's progress in Math and areas of improvement.",
    },
    {
        id: 2,
        title: "Academic Review",
        teacher: "Ms. Patel",
        subject: "Science",
        date: "18 Feb 2026",
        time: "2:00 PM",
        status: "Completed",
        type: "Online",
        venue: "Google Meet",
        agenda: "Review of Science project and upcoming exam preparation.",
    },
    {
        id: 3,
        title: "Counseling Session",
        teacher: "Ms. Gupta",
        subject: "Career Guidance",
        date: "25 Feb 2026",
        time: "11:00 AM",
        status: "Scheduled",
        type: "In-Person",
        venue: "Counseling Room",
        agenda: "Career path discussion and college entrance guidance.",
    },
    {
        id: 4,
        title: "Progress Discussion",
        teacher: "Mr. Kumar",
        subject: "English",
        date: "10 Feb 2026",
        time: "3:00 PM",
        status: "Completed",
        type: "In-Person",
        venue: "Room 205",
        agenda: "Discussion about essay writing skills and literature projects.",
    },
    {
        id: 5,
        title: "Sports Performance Review",
        teacher: "Mr. Singh",
        subject: "Physical Education",
        date: "28 Feb 2026",
        time: "9:00 AM",
        status: "Scheduled",
        type: "In-Person",
        venue: "Sports Office",
        agenda: "Review athletic performance and upcoming tournament preparation.",
    },
];

const statusColors = {
    Scheduled: "bg-blue-100 text-blue-700",
    Completed: "bg-green-100 text-green-700",
    Cancelled: "bg-red-100 text-red-700",
};

const typeColors = {
    "In-Person": "bg-purple-100 text-purple-700",
    Online: "bg-cyan-100 text-cyan-700",
};

const Meeting = () => {
    const [filter, setFilter] = useState("All");

    const filtered = filter === "All" ? meetings : meetings.filter((m) => m.status === filter);

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Meetings</h1>
                <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Request Meeting
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                    { label: "Total Meetings", value: meetings.length, color: "text-blue-600" },
                    { label: "Scheduled", value: meetings.filter((m) => m.status === "Scheduled").length, color: "text-blue-500" },
                    { label: "Completed", value: meetings.filter((m) => m.status === "Completed").length, color: "text-green-500" },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white rounded-xl shadow p-4 text-center">
                        <p className="text-gray-500 text-sm mb-1">{stat.label}</p>
                        <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-4">
                {["All", "Scheduled", "Completed"].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${filter === f ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-blue-50"
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Meeting List */}
            <div className="space-y-3">
                {filtered.map((meeting) => (
                    <div key={meeting.id} className="bg-white rounded-xl shadow p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                                📅
                            </div>
                            <div className="flex-1">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="font-bold text-gray-800">{meeting.title}</h3>
                                        <p className="text-sm text-gray-500">
                                            with <span className="font-medium text-gray-700">{meeting.teacher}</span> — {meeting.subject}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[meeting.status]}`}>
                                            {meeting.status}
                                        </span>
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${typeColors[meeting.type]}`}>
                                            {meeting.type}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-gray-500 text-sm mt-2">{meeting.agenda}</p>
                                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        {meeting.date}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {meeting.time}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        </svg>
                                        {meeting.venue}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Meeting;