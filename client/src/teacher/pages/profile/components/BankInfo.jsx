// components/BankInfo.jsx

import React from "react";
import { CreditCard, Landmark, Hash } from "lucide-react";

import {
  InfoGrid,
  InfoCard,
  SectionHeading,
  Loading,
  ErrorMsg,
} from "./shared.jsx";

export default function BankInfo({ teacher, loading, error }) {
  if (loading) return <Loading />;
  if (error) return <ErrorMsg msg={error} />;

  return (
    <div>
      <SectionHeading icon={CreditCard} title="Bank Information" />

      <InfoGrid>
        <InfoCard
          icon={Hash}
          label="Account Number"
          value={teacher.bankAccountNo}
        />

        <InfoCard
          icon={Landmark}
          label="Bank Name"
          value={teacher.bankName}
        />

        <InfoCard
          icon={Hash}
          label="IFSC Code"
          value={teacher.ifscCode}
        />

        <InfoCard
          icon={CreditCard}
          label="Salary"
          value={teacher.salary}
        />
      </InfoGrid>
    </div>
  );
}