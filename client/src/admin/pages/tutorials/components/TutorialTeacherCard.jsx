import {
  User,
  Monitor,
  IndianRupee,
  Users,
  GraduationCap,
  Layers3,
  Pencil,
  Trash2,
   Star,
  TrendingUp,
  Award,
  BadgeCheck,
} from "lucide-react";

import InfoRow from "./InfoRow";

const TutorialTeacherCard = ({
  teacher,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 p-5">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50">
            <User
              size={18}
              className="text-sky-500"
            />
          </div>

          <div>
            <h3 className="text-sm font-extrabold text-slate-800">
              {teacher.teacher?.firstName}  {teacher.teacher?.lastName}
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              {teacher.teacher?.designation}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">

  {/* Rating */}

            {teacher.rating ? (

              <div className="flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">

                <Star size={12} />

                {teacher.rating}/5

              </div>

            ) : (

              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                New Teacher
              </div>

            )}

  {/* Pass Percentage */}

        {teacher.passPercentage ? (

          <div className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">

            <TrendingUp size={12} />

            {teacher.passPercentage}% Pass

          </div>

        ) : (

          <div className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
            Medium Ranking
          </div>

        )}

  {/* Ranking Type */}

      <div
        className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
          teacher.rankingType ===
          "RESULT_BASED"
            ? "bg-blue-100 text-blue-700"
            : "bg-purple-100 text-purple-700"
        }`}
      >

        <Award size={12} />

        {teacher.rankingType ===
        "RESULT_BASED"
          ? "Result Based"
          : "Experience Based"}

      </div>

    </div>
          </div>
        </div>

        <div
          className={`rounded-full px-3 py-1 text-[10px] font-bold ${
            teacher.isActive
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {teacher.isActive
            ? "ACTIVE"
            : "INACTIVE"}
        </div>
      </div>

      {/* Body */}
      <div className="space-y-4 p-5">
        <InfoRow
          icon={Monitor}
          label="Mode"
          value={teacher.mode}
        />

        <InfoRow
          icon={IndianRupee}
          label="Fee"
          value={
            teacher.monthlyFee
              ? `₹${teacher.monthlyFee}`
              : "-"
          }
        />

        <InfoRow
          icon={Users}
          label="Capacity"
          value={teacher.capacity || "-"}
        />

        <InfoRow
          icon={GraduationCap}
          label="Subjects"
          value={teacher.subjects?.join(", ")}
        />

        <InfoRow
          icon={Layers3}
          label="Grades"
          value={teacher.grades?.join(", ")}
        />
        <InfoRow
          icon={BadgeCheck}
          label="Ranking Score"
          value={
            teacher.rankingScore
              ? Number(
                  teacher.rankingScore
                ).toFixed(1)
              : "Medium"
          }
        />

        <InfoRow
          icon={TrendingUp}
          label="Average Student Score"
          value={
            teacher.averageStudentScore
              ? `${teacher.averageStudentScore}%`
              : "Not Available"
          }
        />

        {teacher.bio && (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
            {teacher.bio}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-3 border-t border-slate-100 p-4">
        <button
          onClick={onEdit}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          <Pencil size={14} />
          Edit
        </button>

        <button
          onClick={onDelete}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
        >
          <Trash2 size={14} />
          Archive
        </button>
      </div>
    </div>
  );
};

export default TutorialTeacherCard;
