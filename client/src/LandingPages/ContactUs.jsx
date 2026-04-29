import { useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  MessageSquare,
  Clock,
  Star,
  CheckCircle,
  Loader2,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

export default function ContactUs() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.email || !form.message) {
      alert("Email and message are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSubmitted(true);
        setForm({ firstName: "", lastName: "", email: "", subject: "", message: "" });
        setTimeout(() => setSubmitted(false), 5000);
      } else {
        alert(data.error || "Failed to send message. Please try again.");
      }
    } catch (err) {
      console.error("Contact form error:", err);
      alert("Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-blue-100 bg-blue-50 text-slate-800 text-sm placeholder-slate-400 outline-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all duration-200";

  const labelClass = "block text-xs font-semibold text-slate-600 mb-1.5 tracking-wide";

  return (
    <div className="font-sans text-slate-700">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-sky-100 py-24 px-6 text-center">
        <div className="pointer-events-none absolute -top-32 -right-20 h-[420px] w-[420px] rounded-full bg-blue-200 opacity-25 animate-pulse" />
        <div className="pointer-events-none absolute -bottom-16 -left-12 h-64 w-64 rounded-full bg-sky-200 opacity-20" />

        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-blue-500 mb-6">
            <MessageSquare size={11} /> Contact Us
          </span>

          <h1 className="mb-4 text-4xl font-bold text-slate-900 md:text-5xl lg:text-6xl">
            We'd Love to{" "}
            <span className="text-blue-400">Hear From You</span>
          </h1>

          <p className="mx-auto mb-10 max-w-lg text-base leading-relaxed text-slate-500">
            Have questions or need help? Our team is ready to assist you with all your
            school management needs — usually within a few hours.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: <Clock size={13} />, text: "Avg. 3hr response" },
              { icon: <Phone size={13} />, text: "Live support available" },
              { icon: <Star size={13} />, text: "Dedicated onboarding" },
            ].map(({ icon, text }) => (
              <span
                key={text}
                className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
              >
                <span className="text-blue-400">{icon}</span>
                {text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Body ── */}
      <section className="bg-slate-50 px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-start">

          {/* Contact Cards */}
          <div className="flex flex-col gap-5">

            <div className="group rounded-2xl border border-blue-100 bg-white p-7 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-blue-100 bg-blue-50 transition-transform duration-300 group-hover:scale-110">
                <Mail size={22} className="text-blue-400" />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-slate-800">Email Us</h3>
              <p className="mb-2 text-xs text-slate-400">We reply within a few hours</p>
              <a href="mailto:support@eduabaccotech.com" className="text-sm font-medium text-blue-500 hover:underline">
                support@eduabaccotech.com
              </a>
            </div>

            <div className="group rounded-2xl bg-gradient-to-br from-slate-600 to-blue-400 p-7 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/20 border border-white/30 transition-transform duration-300 group-hover:scale-110">
                <Phone size={22} className="text-white" />
              </div>
              <h3 className="mb-2 text-sm font-semibold text-white">Call Us</h3>
              <a href="tel:+919972452044" className="text-base font-bold text-white hover:opacity-80">
                +91 9972452044
              </a>
            </div>

            <div className="group rounded-2xl border border-blue-100 bg-white p-7 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-blue-100 bg-blue-50 transition-transform duration-300 group-hover:scale-110">
                <MapPin size={22} className="text-blue-400" />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-slate-800">
                <a href="https://maps.app.goo.gl/gXSu8AhJEAkCTm138" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500">
                  Visit Us
                </a>
              </h3>
              <p className="mb-2 text-xs text-slate-400">Walk-ins welcome</p>
              <a
                href="https://maps.app.goo.gl/gXSu8AhJEAkCTm138"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm leading-relaxed text-blue-500 hover:underline"
              >
                No 12,13 &amp; 12/A, Kirthan Arcade, 3rd Floor,<br />
                Aditya Nagar, Sandeep Unnikrishnan Road,<br />
                Bangalore — 560097
              </a>
            </div>
          </div>

          {/* Form Card */}
          <div className="rounded-3xl border border-blue-100 bg-white p-10 shadow-xl shadow-slate-100 max-sm:p-6">
            <div className="mb-8">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-blue-400 mb-3">
                <Send size={10} /> Send a Message
              </span>
              <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
                How Can We <span className="text-blue-400">Help?</span>
              </h2>
              <p className="mt-1 text-sm text-slate-400">Fill in the form and we'll get back to you shortly.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                <div>
                  <label className={labelClass}>First Name</label>
                  <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="John" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Last Name</label>
                  <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Smith" className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Email Address</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="john@yourschool.edu" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Subject</label>
                <select name="subject" value={form.subject} onChange={handleChange} className={inputClass + " cursor-pointer"}>
                  <option value="">Select a topic…</option>
                  <option>General Inquiry</option>
                  <option>Demo Request</option>
                  <option>Technical Support</option>
                  <option>Pricing &amp; Plans</option>
                  <option>Partnership</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Message</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Tell us how we can help your school…"
                  rows={5}
                  className={inputClass + " resize-y min-h-[130px]"}
                />
              </div>

              {submitted ? (
                <div className="flex items-center gap-3 rounded-xl bg-slate-900 px-5 py-4 text-sm font-medium text-white">
                  <CheckCircle size={18} className="text-blue-300 shrink-0" />
                  Message sent! We'll be in touch within a few hours.
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-slate-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-300 transition-all duration-200 hover:bg-slate-800 hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                  {loading ? "Sending…" : "Send Message"}
                </button>
              )}
            </form>
          </div>

        </div>
      </section>
    </div>
  );
}