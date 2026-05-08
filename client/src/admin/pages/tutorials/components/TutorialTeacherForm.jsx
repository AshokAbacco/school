import {
  Star,
  TrendingUp,
  BadgeCheck,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

const modes = [
  "ONLINE",
  "OFFLINE",
  "HYBRID",
];

const TutorialTeacherForm = ({
  form,
  update,
  toggleArray,
  teachers,
  subjects,
  grades,
  editing,
}) => {
  const [teacherSearch, setTeacherSearch] =
    useState("");

  const filteredTeachers =
    useMemo(() => {
      return teachers.filter((t) =>
        `${t.name} ${
          t.designation || ""
        }`
          .toLowerCase()
          .includes(
            teacherSearch.toLowerCase()
          )
      );
    }, [teachers, teacherSearch]);

  return (
    <div className="space-y-6">
      {/* Teacher */}
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
          Teacher
        </label>

        <input
          type="text"
          placeholder="Search teacher..."
          value={teacherSearch}
          onChange={(e) =>
            setTeacherSearch(
              e.target.value
            )
          }
          disabled={!!editing}
          className="mb-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-sky-400"
        />

        <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white">
          {filteredTeachers.length ===
          0 ? (
            <div className="px-4 py-4 text-sm text-slate-400">
              No teachers found
            </div>
          ) : (
            filteredTeachers.map((t) => {
              const active =
                form.teacherId ===
                t.id;

              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={!!editing}
                onClick={() => {
                  update(
                    "teacherId",
                    t.id
                  );

                  setTeacherSearch(t.name);
                }}
                  className={`flex w-full items-start justify-between border-b border-slate-100 px-4 py-3 text-left transition last:border-none ${
                    active
                      ? "bg-sky-50"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                    {t.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {t.designation ||
                        "-"}
                    </p>
                  </div>

                  {active && (
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-500" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Mode
          </label>

          <select
            value={form.mode}
            onChange={(e) =>
              update(
                "mode",
                e.target.value
              )
            }
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-sky-400"
          >
            {modes.map((m) => (
              <option
                key={m}
                value={m}
              >
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Monthly Fee
          </label>

          <input
            value={form.monthlyFee}
            onChange={(e) =>
              update(
                "monthlyFee",
                e.target.value
              )
            }
            placeholder="2500"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-sky-400"
          />
        </div>
      </div>

      {/* Capacity */}
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
          Capacity
        </label>

        <input
          value={form.capacity}
          onChange={(e) =>
            update(
              "capacity",
              e.target.value
            )
          }
          placeholder="30"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-sky-400"
        />
      </div>

    {/* ===================================================== */}
    {/* PERFORMANCE + RANKING */}
    {/* ===================================================== */}

    <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="mb-5 flex items-center gap-3">

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-600">
          <Star size={20} />
        </div>

        <div>
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-800">
            Performance & Ranking
          </h3>

          <p className="text-xs font-medium text-slate-500">
            Add tutorial ranking information
          </p>
        </div>

      </div>

      <div className="grid gap-5 md:grid-cols-2">

        {/* Rating */}

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Rating
          </label>

          <div className="relative">

            <Star
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500"
            />

            <input
              value={form.rating}
              onChange={(e) =>
                update(
                  "rating",
                  e.target.value
                )
              }
              placeholder="4.8"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium outline-none"
            />

          </div>
        </div>

        {/* Pass Percentage */}

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Pass Percentage
          </label>

          <div className="relative">

            <TrendingUp
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-green-600"
            />

            <input
              value={form.passPercentage}
              onChange={(e) =>
                update(
                  "passPercentage",
                  e.target.value
                )
              }
              placeholder="92"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium outline-none"
            />

          </div>
        </div>

      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">

        {/* Average Student Score */}

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Average Student Score
          </label>

          <input
            value={form.averageStudentScore}
            onChange={(e) =>
              update(
                "averageStudentScore",
                e.target.value
              )
            }
            placeholder="88"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none"
          />
        </div>

        {/* Admin Priority */}

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Admin Priority
          </label>

          <div className="relative">

            <BadgeCheck
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600"
            />

            <input
              value={form.adminPriority}
              onChange={(e) =>
                update(
                  "adminPriority",
                  e.target.value
                )
              }
              placeholder="1"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium outline-none"
            />

          </div>
        </div>

      </div>

    </div>

      {/* Subjects */}
      <div>
        <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-slate-500">
          Subjects
        </label>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {subjects.map((s) => {
            const value =
              typeof s === "string"
                ? s
                : s.name;

            return (
              <button
                key={value}
                type="button"
                onClick={() =>
                  toggleArray(
                    "subjects",
                    value
                  )
                }
                className={`flex h-11 items-center justify-center rounded-2xl border px-4 text-xs font-bold transition ${
                  form.subjects.includes(
                    value
                  )
                    ? "border-sky-400 bg-sky-50 text-sky-600"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {value}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grades */}
      <div>
        <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-slate-500">
          Grades
        </label>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {grades.map((g) => {
            const value =
              typeof g === "string"
                ? g
                : g.grade;

            return (
              <button
                key={value}
                type="button"
                onClick={() =>
                  toggleArray(
                    "grades",
                    value
                  )
                }
                className={`flex h-11 items-center justify-center rounded-2xl border px-4 text-xs font-bold transition ${
                  form.grades.includes(
                    value
                  )
                    ? "border-sky-400 bg-sky-50 text-sky-600"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {value}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
          Description
        </label>

        <textarea
          rows={4}
          value={form.bio}
          onChange={(e) =>
            update(
              "bio",
              e.target.value
            )
          }
          placeholder="Teacher tutorial information..."
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-sky-400"
        />
      </div>
    </div>
  );
};

export default TutorialTeacherForm;