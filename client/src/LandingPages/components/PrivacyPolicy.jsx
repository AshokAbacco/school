const SECTIONS = [
  {
    number: "01",

    title: "Information We Collect",

    content: [
      {
        subtitle: "Personal Information",

        items: [
          "Full Name, Phone Number, Email Address",

          "School / College Name",

          "Student, Parent, Teacher and Staff Details",

          "Address Information",
        ],
      },

      {
        subtitle: "Academic Information",

        items: [
          "Student Attendance & Fee Records",

          "Exam Results & Report Cards",

          "Homework, Assignments & Admission Details",

          "Academic Performance Data",
        ],
      },

      {
        subtitle: "Device & Payment Information",

        items: [
          "Device Type, Operating System, IP Address",

          "App Usage Data & Login Activity",

          "Payment details are processed via secure third-party gateways. We do not store complete card or banking information.",
        ],
      },
    ],
  },

  {
    number: "02",

    title: "How We Use Your Information",

    plain:
      "We use your information for managing school and college operations, student admission and administration, fee collection and reminders, attendance tracking, exam and report management, parent communication, teacher and staff management, improving app performance, customer support, security and fraud prevention, and marketing and service updates (where permitted).",
  },

  {
    number: "03",

    title: "Data Sharing and Disclosure",

    plain:
      "We do not sell personal information. We may disclose information to authorized school administrators and personnel, payment processors when payments are enabled, SMS and email providers for communications, hosting and infrastructure providers, technical support providers, and public authorities where required by law. We share only the information reasonably necessary for the relevant purpose and take appropriate steps to require service providers to protect it. Actual sharing depends on the features and services used by your school.",
  },

  {
    number: "04",

    title: "Data Security",

    plain:
      "We implement industry-standard security measures including secure servers, encrypted connections, access controls, role-based permissions, and regular security monitoring. However, no digital system is 100% secure, and users should also protect their login credentials.",
  },

  {
    number: "05",

    title: "Data Retention",

    plain:
      "We retain personal information only for as long as reasonably necessary to provide the services, support school operations, meet legal obligations, resolve disputes, and maintain required business records. Authorized school representatives may request deletion of school data by contacting us. We will review requests, verify the requester’s authority, and delete or anonymize information where appropriate, subject to legal, security, and legitimate record-retention requirements.",
  },

  {
    number: "06",

    title: "Children's Privacy",

    plain:
      "Abacco School App is intended for use by educational institutions and their authorized administrators, teachers, staff, students, and parents. The app may process student information under the direction and authorization of the relevant school. Schools are responsible for ensuring they have the appropriate authority to provide student information to us. Parents or guardians and authorized school representatives may contact us about student-data privacy concerns.",
  },

  {
    number: "07",

    title: "Permissions Used in Mobile App",

    plain:
      "Depending on the features enabled in your version of the app, the app may request access to the camera for photos or document capture, files or media for document handling, notifications for alerts and reminders, or location if a location-based feature such as transport tracking is enabled. The app requests permissions when needed for the relevant feature. Permission availability and use may vary by device and app version. We do not request access to contacts unless a specific feature requires it; if that feature is not available, this statement should be removed.",
  },

  {
    number: "08",

    title: "Your Rights",

    plain:
      "Depending on applicable law and the user’s relationship to the school, users or their authorized representatives may request access to personal information, correction of inaccurate information, deletion of eligible information, or withdrawal of consent where applicable. Students and parents may need to contact their school administrator for records controlled by the school. Requests may be sent to support@eduabaccotech.com. We may ask for information needed to verify the requester’s identity and authority before acting on a request.",
  },

  {
    number: "09",

    title: "Third-Party Services",

    plain:
      "The app or its supporting services may use payment processors, SMS and email delivery providers, cloud hosting providers, and analytics or diagnostics tools, depending on the features enabled. These providers process information under their own terms and privacy policies. The current list of providers and the information they process should be kept consistent with the services actually integrated into the app.",
  },

  {
    number: "10",

    title: "Changes to This Privacy Policy",

    plain:
      "We may update this Privacy Policy when our practices, services, or legal requirements change. We will publish the revised policy on our website and update the “Last Updated” date. Where required, we will provide additional notice or obtain consent for material changes.",
  },
];

const CONTACT_ITEMS = [
  {
    icon: (
      <svg
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <rect x="2" y="4" width="20" height="16" rx="3" />

        <path d="M2 7l10 7 10-7" />
      </svg>
    ),

    label: "Email Us",

    sub: "We reply within a few hours",

    value: "support@eduabaccotech.com",

    href: "mailto:support@eduabaccotech.com",
  },

  {
    icon: (
      <svg
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.02 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
      </svg>
    ),

    label: "Call Us",

    sub: "Mon – Sat, 9 AM – 6 PM",

    value: "+91 9972452044",

    href: "tel:+919972452044",
  },

  {
    icon: (
      <svg
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />

        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),

    label: "Visit Us",

    sub: "Walk-ins welcome",

    value:
      "No 12, 13 & 12/A, Kirthan Arcade, 3rd Floor, Aditya Nagar, Sandeep Unnikrishnan Road, Bangalore — 560097",

    href: "https://maps.google.com/?q=Kirthan+Arcade+Aditya+Nagar+Bangalore",
  },
];

