// client/src/admin/pages/certificates/components/CertificateCard.jsx
import * as Icons from "lucide-react";
import { FileText } from "lucide-react";
import { C } from "./theme";

export default function CertificateCard({ type, onGenerate, onHistory }) {
  const Icon = Icons[type.icon] || FileText;

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 transition-transform hover:-translate-y-0.5"
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        boxShadow: "0 2px 10px rgba(56,73,89,0.06)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ width: 44, height: 44, background: `${C.sky}22`, color: C.deep }}
        >
          <Icon size={22} />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-[15px] leading-snug" style={{ color: C.deep }}>
            {type.label}
          </h3>
          <p className="text-xs mt-1 leading-snug" style={{ color: C.textLight }}>
            {type.description}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-1">
        <button
          onClick={() => onGenerate(type.key)}
          className="flex-1 text-xs font-bold rounded-lg py-2 transition-colors"
          style={{ background: C.deep, color: "#fff" }}
        >
          Generate
        </button>
        <button
          onClick={() => onHistory(type.key)}
          className="flex-1 text-xs font-bold rounded-lg py-2 border transition-colors"
          style={{ borderColor: C.border, color: C.deep, background: C.bg }}
        >
          History
        </button>
      </div>
    </div>
  );
}
