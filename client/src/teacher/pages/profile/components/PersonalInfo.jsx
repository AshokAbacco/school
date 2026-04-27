// components/PersonalInfo.jsx

import React from "react";
import {
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  FileText,
} from "lucide-react";

import {
  InfoGrid,
  InfoCard,
  SectionHeading,
  Loading,
  ErrorMsg,
  fmtDate,
} from "./shared.jsx";

export default function PersonalInfo({ teacher, loading, error }) {
  if (loading) return <Loading />;
  if (error) return <ErrorMsg msg={error} />;

  const address = [
    teacher?.address,
    teacher?.city,
    teacher?.state,
    teacher?.zipCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div>
      <SectionHeading icon={User} title="Personal Information" />

      <InfoGrid>
        <InfoCard
          icon={User}
          label="Full Name"
          value={`${teacher.firstName} ${teacher.lastName}`}
        />

        <InfoCard
          icon={Calendar}
          label="Date Of Birth"
          value={fmtDate(teacher.dateOfBirth)}
        />

        <InfoCard
          icon={Phone}
          label="Phone"
          value={teacher.phone}
        />

        <InfoCard
          icon={Mail}
          label="Email"
          value={teacher?.user?.email}
        />

        <InfoCard
          icon={FileText}
          label="Gender"
          value={teacher.gender}
        />

        <InfoCard
          icon={MapPin}
          label="Address"
          value={address}
          wide
        />
      </InfoGrid>
    </div>
  );
}