export default function PrivacyPolicy() {
  return (
    <>
      <style>{`

        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap');

        .pp-root * { box-sizing: border-box; font-family: 'DM Sans'; }

        .pp-root {

          min-height: 100vh;

          background: linear-gradient(180deg, #fafcff 0%, #f4f8fd 40%, #ffffff 100%);

        }

        /* Hero */

        .pp-hero {

          background: linear-gradient(135deg, #1a2533 0%, #384959 50%, #4a6680 100%);

          padding: 72px 24px 64px;

          text-align: center;

          position: relative;

          overflow: hidden;

        }

        .pp-hero::before {

          content: '';

          position: absolute; inset: 0;

          background: radial-gradient(ellipse 70% 60% at 50% 0%, rgba(136,189,242,0.18) 0%, transparent 70%);

          pointer-events: none;

        }

        .pp-hero-badge {

          display: inline-block;

          background: rgba(136,189,242,0.15);

          border: 1px solid rgba(136,189,242,0.3);

          border-radius: 100px;

          padding: 6px 18px;

          font-size: 11.5px;

          color: #88BDF2;

          font-weight: 600;

          letter-spacing: 0.08em;

          text-transform: uppercase;

          margin-bottom: 20px;

        }

        .pp-hero h1 {

          font-family: 'Playfair Display', serif;

          font-size: clamp(32px, 5vw, 52px);

          font-weight: 900;

          color: #fff;

          margin: 0 0 16px;

          line-height: 1.15;

        }

        .pp-hero h1 span {

          background: linear-gradient(135deg, #88BDF2 0%, #b8d8f8 100%);

          -webkit-background-clip: text;

          -webkit-text-fill-color: transparent;

          background-clip: text;

        }

        .pp-hero-meta {

          display: flex; align-items: center; justify-content: center; gap: 24px;

          flex-wrap: wrap; margin-top: 8px;

        }

        .pp-hero-meta span {

          font-size: 13px; color: rgba(255,255,255,0.55); font-weight: 500;

        }

        .pp-hero-meta span b { color: rgba(255,255,255,0.8); font-weight: 600; }

        /* Body */

        .pp-body {

          max-width: 860px;

          margin: 0 auto;

          padding: 56px 24px 80px;

        }

        /* Section card */

        .pp-section {

          display: grid;

          grid-template-columns: 52px 1fr;

          gap: 0 20px;

          margin-bottom: 36px;

          background: #fff;

          border: 1.5px solid #e8f2fb;

          border-radius: 20px;

          padding: 28px 28px 28px 24px;

          transition: box-shadow 0.2s;

        }

        .pp-section:hover {

          box-shadow: 0 8px 32px rgba(56,73,89,0.08);

        }

        .pp-num {

          font-family: 'Playfair Display', serif;

          font-size: 13px;

          font-weight: 900;

          color: #88BDF2;

          letter-spacing: 0.04em;

          padding-top: 3px;

          opacity: 0.9;

        }

        .pp-section-title {

          font-family: 'DM Sans', sans-serif;

          font-size: 18px;

          font-weight: 800;

          color: #000000;

          margin: 0 0 14px;

          line-height: 1.3;

        }

        .pp-plain {

          font-size: 14px;

          color: #5a7a94;

          line-height: 1.85;

          margin: 0;

        }

        .pp-sub {

          font-size: 12.5px;

          font-weight: 700;

          color: #384959;

          text-transform: uppercase;

          letter-spacing: 0.06em;

          margin: 14px 0 8px;

        }

        .pp-sub:first-child { margin-top: 0; }

        .pp-list {

          list-style: none; margin: 0 0 4px; padding: 0;

        }

        .pp-list li {

          font-size: 13.5px;

          color: #5a7a94;

          line-height: 1.7;

          padding: 3px 0 3px 18px;

          position: relative;

        }

        .pp-list li::before {

          content: '';

          position: absolute; left: 0; top: 11px;

          width: 6px; height: 6px;

          border-radius: 50%;

          background: linear-gradient(135deg, #6A89A7, #88BDF2);

        }

        /* Contact section */

        .pp-contact {

          margin-top: 56px;

          padding: 40px 32px;

          background: linear-gradient(135deg, #1a2533 0%, #384959 100%);

          border-radius: 24px;

          position: relative;

          overflow: hidden;

        }

        .pp-contact::before {

          content: '';

          position: absolute; top: -40px; right: -40px;

          width: 200px; height: 200px;

          border-radius: 50%;

          background: radial-gradient(circle, rgba(136,189,242,0.12) 0%, transparent 70%);

          pointer-events: none;

        }

        .pp-contact-heading {

          font-family: 'Playfair Display', serif;

          font-size: 24px; font-weight: 900;

          color: #fff; margin: 0 0 6px;

        }

        .pp-contact-sub {

          font-size: 13.5px; color: rgba(255,255,255,0.5);

          margin: 0 0 32px; line-height: 1.5;

        }

        .pp-contact-grid {

          display: grid;

          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));

          gap: 16px;

        }

        .pp-contact-card {

          background: rgba(255,255,255,0.07);

          border: 1px solid rgba(136,189,242,0.18);

          border-radius: 16px;

          padding: 20px 20px 22px;

          text-decoration: none;

          transition: background 0.2s, border-color 0.2s, transform 0.2s;

          display: block;

        }

        .pp-contact-card:hover {

          background: rgba(136,189,242,0.12);

          border-color: rgba(136,189,242,0.4);

          transform: translateY(-3px);

        }

        .pp-contact-icon {

          width: 44px; height: 44px;

          border-radius: 12px;

          background: rgba(136,189,242,0.15);

          border: 1px solid rgba(136,189,242,0.25);

          display: flex; align-items: center; justify-content: center;

          color: #88BDF2;

          margin-bottom: 14px;

        }

        .pp-contact-label {

          font-size: 13px; font-weight: 700;

          color: #fff; margin: 0 0 3px;

        }

        .pp-contact-hint {

          font-size: 11.5px; color: rgba(255,255,255,0.45);

          margin: 0 0 10px;

        }

        .pp-contact-value {

          font-size: 13px; font-weight: 600;

          color: #88BDF2; line-height: 1.5;

          word-break: break-word;

        }

        /* Final statement */

        .pp-final {

          margin-top: 32px;

          padding: 20px 24px;

          border-radius: 14px;

          background: #f5f9ff;

          border: 1.5px solid #e2edf7;

          text-align: center;

          font-size: 13.5px;

          color: #506979;

          line-height: 1.7;

        }

        .pp-final strong {

          color: #1a2533; font-weight: 700;

          font-family: 'DM Sans', sans-serif;

        }

        @media (max-width: 600px) {

          .pp-section { grid-template-columns: 1fr; gap: 4px; padding: 22px 20px; }

          .pp-num { font-size: 11px; margin-bottom: 2px; }

          .pp-contact { padding: 28px 20px; }

        }

      `}</style>

      <div className="pp-root">
        {/* Hero */}

        <div className="pp-hero mt-10">
          <div className="pp-hero-badge">Legal · Privacy</div>

          <h1>
            Privacy <span>Policy</span>
          </h1>

          <div className="pp-hero-meta">
            <span>
              Effective Date: <b>27-04-2025</b>
            </span>

            <span style={{ color: "rgba(255,255,255,0.25)" }}>·</span>

            <span>
              Last Updated: <b>09-10-2026</b>
            </span>
          </div>

          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.55)",
              marginTop: 20,
              maxWidth: 560,
              margin: "20px auto 0",
              lineHeight: 1.7,
            }}
          >
            Welcome to{" "}
            <strong
              style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600 }}
            >
              Abacco School App
            </strong>
            , developed and operated by{" "}
            <strong
              style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600 }}
            >
              Abacco Technology
            </strong>
            . Abacco School App provides school administration and education
            management services. This Privacy Policy explains how we collect,
            use, store, share, and protect information when you use our app and
            related services.
          </p>
        </div>

        {/* Content */}

        <div className="pp-body">
          {SECTIONS.map((sec) => (
            <div className="pp-section" key={sec.number}>
              <div className="pp-num">{sec.number}</div>

              <div>
                <h2 className="pp-section-title">{sec.title}</h2>

                {sec.plain && <p className="pp-plain">{sec.plain}</p>}

                {sec.content &&
                  sec.content.map((block, i) => (
                    <div key={i}>
                      <div className="pp-sub">{block.subtitle}</div>

                      <ul className="pp-list">
                        {block.items.map((item, j) => (
                          <li key={j}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            </div>
          ))}

          {/* Contact */}

          <div className="pp-contact">
            <h3 className="pp-contact-heading">Contact Us</h3>

            <p className="pp-contact-sub">
              Questions about this Privacy Policy? Reach out to our team — we're
              here to help.
            </p>

            <div className="pp-contact-grid">
              {CONTACT_ITEMS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="pp-contact-card"
                  target={item.href.startsWith("https") ? "_blank" : undefined}
                  rel="noreferrer"
                >
                  <div className="pp-contact-icon">{item.icon}</div>

                  <div className="pp-contact-label">{item.label}</div>

                  <div className="pp-contact-hint">{item.sub}</div>

                  <div className="pp-contact-value">{item.value}</div>
                </a>
              ))}
            </div>
          </div>

          {/* Final statement */}

          <div className="pp-final">
            <strong>Your trust is important to us.</strong>
            <br />
            We are committed to protecting student, parent, teacher, and
            institutional data with responsibility, transparency, and security.
          </div>
        </div>
      </div>
    </>
  );
}
