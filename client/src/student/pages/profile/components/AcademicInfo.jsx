// client/src/student/pages/profile/components/AcademicInfo.jsx
import React from "react";
import {
  BookOpen, Hash, Calendar, Award, GraduationCap,
  Layers, GitBranch, School, CheckCircle, AlertCircle,
} from "lucide-react";
import { InfoCard, InfoGrid, SectionHeading, Loading, ErrorMsg, fmtDate, C } from "./shared.jsx";

const STATUS_COLOR = {
  ACTIVE:              "#16a34a",
  COMPLETED:           "#2563eb",
  GRADUATED:           "#7c3aed",
  INACTIVE:            "#d97706",
  SUSPENDED:           "#dc2626",
  FAILED:              "#dc2626",
  PENDING_READMISSION: "#d97706",
};

export default function AcademicInfo({ profileData, loading, error }) {
  if (loading) return <Loading />;
  if (error)   return <ErrorMsg msg={error} />;

  const enrollments    = profileData?.enrollments ?? [];
  const active         = enrollments.find(e => e.academicYear?.isActive) ?? enrollments[0];
  const cs             = active?.classSection;
  const ay             = active?.academicYear;
  const stream         = cs?.stream;
  const combo          = cs?.combination;
  const course         = cs?.course;
  const branch         = cs?.branch;
  const prevEnrollments = enrollments.filter(e => e.id !== active?.id);
  const statusColor    = STATUS_COLOR[active?.status] ?? C.mid;

  return (
    <div>
      <SectionHeading icon={BookOpen} title="Current Academic Enrollment" />
      <InfoGrid>
        <InfoCard icon={Hash}          label="Admission Number"   value={active?.admissionNumber} />
        <InfoCard icon={Hash}          label="Roll Number"        value={active?.rollNumber} />
        <InfoCard icon={Calendar}      label="Admission Date"     value={fmtDate(active?.admissionDate)} />
        <InfoCard icon={Award}         label="Academic Year"      value={ay?.name} />
        <InfoCard icon={GraduationCap} label="Grade"              value={cs?.grade} />
        <InfoCard icon={Layers}        label="Section"            value={cs?.section} />
        <InfoCard icon={BookOpen}      label="Class Name"         value={cs?.name} />
        <InfoCard
          icon={active?.status === "ACTIVE" ? CheckCircle : AlertCircle}
          label="Enrollment Status"
          value={active?.status}
          accent={statusColor}
        />
        {stream && <InfoCard icon={GitBranch} label="Stream"      value={stream.name} />}
        {combo  && <InfoCard icon={GitBranch} label="Combination" value={combo.name} />}
        {course && <InfoCard icon={School}    label="Course"      value={course.name} />}
        {branch && <InfoCard icon={GitBranch} label="Branch"      value={branch.name} />}
        {active?.externalId && <InfoCard icon={Hash} label="External ID" value={active.externalId} />}
      </InfoGrid>

      {/* ── Previous School ── */}
      {(active?.previousSchoolName || active?.previousSchoolBoard) && (
        <div style={{ marginTop: 22 }}>
          <SectionHeading icon={School} title="Previous School Information" />
          <InfoGrid>
            <InfoCard icon={School}   label="Previous School" value={active.previousSchoolName} />
            <InfoCard icon={BookOpen} label="Board"           value={active.previousSchoolBoard} />
            {active.udiseCode   && <InfoCard icon={Hash}  label="UDISE Code"   value={active.udiseCode} />}
            {active.lateralEntry && <InfoCard icon={Award} label="Lateral Entry" value="Yes" />}
          </InfoGrid>
        </div>
      )}

      {/* ── Past Enrollments ── */}
      {prevEnrollments.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <SectionHeading icon={Calendar} title="Previous Enrollments" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {prevEnrollments.map(e => {
              const sc = STATUS_COLOR[e.status] ?? C.mid;
              return (
                <div key={e.id} style={{
                  background: "rgba(248,251,255,0.95)",
                  border: `1.5px solid ${C.pale}`,
                  borderRadius: 12, padding: "12px 14px",
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", flexWrap: "wrap", gap: 8,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>
                      {e.classSection?.name ?? `Grade ${e.classSection?.grade}`}
                    </div>
                    <div style={{ fontSize: 10, color: C.mid, marginTop: 2 }}>
                      {e.academicYear?.name} · Adm: {e.admissionNumber ?? "—"}
                    </div>
                  </div>
                  <span className="pf-badge" style={{
                    background: `${sc}15`, color: sc, border: `1px solid ${sc}38`,
                  }}>
                    {e.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}