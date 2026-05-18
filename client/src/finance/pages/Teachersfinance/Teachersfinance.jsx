import React, { useState } from "react";
import GroupASalary from "./GroupASalary";
import GroupBSalary from "./GroupBSalary";
import GroupCSalary from "./GroupCSalary";
import GroupDSalary from "./GroupDSalary";

const groups = [
    { id: "A", label: "Group A", subtitle: "Teaching Faculty" },
    { id: "B", label: "Group B", subtitle: "Non-Teaching Faculty" },
    { id: "C", label: "Group C", subtitle: "Support Staff" },
    { id: "D", label: "Admins", subtitle: "Administrative" },
];

export default function TeacherSalaryManagement() {
    const [activeGroup, setActiveGroup] = useState("A");

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#dde9f2] via-[#c8dce9] to-[#b8cfe0] p-3 sm:p-5 md:p-7">

            {/* ── GROUP TABS ── */}
            <div className="flex gap-0 mb-4 sm:mb-6 bg-white/55 rounded-2xl p-1 sm:p-1.5 shadow-sm w-full sm:w-fit overflow-x-auto">
                {groups.map(g => (
                    <button
                        key={g.id}
                        onClick={() => setActiveGroup(g.id)}
                        className={`flex flex-col items-center gap-0.5 px-4 sm:px-7 py-2 sm:py-2.5 rounded-xl text-sm font-bold flex-1 sm:flex-none sm:min-w-[120px] transition-all duration-200 whitespace-nowrap
                            ${activeGroup === g.id
                                ? "bg-gradient-to-br from-[#27435B] to-[#1C3044] text-white shadow-lg shadow-[#27435B]/30"
                                : "text-[#4A6B80] hover:bg-[#27435B]/10 hover:text-[#27435B]"}`}
                    >
                        <span className="text-[12px] sm:text-[13px] font-bold">{g.label}</span>
                        <span className={`text-[9px] sm:text-[10px] font-medium tracking-wide ${activeGroup === g.id ? "text-white/70" : "text-[#4A6B80]/75"}`}>
                            {g.subtitle}
                        </span>
                    </button>
                ))}
            </div>

            {/* ── GROUP PANELS ── */}
            {activeGroup === "A" && <GroupASalary />}
            {activeGroup === "B" && <GroupBSalary />}
            {activeGroup === "C" && <GroupCSalary />}
            {activeGroup === "D" && <GroupDSalary />}

        </div>
    );
}