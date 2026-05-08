import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "What is the Education CRM system?",
    a: "Our Education CRM is a complete school management solution that helps institutions manage students, staff, academics, communication, and finances from a single platform.",
  },
  {
    q: "Who can use this system?",
    a: "It is designed for schools, colleges, and educational institutions of all sizes, including administrators, teachers, students, parents, and finance teams.",
  },
  {
    q: "Is the system cloud-based?",
    a: "Yes, the platform is fully cloud-based, allowing access anytime, anywhere with secure login credentials.",
  },
  {
    q: "Can we manage multiple schools?",
    a: "Yes, multi-school management is available in Gold and Premium plans.",
  },
  {
    q: "Does it support online fee payments?",
    a: "Yes, the system supports online payments via integrated payment gateways.",
  },
  {
    q: "Is there a mobile app available?",
    a: "Yes, mobile apps are available for students, parents, and staff for easy access.",
  },
  {
    q: "Can we customize the system?",
    a: "Yes, we offer customization based on your institution's requirements.",
  },
  {
    q: "Is data secure?",
    a: "Absolutely. We use secure servers, encrypted data storage, and regular backups to ensure your data safety.",
  },
  {
    q: "Do you provide support?",
    a: "Yes, we provide ongoing technical support and training.",
  },
  {
    q: "How long does setup take?",
    a: "Setup typically takes 3–10 working days depending on customization.",
  },
  {
    q: "Can I migrate data from our existing system?",
    a: "Yes. Our onboarding team provides full data migration support from CSV files and most school management systems.",
  },
  {
    q: "What kind of support is included?",
    a: "All plans include email support. Higher plans include priority support and dedicated account managers.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — enjoy a 30-day free trial with no credit card required.",
  },
];

function FAQItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderRadius: 14,
      border: "1.5px solid #e8f2fb",
      marginBottom: 12,
      overflow: "hidden",
      background: open ? "#f7fbff" : "#fff",
      transition: "background 0.2s",
    }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          textAlign: "left",
          background: "none",
          border: "none",
          padding: "18px 24px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: "#1a2533", lineHeight: 1.4 }}>
          {item.q}
        </span>
        {open ? <ChevronUp size={18} color="#6A89A7" /> : <ChevronDown size={18} color="#6A89A7" />}
      </button>
      {open && (
        <div style={{
          padding: "0 24px 18px",
          fontSize: 14,
          color: "#5a7a94",
          lineHeight: 1.75,
        }}>
          {item.a}
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@400;500;600&display=swap');
        .faq-root * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }
        .faq-root { min-height: 100vh; background: linear-gradient(180deg, #d5e2f7c7 0%, #e5f3f8 100%); }
      `}</style>

      <div className="faq-root mt-10" style={{ padding: "60px 24px 80px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{
              display: "inline-block",
              background: "#f0f7ff",
              border: "1.5px solid #e2edf7",
              borderRadius: 100,
              padding: "6px 18px",
              fontSize: 12.5,
              color: "#6A89A7",
              fontWeight: 600,
              letterSpacing: "0.05em",
              marginBottom: 16,
            }}>
              SUPPORT
            </span>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 38,
              fontWeight: 900,
              color: "#1a2533",
              margin: "0 0 14px",
              lineHeight: 1.2,
            }}>
              Frequently Asked{" "}
              <span style={{
                background: "linear-gradient(135deg, #6A89A7 0%, #88BDF2 60%, #384959 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                Questions
              </span>
            </h1>
            <p style={{ fontSize: 15, color: "#7a9db8", margin: 0, lineHeight: 1.6 }}>
              Got questions? We've got answers. Reach out to support if you need more help.
            </p>
          </div>

          {/* FAQ List */}
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem key={i} item={item} />
          ))}

          {/* Contact CTA */}
          <div style={{
            marginTop: 40,
            padding: "24px 28px",
            borderRadius: 16,
            background: "#f5f9ff",
            border: "1.5px solid #e2edf7",
            textAlign: "center",
          }}>
            <p style={{ fontSize: 14, color: "#506979", margin: "0 0 8px", fontWeight: 500 }}>
              Still have questions?
            </p>
            <a
              href="/contact"
              style={{
                display: "inline-block",
                background: "linear-gradient(135deg, #384959 0%, #6A89A7 100%)",
                color: "#fff",
                borderRadius: 100,
                padding: "10px 28px",
                fontSize: 13.5,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Contact Support
            </a>
          </div>

        </div>
      </div>
    </>
  );
}