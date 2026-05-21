// superadmin/schoolrecovary.jsx

import React, { useEffect, useMemo, useState } from "react";
import {
    ArrowLeft,
    Search,
    RefreshCcw,
    DatabaseBackup,
    School,
    CalendarDays,
    ShieldCheck,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getAuth } from "../../../auth/storage";

export default function SchoolRecovery() {
    const navigate = useNavigate();

    const API_URL = import.meta.env.VITE_API_URL;

    const [search, setSearch] = useState("");
    const [schools, setSchools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [restoringId, setRestoringId] = useState(null);
    const [selectedBackup, setSelectedBackup] = useState(null);
    /* =========================================================
          FETCH SCHOOL BACKUPS
       ========================================================= */

    const fetchSchools = async () => {
        try {
            setLoading(true);

            const res = await fetch(
                `${API_URL}/api/backups/schools`,
                {
                    headers: {
                        Authorization: `Bearer ${getAuth()?.token}`,
                    },
                }
            );

            const data = await res.json();

            if (data.success) {
                setSchools(data.data || []);
            } else {
                toast.error(data.message || "Failed to load backups");
            }
        } catch (err) {
            console.log(err);
            toast.error("Failed to fetch recovery data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchools();
    }, []);

    /* =========================================================
          RESTORE SCHOOL
       ========================================================= */

    const handleRestore = async (schoolId) => {
        try {
            setRestoringId(schoolId);

            const res = await fetch(
                `${API_URL}/api/backups/schools/${schoolId}/restore`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${getAuth()?.token}`,
                    },
                }
            );

            const data = await res.json();

            if (data.success) {
                toast.success("School restored successfully");
            } else {
                toast.error(data.message || "Restore failed");
            }
        } catch (err) {
            console.log(err);
            toast.error("Something went wrong");
        } finally {
            setRestoringId(null);
        }
    };
    const handleViewBackup = async (backup) => {

        try {

            const res = await fetch(
                `${API_URL}/api/backups/schools/${backup.schoolId}/details`,
                {
                    headers: {
                        Authorization: `Bearer ${getAuth()?.token}`,
                    },
                }
            );

            const data = await res.json();

            if (data.success) {
                setSelectedBackup(data.data);
            } else {
                toast.error(data.message);
            }

        } catch (err) {

            console.log(err);
            toast.error("Failed to load backup details");
        }
    };
    /* =========================================================
          FILTERED DATA
       ========================================================= */

    const filteredSchools = useMemo(() => {
        return schools.filter((backup) => {
            const schoolName =
                backup.school?.name || "Unknown School";

            const schoolCode =
                backup.school?.code || "N/A";

            return (
                schoolName
                    .toLowerCase()
                    .includes(search.toLowerCase()) ||
                schoolCode
                    .toLowerCase()
                    .includes(search.toLowerCase())
            );
        });
    }, [schools, search]);

    /* =========================================================
          STATS
       ========================================================= */

    const totalSchools = schools.length;

    const totalBackups = schools.length;

    /* =========================================================
          LOADING
       ========================================================= */

    if (loading) {
        return (
            <div className="p-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                    <p className="text-slate-500 text-lg">
                        Loading recovery data...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">

                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition"
                >
                    <ArrowLeft size={18} />
                </button>

                <div>
                    <h1 className="text-2xl font-semibold text-gray-800">
                        School Recovery
                    </h1>

                    <p className="text-sm text-gray-500">
                        Restore deleted schools and recover backup data
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

                {/* Recoverable Schools */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">

                        <div>
                            <p className="text-sm text-gray-500">
                                Recoverable Schools
                            </p>

                            <h2 className="text-3xl font-bold text-gray-800 mt-1">
                                {totalSchools}
                            </h2>
                        </div>

                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                            <School className="text-blue-600" size={24} />
                        </div>

                    </div>
                </div>

                {/* Available Backups */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">

                        <div>
                            <p className="text-sm text-gray-500">
                                Available Backups
                            </p>

                            <h2 className="text-3xl font-bold text-gray-800 mt-1">
                                {totalBackups}
                            </h2>
                        </div>

                        <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                            <DatabaseBackup
                                className="text-green-600"
                                size={24}
                            />
                        </div>

                    </div>
                </div>

                {/* Recovery Window */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">

                        <div>
                            <p className="text-sm text-gray-500">
                                Recovery Window
                            </p>

                            <h2 className="text-3xl font-bold text-gray-800 mt-1">
                                60 Days
                            </h2>
                        </div>

                        <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                            <ShieldCheck
                                className="text-amber-600"
                                size={24}
                            />
                        </div>

                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-6">

                <div className="relative max-w-md">

                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                        type="text"
                        placeholder="Search school by name or code..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                    />
                </div>
            </div>

            {/* Empty State */}
            {filteredSchools.length === 0 && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-10 text-center">

                    <DatabaseBackup
                        size={42}
                        className="mx-auto text-gray-300 mb-4"
                    />

                    <h2 className="text-lg font-semibold text-gray-700">
                        No backups found
                    </h2>

                    <p className="text-sm text-gray-500 mt-2">
                        No school backups available for recovery.
                    </p>
                </div>
            )}

            {/* School Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {filteredSchools.map((backup) => {

                    const schoolName =
                        backup.school?.name ||
                        backup.schoolName ||
                        "Unknown School";

                    const schoolCode =
                        backup.school?.code ||
                        backup.schoolCode ||
                        "N/A";

                    return (
                        <div
                            key={backup.schoolId}
                            className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 hover:shadow-md transition"
                        >
                            <div className="flex items-start justify-between gap-4">

                                {/* LEFT */}
                                <div>

                                    <h2 className="text-lg font-semibold text-gray-800">
                                        {schoolName}
                                    </h2>

                                    <p className="text-sm text-gray-500 mt-1">
                                        School Code: {schoolCode}
                                    </p>

                                    <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                                        <CalendarDays size={15} />

                                        Backup on{" "}
                                        {backup.createdAt
                                            ? new Date(
                                                backup.createdAt
                                            ).toLocaleDateString()
                                            : "No Backup Yet"}
                                    </div>

                                    <div className="flex gap-3 mt-4">

                                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                                            Backup Available
                                        </span>

                                        <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                                            Recoverable
                                        </span>

                                    </div>
                                </div>

                                {/* RIGHT */}
                                <div className="flex flex-col gap-2">

                                    <button
                                        onClick={() =>
                                            handleRestore(backup.schoolId)
                                        }
                                        disabled={
                                            restoringId === backup.schoolId
                                        }
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60"
                                    >
                                        <RefreshCcw size={16} />

                                        {restoringId === backup.schoolId
                                            ? "Restoring..."
                                            : "Restore"}
                                    </button>

                                    <button
                                        onClick={() => handleViewBackup(backup)}
                                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                                    >
                                        <DatabaseBackup size={16} />
                                        View Backup
                                    </button>

                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* BACKUP MODAL */}
            {
                selectedBackup && (
                    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">

                        <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden">

                            {/* HEADER */}
                            <div className="flex items-center justify-between px-6 py-4 border-b">

                                <div>
                                    <h2 className="text-xl font-semibold">
                                        Backup Details
                                    </h2>

                                    <p className="text-sm text-gray-500 mt-1">
                                        {selectedBackup.school?.name}
                                    </p>
                                </div>

                                <button
                                    onClick={() => setSelectedBackup(null)}
                                    className="text-gray-500 hover:text-black text-xl"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* BODY */}
                            <div className="p-6 max-h-[70vh] overflow-y-auto">

                                <div className="space-y-6">

                                    {/* SCHOOL */}
                                    <div className="bg-slate-50 border rounded-xl p-4">
                                        <h3 className="font-semibold text-lg mb-3">
                                            School Information
                                        </h3>

                                        <div className="grid grid-cols-2 gap-3 text-sm">

                                            <div>
                                                <span className="font-medium">Name:</span>{" "}
                                                {selectedBackup.school?.name}
                                            </div>

                                            <div>
                                                <span className="font-medium">Code:</span>{" "}
                                                {selectedBackup.school?.code}
                                            </div>

                                            <div>
                                                <span className="font-medium">Type:</span>{" "}
                                                {selectedBackup.school?.type}
                                            </div>

                                            <div>
                                                <span className="font-medium">Backup Date:</span>{" "}
                                                {
                                                    selectedBackup?.metadata?.createdAt
                                                        ? new Date(
                                                            selectedBackup.metadata.createdAt
                                                        ).toLocaleString()
                                                        : "No Backup Date"
                                                }
                                            </div>

                                        </div>
                                    </div>

                                    {/* COUNTS */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                                        <div className="bg-blue-50 rounded-xl p-4">
                                            <p className="text-xs text-gray-500">
                                                Students
                                            </p>

                                            <h2 className="text-2xl font-bold">
                                                {selectedBackup.students?.length || 0}
                                            </h2>
                                        </div>

                                        <div className="bg-green-50 rounded-xl p-4">
                                            <p className="text-xs text-gray-500">
                                                Teachers
                                            </p>

                                            <h2 className="text-2xl font-bold">
                                                {selectedBackup.teachers?.length || 0}
                                            </h2>
                                        </div>

                                        <div className="bg-amber-50 rounded-xl p-4">
                                            <p className="text-xs text-gray-500">
                                                Parents
                                            </p>

                                            <h2 className="text-2xl font-bold">
                                                {(selectedBackup.parents || []).length || 0}
                                            </h2>
                                        </div>

                                        <div className="bg-purple-50 rounded-xl p-4">
                                            <p className="text-xs text-gray-500">
                                                Subjects
                                            </p>

                                            <h2 className="text-2xl font-bold">
                                                {selectedBackup.subjects?.length || 0}
                                            </h2>
                                        </div>

                                    </div>




                                    {/* RAW MODULE DATA */}
                                    <div className="space-y-4">

                                        <h3 className="font-semibold text-lg">
                                            Backup Data Preview
                                        </h3>

                                        {
                                            [
                                                // CORE
                                                { title: "Users", key: "users" },
                                                { title: "Students", key: "students" },
                                                { title: "Parents", key: "parents" },
                                                { title: "Teachers", key: "teachers" },

                                                // ACADEMICS
                                                { title: "Class Sections", key: "classSections" },
                                                { title: "Subjects", key: "subjects" },
                                                { title: "Academic Years", key: "academicYears" },
                                                { title: "Student Enrollments", key: "studentEnrollments" },
                                                { title: "Teacher Assignments", key: "teacherAssignments" },
                                                { title: "Class Subjects", key: "classSubjects" },

                                                // ATTENDANCE
                                                { title: "Attendance", key: "attendanceRecords" },
                                                { title: "Teacher Attendance", key: "teacherAttendances" },

                                                // EXAMS
                                                { title: "Assessment Terms", key: "assessmentTerms" },
                                                { title: "Assessment Groups", key: "assessmentGroups" },
                                                { title: "Assessment Schedules", key: "assessmentSchedules" },
                                                { title: "Marks", key: "marks" },

                                                // TIMETABLE
                                                { title: "Timetable Configs", key: "timetableConfigs" },
                                                { title: "Timetable Entries", key: "timetableEntries" },

                                                // FEES
                                                { title: "Fee Structures", key: "feeStructures" },
                                                { title: "Fee Assignments", key: "feeAssignments" },
                                                { title: "Fee Payments", key: "feePayments" },

                                                // EVENTS
                                                { title: "Activities", key: "activities" },
                                                { title: "Activity Events", key: "activityEvents" },
                                                { title: "Event Teams", key: "eventTeams" },
                                                { title: "Event Participants", key: "eventParticipants" },

                                                // CERTIFICATES
                                                { title: "Certificates", key: "certificates" },

                                                // AWARDS
                                                { title: "Awards", key: "awards" },
                                                { title: "Student Awards", key: "studentAwards" },

                                                // GALLERY
                                                { title: "Gallery Albums", key: "galleryAlbums" },
                                                { title: "Gallery Images", key: "galleryImages" },

                                                // HOLIDAYS
                                                { title: "School Holidays", key: "schoolHolidays" },

                                                // STAFF
                                                { title: "Staff Profiles", key: "staffProfiles" },
                                                { title: "Teacher Salaries", key: "teacherMonthlySalaries" },

                                                // TRANSPORT
                                                { title: "Transports", key: "transports" },
                                                { title: "Routes", key: "routes" },

                                                // HOSTEL
                                                { title: "Hostels", key: "hostels" },

                                                // CHAT
                                                { title: "Conversations", key: "conversations" },
                                                { title: "Messages", key: "messages" },

                                                // NOTIFICATIONS
                                                { title: "Notifications", key: "notifications" },
                                            ].map((module) => (

                                                <details
                                                    key={module.key}
                                                    className="border rounded-xl overflow-hidden bg-white"
                                                >

                                                    <summary className="cursor-pointer px-4 py-3 bg-slate-100 hover:bg-slate-200 font-medium flex items-center justify-between">

                                                        <span>
                                                            ✅ {module.title}
                                                        </span>

                                                        <span className="text-sm text-gray-500">
                                                            {
                                                                selectedBackup[module.key]?.length || 0
                                                            } records
                                                        </span>

                                                    </summary>

                                                    <div className="bg-slate-900 text-green-400">

                                                        <div className="p-4 space-y-3 max-h-[400px] overflow-auto bg-white">

                                                            {
                                                                (selectedBackup[module.key] || []).length === 0 ? (

                                                                    <div className="text-sm text-gray-500">
                                                                        No records found
                                                                    </div>

                                                                ) : (

                                                                    selectedBackup[module.key]
                                                                        .slice(0, 20)
                                                                        .map((item, index) => (

                                                                            <div
                                                                                key={item.id || index}
                                                                                className="border rounded-xl p-3 bg-slate-50"
                                                                            >

                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">

                                                                                    {
                                                                                        Object.entries(item)
                                                                                            .slice(0, 8)
                                                                                            .map(([key, value]) => (

                                                                                                <div key={key}>

                                                                                                    <span className="font-semibold text-gray-700">
                                                                                                        {key}:
                                                                                                    </span>{" "}

                                                                                                    <span className="text-gray-600 break-all">

                                                                                                        {
                                                                                                            typeof value === "object"
                                                                                                                ? JSON.stringify(value)
                                                                                                                : String(value)
                                                                                                        }

                                                                                                    </span>

                                                                                                </div>
                                                                                            ))
                                                                                    }

                                                                                </div>

                                                                            </div>
                                                                        ))
                                                                )
                                                            }

                                                        </div>

                                                    </div>

                                                </details>
                                            ))
                                        }

                                    </div>

                                </div>

                            </div>
                        </div>
                    </div>
                )
            }
        </div>

    );
}