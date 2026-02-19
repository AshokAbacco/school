// components/FormFields.jsx
import { AlertCircle } from "lucide-react";

export const COLORS = {
  primary: "#384959",
  secondary: "#6A89A7",
  accent: "#88BDF2",
  light: "#BDDDFC",
  border: "rgba(136,189,242,0.35)",
  bgSoft: "rgba(189,221,252,0.08)",
};

export const InputField = ({
  label,
  icon: Icon,
  error,
  hint,
  className = "",
  ...props
}) => (
  <div className={`space-y-1.5 ${className}`}>
    {label && (
      <label
        className="text-xs font-bold ml-1"
        style={{ color: COLORS.secondary }}
      >
        {label}
      </label>
    )}
    <div className="relative">
      {Icon && (
        <div
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: COLORS.secondary }}
        >
          <Icon size={16} />
        </div>
      )}
      <input
        {...props}
        className={`w-full text-sm border rounded-xl py-2.5 transition-all outline-none focus:ring-2 bg-white ${
          Icon ? "pl-10" : "pl-4"
        } ${error ? "border-red-400 bg-red-50/30" : ""}`}
        style={{
          border: error ? "1px solid #f87171" : `1px solid ${COLORS.border}`,
          color: COLORS.primary,
          focusRingColor: COLORS.accent,
        }}
      />
      {error && (
        <AlertCircle
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400"
        />
      )}
    </div>
    {error && (
      <p className="text-[10px] text-red-500 ml-1 font-medium">{error}</p>
    )}
    {hint && !error && (
      <p className="text-[10px] ml-1" style={{ color: COLORS.secondary }}>
        {hint}
      </p>
    )}
  </div>
);
