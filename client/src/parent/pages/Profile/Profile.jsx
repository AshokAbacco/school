import { useState } from "react";

const Profile = () => {
    const [activeTab, setActiveTab] = useState("personal");

    const tabs = [
        { id: "personal", label: "Personal Info" },
        { id: "academic", label: "Academic Info" },
        { id: "health", label: "Health" },
    ];

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            {/* Class Rank Banner */}
            <div className="flex items-center justify-between bg-blue-600 rounded-full px-6 py-2 mb-6">
                <span className="text-white font-bold text-lg">Class Rank #21</span>
                <div className="flex gap-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === tab.id
                                ? "bg-blue-800 text-white"
                                : "bg-white text-blue-700 hover:bg-blue-50"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Personal Info Card */}
            {activeTab === "personal" && (
                <div className="bg-white rounded-2xl shadow p-6 flex gap-8 items-start">
                    {/* Left - Student Illustration */}
                    <div className="flex-shrink-0 w-48 flex items-center justify-center">
                        <div className="w-40 h-48 bg-gradient-to-b from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-blue-200 rounded-full mx-auto mb-2 flex items-center justify-center text-4xl">
                                    🧑‍🎒
                                </div>
                                <p className="text-xs text-blue-400">Student</p>
                            </div>
                        </div>
                    </div>

                    {/* Middle - Personal Info Fields */}
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Personal Information</h2>
                        <div className="space-y-3">
                            {[
                                { label: "Student ID", value: "2LG20CS026" },
                                { label: "Full Name", value: "Student XYZ Surname" },
                                { label: "Date Of Birth", value: "00/00/0000" },
                                { label: "Father's Name", value: "XYZ" },
                                { label: "Mother's Name", value: "ABC" },
                                { label: "Mobile Number", value: "9874563210" },
                                { label: "Email Address", value: "firstlast@gmail.com" },
                                { label: "Current Address", value: "" },
                                { label: "Permanent Address", value: "" },
                            ].map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center border border-gray-200 rounded-lg px-4 py-2.5"
                                >
                                    <div className="w-1 h-5 bg-blue-600 rounded-full mr-3 flex-shrink-0" />
                                    <span className="text-gray-700 text-sm">
                                        <span className="font-medium">{item.label}:</span>{" "}
                                        <span className="text-gray-600">{item.value}</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right - Profile Photo */}
                    <div className="flex-shrink-0 w-36 flex flex-col items-center gap-3">
                        <div className="w-32 h-32 rounded-full border-4 border-blue-500 overflow-hidden bg-blue-50 flex items-center justify-center relative">
                            <span className="text-5xl">👧</span>
                            <div className="absolute bottom-1 right-1 bg-white rounded-full p-1 shadow">
                                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "academic" && (
                <div className="bg-white rounded-2xl shadow p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Academic Information</h2>
                    <div className="space-y-3">
                        {[
                            { label: "Class", value: "10th Grade" },
                            { label: "Section", value: "A" },
                            { label: "Roll Number", value: "21" },
                            { label: "Admission Number", value: "2LG20CS026" },
                            { label: "Academic Year", value: "2025-2026" },
                            { label: "School Name", value: "ABC School" },
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center border border-gray-200 rounded-lg px-4 py-2.5">
                                <div className="w-1 h-5 bg-blue-600 rounded-full mr-3 flex-shrink-0" />
                                <span className="text-gray-700 text-sm">
                                    <span className="font-medium">{item.label}:</span>{" "}
                                    <span className="text-gray-600">{item.value}</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === "health" && (
                <div className="bg-white rounded-2xl shadow p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Health Information</h2>
                    <div className="space-y-3">
                        {[
                            { label: "Blood Group", value: "O+" },
                            { label: "Height", value: "165 cm" },
                            { label: "Weight", value: "55 kg" },
                            { label: "Allergies", value: "None" },
                            { label: "Medical Conditions", value: "None" },
                            { label: "Emergency Contact", value: "9874563210" },
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center border border-gray-200 rounded-lg px-4 py-2.5">
                                <div className="w-1 h-5 bg-blue-600 rounded-full mr-3 flex-shrink-0" />
                                <span className="text-gray-700 text-sm">
                                    <span className="font-medium">{item.label}:</span>{" "}
                                    <span className="text-gray-600">{item.value}</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;