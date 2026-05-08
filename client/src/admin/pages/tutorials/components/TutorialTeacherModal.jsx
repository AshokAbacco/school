import { useEffect, useState } from "react";

import {
  X,
  Check,
  Loader2,
  BookMarked,
} from "lucide-react";

import TutorialTeacherForm from "./TutorialTeacherForm";

import {
  createTutorialTeacher,
  updateTutorialTeacher,
  getTeacherDropdown,
  getSubjects,
  getGrades,
} from "../services/tutorialService";

const TutorialTeacherModal = ({
  onClose,
  onSaved,
  editing,
}) => {
  const [loading, setLoading] =
    useState(false);

  const [teachers, setTeachers] =
    useState([]);

  const [subjects, setSubjects] =
    useState([]);

  const [grades, setGrades] =
    useState([]);

  const [form, setForm] = useState({
    teacherId: "",
    bio: "",
    mode: "ONLINE",
    monthlyFee: "",
    grades: [],
    subjects: [],
    capacity: "",
    rating: "",
    passPercentage: "",
    averageStudentScore: "",
    adminPriority: "",
    isActive: true,
  });

  useEffect(() => {
    loadTeachers();
    loadSubjects();
    loadGrades();

    if (editing) {
    setForm({
      teacherId: editing.teacherId,

      bio: editing.bio || "",

      mode:
        editing.mode || "ONLINE",

      monthlyFee:
        editing.monthlyFee || "",

      grades:
        editing.grades || [],

      subjects:
        editing.subjects || [],

      capacity:
        editing.capacity || "",

      // ✅ NEW

      rating:
        editing.rating || "",

      passPercentage:
        editing.passPercentage || "",

      averageStudentScore:
        editing.averageStudentScore || "",

      adminPriority:
        editing.adminPriority || "",

      isActive:
        editing.isActive,
    });
    }
  }, []);

  const loadTeachers = async () => {
    try {
      const data =
        await getTeacherDropdown();

      setTeachers(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadSubjects = async () => {
    try {
      const data =
        await getSubjects();

      setSubjects(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadGrades = async () => {
    try {
      const data =
        await getGrades();

      setGrades(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const update = (k, v) => {
    setForm((p) => ({
      ...p,
      [k]: v,
    }));
  };

  const toggleArray = (
    key,
    value
  ) => {
    setForm((p) => ({
      ...p,
      [key]: p[key].includes(value)
        ? p[key].filter(
            (x) => x !== value
          )
        : [...p[key], value],
    }));
  };

  const submit = async () => {
    setLoading(true);

    try {
      if (editing) {
        await updateTutorialTeacher(
          editing.id,
          form
        );
      } else {
        await createTutorialTeacher(
          form
        );
      }

      onSaved();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50">
              <BookMarked
                size={18}
                className="text-sky-500"
              />
            </div>

            <div>
              <h2 className="text-sm font-extrabold text-slate-800">
                {editing
                  ? "Edit Tutorial Teacher"
                  : "Add Tutorial Teacher"}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Configure tutorial
                availability
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <TutorialTeacherForm
            form={form}
            update={update}
            toggleArray={toggleArray}
            teachers={teachers}
            subjects={subjects}
            grades={grades}
            editing={editing}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-5">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            onClick={submit}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-600 to-slate-800 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
          >
            {loading ? (
              <Loader2
                size={15}
                className="animate-spin"
              />
            ) : (
              <Check size={15} />
            )}

            {editing
              ? "Update"
              : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialTeacherModal;