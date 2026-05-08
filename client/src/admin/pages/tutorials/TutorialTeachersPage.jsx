import { useEffect, useState } from "react";
import { Plus, RefreshCw, BookMarked } from "lucide-react";

import TutorialTeacherCard from "./components/TutorialTeacherCard";
import TutorialTeacherModal from "./components/TutorialTeacherModal";
import LoadingGrid from "./components/LoadingGrid";
import EmptyState from "./components/EmptyState";

import {
  getTutorialTeachers,
  deleteTutorialTeacher,
} from "./services/tutorialService";

const TutorialTeachersPage = () => {
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchData = async () => {
    setLoading(true);

    try {
      const data = await getTutorialTeachers();
      setTeachers(data || []);
    } catch {
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    const ok = window.confirm(
      "Archive tutorial teacher?"
    );

    if (!ok) return;

    await deleteTutorialTeacher(id);

    fetchData();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-gradient-to-b from-sky-400 to-slate-700" />

            <h1 className="text-3xl font-black tracking-tight text-slate-800">
              Tutorial Teachers
            </h1>
          </div>

          <p className="pl-4 text-sm font-medium text-slate-500">
            Manage tutorial providers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw size={16} />
          </button>

          <button
            onClick={() => {
              setEditing(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-600 to-slate-800 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
          >
            <Plus size={16} />
            Add Teacher
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-200 bg-sky-50">
              <BookMarked
                size={18}
                className="text-sky-500"
              />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Tutorial Teachers
              </h2>

              <p className="text-xs text-slate-500">
                {teachers.length} total
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <LoadingGrid />
          ) : teachers.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {teachers.map((teacher) => (
                <TutorialTeacherCard
                  key={teacher.id}
                  teacher={teacher}
                  onEdit={() => {
                    setEditing(teacher);
                    setShowModal(true);
                  }}
                  onDelete={() =>
                    handleDelete(teacher.id)
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <TutorialTeacherModal
          editing={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default TutorialTeachersPage;
