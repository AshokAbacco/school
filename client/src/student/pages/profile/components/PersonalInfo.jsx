// client/src/student/pages/profile/components/PersonalInfo.jsx
import React from "react";
import {
  User, Calendar, Phone, Mail, MapPin, FileText,
  Globe, BookOpen, Users, Hash,
} from "lucide-react";
import { C, InfoCard, InfoGrid, SectionHeading, Loading, ErrorMsg, fmtDate } from "./shared.jsx";

export default function PersonalInfo({ profileData, enrollment, loading, error }) {
  if (loading) return <Loading />;
  if (error)   return <ErrorMsg msg={error} />;

  const pi      = profileData?.personalInfo;
  const parents = profileData?.parentLinks ?? [];
  const father  = parents.find(p => p.relation === "FATHER")?.parent;
  const mother  = parents.find(p => p.relation === "MOTHER")?.parent;
  const guardian = parents.find(p => p.relation === "GUARDIAN")?.parent;

  const fullName = pi
    ? `${pi.firstName}${pi.lastName ? " " + pi.lastName : ""}`
    : profileData?.name ?? "—";

  const address = [pi?.address, pi?.city, pi?.state, pi?.zipCode]
    .filter(Boolean).join(", ") || "—";

  return (
    <div>
      {/* ── Personal ── */}
      <SectionHeading icon={User} title="Personal Information" />
      <InfoGrid>
        <InfoCard icon={Hash}     label="Admission No"    value={enrollment?.admissionNumber} />
        <InfoCard icon={User}     label="Full Name"        value={fullName} />
        <InfoCard icon={Calendar} label="Date of Birth"    value={fmtDate(pi?.dateOfBirth)} />
        <InfoCard icon={Users}    label="Gender"           value={pi?.gender} />
        <InfoCard icon={Phone}    label="Mobile Number"    value={pi?.phone} />
        <InfoCard icon={Mail}     label="Email Address"    value={profileData?.email} />
        <InfoCard icon={MapPin}   label="Current Address"  value={address} wide />
      </InfoGrid>

      {/* ── Identity ── */}
      <div style={{ marginTop: 22 }}>
        <SectionHeading icon={FileText} title="Identity Details" />
        <InfoGrid>
          <InfoCard icon={Hash}     label="Aadhaar Number"  value={pi?.aadhaarNumber ? `XXXX-XXXX-${pi.aadhaarNumber.slice(-4)}` : null} />
          <InfoCard icon={Hash}     label="SATS Number"     value={pi?.satsNumber} />
          <InfoCard icon={Globe}    label="Nationality"     value={pi?.nationality} />
          <InfoCard icon={Globe}    label="Religion"        value={pi?.religion} />
          <InfoCard icon={BookOpen} label="Mother Tongue"   value={pi?.motherTongue} />
          <InfoCard icon={FileText} label="Caste Category"  value={pi?.casteCategory} />
          {pi?.subcaste     && <InfoCard icon={FileText} label="Sub-Caste"      value={pi.subcaste} />}
          {pi?.domicileState && <InfoCard icon={Globe}   label="Domicile State" value={pi.domicileState} />}
        </InfoGrid>
      </div>

      {/* ── Parent / Guardian ── */}
      <div style={{ marginTop: 22 }}>
        <SectionHeading icon={Users} title="Parent / Guardian Information" />
        {[
          { label: "Father",   p: father   },
          { label: "Mother",   p: mother   },
          { label: "Guardian", p: guardian },
        ].filter(({ p }) => p).map(({ label, p }) => (
          <div key={label} style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: C.mid,
              textTransform: "uppercase", letterSpacing: ".07em",
              marginBottom: 9, display: "flex", alignItems: "center", gap: 6,
            }}>
              <div style={{ width: 3, height: 12, borderRadius: 99, background: C.light }} />
              {label}
            </div>
            <InfoGrid>
              <InfoCard icon={User}     label="Name"       value={p.name} />
              <InfoCard icon={Phone}    label="Phone"      value={p.phone} />
              <InfoCard icon={Mail}     label="Email"      value={p.email} />
              <InfoCard icon={FileText} label="Occupation" value={p.occupation} />
            </InfoGrid>
          </div>
        ))}
        {!father && !mother && !guardian && (
          <InfoGrid>
            <InfoCard icon={User}  label="Parent Name"  value={pi?.parentName} />
            <InfoCard icon={Phone} label="Parent Phone" value={pi?.parentPhone} />
            <InfoCard icon={Mail}  label="Parent Email" value={pi?.parentEmail} />
          </InfoGrid>
        )}
      </div>
    </div>
  );
}