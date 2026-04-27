// components/ProfessionalInfo.jsx

import React from "react";
import {
  Briefcase,
  GraduationCap,
  Calendar,
  Award,
} from "lucide-react";

import {
  InfoGrid,
  InfoCard,
  SectionHeading,
  Loading,
  ErrorMsg,
  fmtDate,
} from "./shared.jsx";

export default function ProfessionalInfo({ teacher, loading, error }) {
  if (loading) return <Loading />;
  if (error) return <ErrorMsg msg={error} />;

  return (
    <div>
      <SectionHeading icon={Briefcase} title="Professional Information" />

      <InfoGrid>
        <InfoCard
          icon={Briefcase}
          label="Department"
          value={teacher.department}
        />

        <InfoCard
          icon={Award}
          label="Designation"
          value={teacher.designation}
        />

        <InfoCard
          icon={GraduationCap}
          label="Qualification"
          value={teacher.qualification}
        />

        <InfoCard
          icon={Calendar}
          label="Joining Date"
          value={fmtDate(teacher.joiningDate)}
        />

        <InfoCard
          icon={Award}
          label="Employment Type"
          value={teacher.employmentType}
        />

        <InfoCard
          icon={Award}
          label="Experience"
          value={`${teacher.experienceYears || 0} Years`}
        />
      </InfoGrid>
    </div>
  );
}