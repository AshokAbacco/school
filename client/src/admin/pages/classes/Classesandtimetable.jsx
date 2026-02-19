// client/src/admin/pages/classes/ClassesAndTimetable.jsx
import { useState } from "react";
import {
  Clock,
  BookOpen,
  GraduationCap,
  Grid3X3,
  Check,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/PageLayout";
import SchoolTimingsSetup from "./SchoolTimingsSetup";
import SubjectsManagement from "./SubjectsManagement";
import ClassSectionsSetup from "./ClassSectionsSetup";
import TimetableBuilder from "./TimetableBuilder";

const STEPS = [
  { label: "School Timings", icon: Clock, desc: "Periods & breaks" },
  { label: "Subjects", icon: BookOpen, desc: "Define subjects" },
  { label: "Classes", icon: GraduationCap, desc: "Create sections" },
  { label: "Timetable", icon: Grid3X3, desc: "Assign slots" },
];

function StepBar({ current }) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const Icon = s.icon;
        return (
          <div
            key={i}
            className="flex items-center"
            style={{ flex: i < STEPS.length - 1 ? 1 : 0 }}
          >
            <div
              className="flex flex-col items-center gap-1.5"
              style={{ minWidth: 80 }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                style={{
                  background: done
                    ? "#384959"
                    : active
                      ? "rgba(189,221,252,0.4)"
                      : "rgba(189,221,252,0.15)",
                  border: active
                    ? "2px solid rgba(136,189,242,0.5)"
                    : "2px solid transparent",
                }}
              >
                {done ? (
                  <Check size={16} color="#fff" />
                ) : (
                  <Icon
                    size={15}
                    style={{ color: active ? "#384959" : "#88BDF2" }}
                  />
                )}
              </div>
              <div className="text-center">
                <p
                  className="text-sm font-semibold"
                  style={{
                    color: active ? "#384959" : done ? "#384959" : "#88BDF2",
                  }}
                >
                  {s.label}
                </p>
                <p className="text-sm font-normal" style={{ color: "#6A89A7" }}>
                  {s.desc}
                </p>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: done ? "#384959" : "rgba(136,189,242,0.2)",
                  borderRadius: 2,
                  margin: "0 8px",
                  marginBottom: 28,
                  transition: "background .3s",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ClassesAndTimetable() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  return (
    <PageLayout>
      <div
        className="p-4 md:p-6"
        style={{ background: "#F4F8FC", minHeight: "100%" }}
      >
        {/* Page header with Back button */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate("/classes")}
              className="flex items-center gap-1.5 rounded-xl text-sm font-medium transition-all"
              style={{
                padding: "6px 12px",
                border: "1.5px solid rgba(136,189,242,0.4)",
                color: "#6A89A7",
                background: "transparent",
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(189,221,252,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <ArrowLeft size={14} /> Back to Classes
            </button>
          </div>
          <div className="flex items-center gap-2 mb-1 mt-3">
            <div
              className="w-1 h-6 rounded-full"
              style={{ background: "#384959" }}
            />
            <h1 className="text-xl font-semibold" style={{ color: "#384959" }}>
              Classes & Timetable Setup
            </h1>
          </div>
          <p className="text-sm font-normal ml-3" style={{ color: "#6A89A7" }}>
            Set up school timings, subjects, class sections and weekly
            timetables
          </p>
        </div>

        {/* Step bar */}
        <StepBar current={step} />

        {/* Step content */}
        {step === 0 && <SchoolTimingsSetup onNext={() => setStep(1)} />}
        {step === 1 && (
          <SubjectsManagement
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <ClassSectionsSetup
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && <TimetableBuilder onBack={() => setStep(2)} />}
      </div>
    </PageLayout>
  );
}
