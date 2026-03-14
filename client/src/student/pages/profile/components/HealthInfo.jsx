// client/src/student/pages/profile/components/HealthInfo.jsx
import React from "react";
import { Heart, Ruler, Weight, Droplet, Activity, Phone, FileText, AlertTriangle } from "lucide-react";
import { SectionHeading, Loading, ErrorMsg, fmt, fmtBlood, C } from "./shared.jsx";

function HealthCard({ icon: Icon, label, value, wide, accent }) {
  const grad = accent
    ? `linear-gradient(135deg, ${accent}, ${accent}bb)`
    : `linear-gradient(135deg, ${C.light}, ${C.mid})`;

  return (
    <div
      className="pf-info-card"
      style={{ gridColumn: wide ? "1 / -1" : undefined }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
        background: grad,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={14} color="#fff" />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 9, fontWeight: 700, color: C.mid,
          textTransform: "uppercase", letterSpacing: ".07em",
        }}>
          {label}
        </div>
        <div style={{
          fontSize: 12, fontWeight: 700, color: C.dark,
          marginTop: 2, wordBreak: "break-word", lineHeight: 1.35,
        }}>
          {fmt(value)}
        </div>
      </div>
    </div>
  );
}

function bmiLabel(bmi) {
  if (!bmi) return null;
  const n = parseFloat(bmi);
  if (n < 18.5) return { label: "Underweight", color: "#d97706" };
  if (n < 25)   return { label: "Normal",      color: "#16a34a" };
  if (n < 30)   return { label: "Overweight",  color: "#d97706" };
  return              { label: "Obese",        color: "#dc2626" };
}

export default function HealthInfo({ profileData, loading, error }) {
  if (loading) return <Loading />;
  if (error)   return <ErrorMsg msg={error} />;

  const pi = profileData?.personalInfo;
  const bmi = pi?.heightCm && pi?.weightKg
    ? (pi.weightKg / Math.pow(pi.heightCm / 100, 2)).toFixed(1)
    : null;
  const bmiInfo = bmiLabel(bmi);

  return (
    <div>
      <SectionHeading icon={Heart} title="Health Information" />

      <div className="pf-health-grid">
        <HealthCard icon={Ruler}   label="Height"      value={pi?.heightCm ? `${pi.heightCm} cm` : null} />
        <HealthCard icon={Weight}  label="Weight"      value={pi?.weightKg ? `${pi.weightKg} kg` : null} />
        <HealthCard icon={Droplet} label="Blood Group" value={fmtBlood(pi?.bloodGroup)} />
        <HealthCard
          icon={Activity}
          label="BMI"
          value={bmi ? `${bmi}${bmiInfo ? ` (${bmiInfo.label})` : ""}` : null}
          accent={bmiInfo?.color}
        />
        <HealthCard icon={AlertTriangle} label="Allergies"          value={pi?.allergies}         wide />
        <HealthCard icon={Heart}         label="Medical Conditions"  value={pi?.medicalConditions}  wide />
        <HealthCard icon={Phone}         label="Emergency Contact"   value={pi?.emergencyContact}   wide />
        {pi?.identifyingMarks && (
          <HealthCard icon={FileText} label="Identifying Marks" value={pi.identifyingMarks} wide />
        )}
      </div>

      {pi?.physicallyChallenged && (
        <div style={{ marginTop: 22 }}>
          <SectionHeading icon={AlertTriangle} title="Disability Information" color="#f59e0b" />
          <div className="pf-health-grid">
            <HealthCard icon={AlertTriangle} label="Physically Challenged" value="Yes" accent="#f59e0b" />
            {pi.disabilityType && (
              <HealthCard icon={FileText} label="Disability Type" value={pi.disabilityType} accent="#f59e0b" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}