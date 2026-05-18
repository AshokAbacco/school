import React, { useEffect, useState } from "react";
import axios from "axios";

import {
    Trash2,
    RotateCcw,
    Search,
    CalendarDays,
    AlertTriangle,
    DatabaseBackup,
} from "lucide-react";

export default function DeletedRecords() {

    const [search, setSearch] = useState("");
    const [deletedRecords, setDeletedRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [restoringId, setRestoringId] = useState(null);

    /* =========================================================
       FETCH DELETED RECORDS
    ========================================================= */

    useEffect(() => {
        fetchDeletedRecords();
    }, []);

    const fetchDeletedRecords = async () => {

        try {

            setLoading(true);

            const token =
                JSON.parse(localStorage.getItem("auth"))?.token;

            const response = await axios.get(
                "http://localhost:5000/api/backups/deleted",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const backendData = response.data.data;

            const formatted = [];

            Object.keys(backendData).forEach((model) => {

                backendData[model].forEach((item) => {

                    const deletedDate =
                        item.deletedAt
                            ? new Date(item.deletedAt)
                            : new Date();

                    const recoverUntil = new Date(
                        deletedDate.getTime() +
                        60 * 24 * 60 * 60 * 1000
                    );

                    formatted.push({
                        id: item.id,
                        model,
                        type: model,

                        name:
                            item.name ||

                            // gallery image
                            item.caption ||

                            item.fileKey?.split("/").pop() ||

                            // staff profile
                            `${item.firstName || ""} ${item.lastName || ""}`.trim() ||

                            item.title ||
                            item.studentName ||
                            item.employeeName ||
                            item.staffName ||
                            item.subjectName ||

                            item.teacherName ||

                            `${item.teacher?.firstName || ""} ${item.teacher?.lastName || ""}`.trim() ||

                            item.teacher?.name ||
                            item.teacher?.user?.name ||

                            // relations
                            item.user?.name ||

                            // backup fallback
                            item.data?.name ||
                            item.data?.fullName ||

                            item.email ||
                            item.phone ||

                            "Unnamed Record",

                        deletedAt:
                            deletedDate
                                .toISOString()
                                .split("T")[0],

                        recoverableUntil:
                            recoverUntil
                                .toISOString()
                                .split("T")[0],

                        status:
                            recoverUntil > new Date()
                                ? "Recoverable"
                                : "Expired",
                    });
                });
            });

            setDeletedRecords(formatted);

        } catch (error) {

            console.log(error);

        } finally {

            setLoading(false);

        }
    };

    /* =========================================================
       RESTORE RECORD
    ========================================================= */

    const restoreRecord = async (
        model,
        recordId
    ) => {

        try {

            setRestoringId(recordId);

            const token =
                JSON.parse(localStorage.getItem("auth"))?.token;

            await axios.post(
                `http://localhost:5000/api/backups/restore/${model}/${recordId}`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            await fetchDeletedRecords();

        } catch (error) {

            console.log(error);

        } finally {

            setRestoringId(null);

        }
    };

    /* =========================================================
       FILTER RECORDS
    ========================================================= */

    const filteredRecords = deletedRecords.filter(
        (record) =>
            record.name
                ?.toLowerCase()
                .includes(search.toLowerCase()) ||

            record.type
                ?.toLowerCase()
                .includes(search.toLowerCase())
    );

    const recoverableCount =
        deletedRecords.filter(
            (r) => r.status === "Recoverable"
        ).length;

    return (

        <div className="p-4 md:p-6">

            {/* =====================================================
               HEADER
            ===================================================== */}

            <div className="flex items-center justify-between mb-6">

                <div>

                    <h1 className="text-2xl font-semibold text-gray-800">
                        Deleted Records
                    </h1>

                    <p className="text-sm text-gray-500 mt-1">
                        Restore accidentally deleted school data within the recovery window
                    </p>

                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 rounded-xl">

                    <AlertTriangle
                        size={18}
                        className="text-red-500"
                    />

                    <span className="text-sm font-medium text-red-600">
                        Auto delete after 60 days
                    </span>

                </div>

            </div>

            {/* =====================================================
               STATS
            ===================================================== */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

                {/* TOTAL */}

                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">

                    <div className="flex items-center justify-between">

                        <div>

                            <p className="text-sm text-gray-500">
                                Deleted Records
                            </p>

                            <h2 className="text-3xl font-bold text-gray-800 mt-1">
                                {deletedRecords.length}
                            </h2>

                        </div>

                        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">

                            <Trash2
                                className="text-red-600"
                                size={24}
                            />

                        </div>

                    </div>

                </div>

                {/* RECOVERABLE */}

                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">

                    <div className="flex items-center justify-between">

                        <div>

                            <p className="text-sm text-gray-500">
                                Recoverable
                            </p>

                            <h2 className="text-3xl font-bold text-gray-800 mt-1">
                                {recoverableCount}
                            </h2>

                        </div>

                        <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">

                            <RotateCcw
                                className="text-green-600"
                                size={24}
                            />

                        </div>

                    </div>

                </div>

                {/* SNAPSHOTS */}

                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">

                    <div className="flex items-center justify-between">

                        <div>

                            <p className="text-sm text-gray-500">
                                Backup Snapshots
                            </p>

                            <h2 className="text-3xl font-bold text-gray-800 mt-1">
                                {deletedRecords.length}
                            </h2>

                        </div>

                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">

                            <DatabaseBackup
                                className="text-blue-600"
                                size={24}
                            />

                        </div>

                    </div>

                </div>

            </div>

            {/* =====================================================
               SEARCH
            ===================================================== */}

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 mb-6">

                <div className="relative max-w-md">

                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                        type="text"
                        placeholder="Search deleted records..."
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                    />

                </div>

            </div>

            {/* =====================================================
               TABLE
            ===================================================== */}

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">

                {loading ? (

                    <div className="p-10 text-center text-gray-500">
                        Loading deleted records...
                    </div>

                ) : filteredRecords.length === 0 ? (

                    <div className="p-10 text-center text-gray-500">
                        No deleted records found
                    </div>

                ) : (

                    <div className="overflow-x-auto">

                        <table className="w-full">

                            <thead className="bg-gray-50 border-b border-gray-100">

                                <tr>

                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">
                                        Record
                                    </th>

                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">
                                        Type
                                    </th>

                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">
                                        Deleted Date
                                    </th>

                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">
                                        Recover Until
                                    </th>

                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">
                                        Status
                                    </th>

                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">
                                        Action
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {filteredRecords.map((record) => (

                                    <tr
                                        key={record.id}
                                        className="border-b border-gray-100 hover:bg-gray-50 transition"
                                    >

                                        {/* NAME */}

                                        <td className="px-6 py-5">

                                            <div>

                                                <p className="text-sm font-semibold text-gray-800">
                                                    {record.name}
                                                </p>

                                                <p className="text-xs text-gray-500 mt-1">
                                                    Deleted Record
                                                </p>

                                            </div>

                                        </td>

                                        {/* TYPE */}

                                        <td className="px-6 py-5">

                                            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium capitalize">
                                                {record.type}
                                            </span>

                                        </td>

                                        {/* DELETED DATE */}

                                        <td className="px-6 py-5">

                                            <div className="flex items-center gap-2 text-sm text-gray-600">

                                                <CalendarDays size={15} />

                                                {record.deletedAt}

                                            </div>

                                        </td>

                                        {/* RECOVERY */}

                                        <td className="px-6 py-5">

                                            <p className="text-sm text-gray-700">
                                                {record.recoverableUntil}
                                            </p>

                                        </td>

                                        {/* STATUS */}

                                        <td className="px-6 py-5">

                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-medium
                                                
                                                ${record.status === "Recoverable"
                                                        ? "bg-green-50 text-green-700"
                                                        : "bg-red-50 text-red-700"
                                                    }`}
                                            >

                                                {record.status}

                                            </span>

                                        </td>

                                        {/* ACTION */}

                                        <td className="px-6 py-5 text-right">

                                            <button
                                                onClick={() =>
                                                    restoreRecord(
                                                        record.model,
                                                        record.id
                                                    )
                                                }

                                                disabled={
                                                    restoringId === record.id
                                                }

                                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
                                            >

                                                <RotateCcw size={16} />

                                                {restoringId === record.id
                                                    ? "Restoring..."
                                                    : "Restore"}

                                            </button>

                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>

                    </div>

                )}

            </div>

        </div>
    );
}