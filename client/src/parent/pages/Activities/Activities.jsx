const activities = [
    {
        id: 1,
        title: "Annual Science Fair",
        date: "15 Jan 2026",
        category: "Academic",
        status: "Completed",
        points: 50,
        description: "Participated in Annual Science Fair with project on renewable energy.",
        icon: "🔬",
    },
    {
        id: 2,
        title: "Basketball Tournament",
        date: "20 Jan 2026",
        category: "Sports",
        status: "Upcoming",
        points: 30,
        description: "Inter-school basketball tournament, representing school team.",
        icon: "🏀",
    },
    {
        id: 3,
        title: "Art Exhibition",
        date: "05 Feb 2026",
        category: "Cultural",
        status: "Upcoming",
        points: 20,
        description: "Annual art exhibition showcasing student artwork.",
        icon: "🎨",
    },
    {
        id: 4,
        title: "Math Olympiad",
        date: "10 Dec 2025",
        category: "Academic",
        status: "Completed",
        points: 70,
        description: "District-level Math Olympiad competition.",
        icon: "📐",
    },
    {
        id: 5,
        title: "Cultural Fest",
        date: "25 Nov 2025",
        category: "Cultural",
        status: "Completed",
        points: 40,
        description: "Annual cultural festival performance and organization.",
        icon: "🎭",
    },
    {
        id: 6,
        title: "Debate Competition",
        date: "28 Feb 2026",
        category: "Academic",
        status: "Upcoming",
        points: 35,
        description: "Inter-school debate competition on current affairs.",
        icon: "🗣️",
    },
];

const categoryColors = {
    Academic: "bg-blue-100 text-blue-700",
    Sports: "bg-green-100 text-green-700",
    Cultural: "bg-purple-100 text-purple-700",
};

const statusColors = {
    Completed: "bg-green-100 text-green-700",
    Upcoming: "bg-yellow-100 text-yellow-700",
};

const Activities = () => {
    const totalPoints = activities.filter(a => a.status === "Completed").reduce((s, a) => s + a.points, 0);

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Activities</h1>
                <div className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold">
                    Total Points: {totalPoints}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                    { label: "Total Activities", value: activities.length, color: "text-blue-600" },
                    { label: "Completed", value: activities.filter(a => a.status === "Completed").length, color: "text-green-500" },
                    { label: "Upcoming", value: activities.filter(a => a.status === "Upcoming").length, color: "text-yellow-500" },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white rounded-xl shadow p-4 text-center">
                        <p className="text-gray-500 text-sm mb-1">{stat.label}</p>
                        <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Activities Grid */}
            <div className="grid grid-cols-2 gap-4">
                {activities.map((activity) => (
                    <div key={activity.id} className="bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-3">
                            <div className="text-3xl flex-shrink-0">{activity.icon}</div>
                            <div className="flex-1">
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="font-semibold text-gray-800">{activity.title}</h3>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColors[activity.status]}`}>
                                        {activity.status}
                                    </span>
                                </div>
                                <p className="text-gray-500 text-xs mt-1 mb-2">{activity.description}</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[activity.category]}`}>
                                        {activity.category}
                                    </span>
                                    <span className="text-xs text-gray-400">{activity.date}</span>
                                    {activity.status === "Completed" && (
                                        <span className="text-xs text-blue-600 font-semibold ml-auto">+{activity.points} pts</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Activities;