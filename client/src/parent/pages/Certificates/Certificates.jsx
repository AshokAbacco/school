const certificates = [
    {
        id: 1,
        title: "Science Fair Winner",
        issuedBy: "District Science Board",
        date: "15 Jan 2026",
        category: "Academic",
        icon: "🏆",
        grade: "1st Place",
    },
    {
        id: 2,
        title: "Math Olympiad",
        issuedBy: "State Mathematics Council",
        date: "10 Dec 2025",
        category: "Academic",
        icon: "📐",
        grade: "Gold Medal",
    },
    {
        id: 3,
        title: "Best Athlete",
        issuedBy: "School Sports Committee",
        date: "20 Nov 2025",
        category: "Sports",
        icon: "🥇",
        grade: "Excellence",
    },
    {
        id: 4,
        title: "Cultural Performance",
        issuedBy: "School Cultural Committee",
        date: "25 Nov 2025",
        category: "Cultural",
        icon: "🎭",
        grade: "Star Performer",
    },
    {
        id: 5,
        title: "Perfect Attendance",
        issuedBy: "School Administration",
        date: "31 Mar 2025",
        category: "Attendance",
        icon: "📅",
        grade: "Excellence",
    },
    {
        id: 6,
        title: "Debate Champion",
        issuedBy: "Inter-School Debate Council",
        date: "15 Oct 2025",
        category: "Academic",
        icon: "🗣️",
        grade: "1st Place",
    },
];

const categoryColors = {
    Academic: "border-blue-400 bg-blue-50",
    Sports: "border-green-400 bg-green-50",
    Cultural: "border-purple-400 bg-purple-50",
    Attendance: "border-yellow-400 bg-yellow-50",
};

const badgeColors = {
    Academic: "bg-blue-100 text-blue-700",
    Sports: "bg-green-100 text-green-700",
    Cultural: "bg-purple-100 text-purple-700",
    Attendance: "bg-yellow-100 text-yellow-700",
};

const Certificates = () => {
    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Certificates</h1>
                <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold">
                    Total: {certificates.length} Certificates
                </span>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-4 gap-3 mb-6">
                {["Academic", "Sports", "Cultural", "Attendance"].map((cat) => (
                    <div key={cat} className="bg-white rounded-xl shadow p-3 text-center">
                        <p className="text-gray-500 text-xs mb-1">{cat}</p>
                        <p className="text-2xl font-bold text-blue-600">
                            {certificates.filter((c) => c.category === cat).length}
                        </p>
                    </div>
                ))}
            </div>

            {/* Certificates Grid */}
            <div className="grid grid-cols-3 gap-4">
                {certificates.map((cert) => (
                    <div
                        key={cert.id}
                        className={`bg-white rounded-xl shadow border-l-4 ${categoryColors[cert.category]} p-5 hover:shadow-md transition-shadow`}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <span className="text-3xl">{cert.icon}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColors[cert.category]}`}>
                                {cert.category}
                            </span>
                        </div>
                        <h3 className="font-bold text-gray-800 text-base mb-1">{cert.title}</h3>
                        <p className="text-gray-500 text-xs mb-3">{cert.issuedBy}</p>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">{cert.date}</span>
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                {cert.grade}
                            </span>
                        </div>
                        <button className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-blue-600 font-medium border border-blue-200 rounded-lg py-1.5 hover:bg-blue-50 transition">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download Certificate
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Certificates;