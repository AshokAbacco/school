const TERMS_SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: "By accessing or using Education Management Software, you agree to be bound by these Terms & Conditions and our Privacy Policy. If you do not agree, please discontinue use immediately.",
  },
  {
    title: "2. Service Agreement",
    body: "You agree to use the platform in compliance with all applicable laws and regulations. Misuse of the system may result in suspension or termination of access.",
  },
  {
    title: "3. Subscription & Billing",
    body: "All plans are billed annually unless stated otherwise. Renewal charges apply after the initial term and must be paid on time to continue service.",
  },
  {
    title: "4. User Access & Responsibilities",
    body: "You are responsible for maintaining the confidentiality of login credentials and all activities under your account. Notify us immediately of any unauthorized access.",
  },
  {
    title: "5. Data Ownership & Privacy",
    body: "All student and institutional data remains your property. We ensure data confidentiality and do not share it with third parties without consent. Data is securely stored and encrypted.",
  },
  {
    title: "6. Payment Policy",
    body: "All payments must be completed before activation of services. Failure to renew your subscription may result in temporary suspension or permanent loss of access.",
  },
  {
    title: "7. Cancellation Policy",
    body: "Clients may cancel services before the renewal date. Once a service is activated, no refunds will be provided.",
  },
  {
    title: "8. Customization & Changes",
    body: "Additional customization requests beyond the standard offering may incur extra charges depending on the scope and complexity.",
  },
  {
    title: "9. Service Availability",
    body: "We strive to maintain 99.9% uptime. However, we are not liable for downtime caused by maintenance, technical issues, or external factors beyond our control.",
  },
  {
    title: "10. Limitation of Liability",
    body: "Education Management Software shall not be liable for any indirect, incidental, or consequential damages, including data loss or business interruption arising from system usage.",
  },
  {
    title: "11. Updates & Modifications",
    body: "We reserve the right to update features, pricing, or these terms at any time. Continued use of the platform indicates acceptance of the updated terms.",
  },
];

export default function Terms() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@400;500;600&display=swap');
        .terms-root * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }
        .terms-root { min-height: 100vh; background: linear-gradient(180deg, #dae7fada 0%, #ffffff 100%); }
      `}</style>

      <div className="terms-root mt-10" style={{ padding: "60px 24px 80px" }}>
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
              LEGAL
            </span>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 38,
              fontWeight: 900,
              color: "#1a2533",
              margin: "0 0 14px",
              lineHeight: 1.2,
            }}>
              Terms &amp;{" "}
              <span style={{
                background: "linear-gradient(135deg, #6A89A7 0%, #88BDF2 60%, #384959 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                Conditions
              </span>
            </h1>
            <p style={{ fontSize: 14, color: "#90acc2", margin: 0 }}>
              Last updated: January {new Date().getFullYear()} &nbsp;·&nbsp; Please read these terms carefully before using Education Management Software.
            </p>
          </div>

          {/* Terms Sections */}
          <div style={{
            background: "#fff",
            border: "1.5px solid #e8f2fb",
            borderRadius: 20,
            padding: "32px 36px",
          }}>
            {TERMS_SECTIONS.map(({ title, body }, i) => (
              <div
                key={i}
                style={{
                  marginBottom: i < TERMS_SECTIONS.length - 1 ? 28 : 0,
                  paddingBottom: i < TERMS_SECTIONS.length - 1 ? 28 : 0,
                  borderBottom: i < TERMS_SECTIONS.length - 1 ? "1px solid #f0f6fb" : "none",
                }}
              >
                <h3 style={{
                  fontFamily: "DM Sans', sans-serif",
                  fontSize: 16,
                  fontWeight: 900,
                  color: "#1a2533",
                  margin: "0 0 10px",
                }}>
                  {title}
                </h3>
                <p style={{
                  fontSize: 14,
                  color: "#5a7a94",
                  lineHeight: 1.8,
                  margin: 0,
                }}>
                  {body}
                </p>
              </div>
            ))}
          </div>

          {/* Contact note */}
          <div style={{
            marginTop: 28,
            padding: "20px 24px",
            borderRadius: 14,
            background: "#f5f9ff",
            border: "1.5px solid #e2edf7",
            fontSize: 13,
            color: "#7a9db8",
            lineHeight: 1.6,
            textAlign: "center",
          }}>
            For questions about these terms, contact us at{" "}
            <a
              href="mailto:support@eduabaccotech.com"
              style={{ color: "#6A89A7", fontWeight: 600, textDecoration: "none" }}
            >
              support@eduabaccotech.com
            </a>
          </div>

        </div>
      </div>
    </>
  );
}