import React, { useState, useEffect } from "react";
import { X, ChevronDown, User, Mail, Phone, BookOpen, MapPin, DollarSign } from "lucide-react";

const Addstudent = ({ open, handleClose, addStudentData, editData }) => {

    const [student, setStudent] = useState({
        name: "",
        email: "",
        phone: "",
        course: "",
        fees: "",
        address: ""
    });
    const [schools, setSchools] = useState([]);
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);

    const [selectedSchool, setSelectedSchool] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [openFeesPopup, setOpenFeesPopup] = useState(false);

    const [feeBreakdown, setFeeBreakdown] = useState({
        tuition: "",
        transport: "",
        books: "",
        exam: "",
        misc: ""
    });

    useEffect(() => {
        if (!open) return;
        if (editData) {
            setStudent({
                name: editData?.name ?? "",
                email: editData?.email ?? "",
                phone: editData?.phone ?? "",
                course: editData?.course ?? "",
                fees: editData?.fees ?? "",
                address: editData?.address ?? ""
            });
        } else {
            setStudent({ name: "", email: "", phone: "", course: "", fees: "", address: "" });
        }
    }, [open, editData]);

    useEffect(() => {
        if (!open) return;
        fetch("http://localhost:5000/api/finance/schools")
            .then(res => res.json())
            .then(data => setSchools(data));
    }, [open]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setStudent(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let url = "http://localhost:5000/api/finance/addStudentFinance";
            let method = "POST";
            if (editData) {
                url = `http://localhost:5000/api/finance/updateStudentFinance/${editData.id}`;
                method = "PUT";
            }
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(student)
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.log("Server Error 👉", errorText);
                return;
            }
            const result = await response.json();
            console.log("Saved in DB 👉", result);
            addStudentData(result);
            handleClose();
            setStudent({ name: "", email: "", phone: "", course: "", fees: "", address: "" });
        } catch (error) {
            console.log("API Error 👉", error);
        }
    };

    if (!open) return null;

    const handleSchoolChange = async (e) => {
        const schoolId = e.target.value;
        setSelectedSchool(schoolId);
        const res = await fetch(`http://localhost:5000/api/finance/classSections?schoolId=${schoolId}`);
        const data = await res.json();
        setClasses(data);
    };

    const handleClassChange = async (e) => {
        const classId = e.target.value;
        setSelectedClass(classId);
        const res = await fetch(`http://localhost:5000/api/finance/studentsByClass?classSectionId=${classId}`);
        const data = await res.json();
        setStudents(data);
    };

    const feeTotal =
        Number(feeBreakdown.tuition || 0) +
        Number(feeBreakdown.transport || 0) +
        Number(feeBreakdown.books || 0) +
        Number(feeBreakdown.exam || 0) +
        Number(feeBreakdown.misc || 0);

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

                :root {
                    --brand:        #3f556c;
                    --brand-dark:   #2e3f52;
                    --brand-deeper: #1e2c3a;
                    --brand-light:  #5a7390;
                    --brand-mist:   #eef1f4;
                    --brand-fog:    #dce3ea;
                    --brand-glow:   rgba(63,85,108,0.15);
                }

                .as-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 25, 36, 0.78);
                    backdrop-filter: blur(7px);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                    font-family: 'Sora', sans-serif;
                    padding: 20px;
                }

                .as-modal {
                    background: #ffffff;
                    border-radius: 20px;
                    width: 100%;
                    max-width: 520px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 32px 80px rgba(15,25,36,0.28), 0 0 0 1px var(--brand-fog);
                    position: relative;
                    animation: slideUp 0.32s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .as-modal::-webkit-scrollbar { width: 4px; }
                .as-modal::-webkit-scrollbar-track { background: transparent; }
                .as-modal::-webkit-scrollbar-thumb { background: var(--brand-fog); border-radius: 4px; }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(24px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }

                /* HEADER STRIPE */
                .as-header {
                    background: linear-gradient(135deg, var(--brand), var(--brand-dark));
                    padding: 24px 28px;
                    border-radius: 20px 20px 0 0;
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                }

                .as-title {
                    font-size: 19px;
                    font-weight: 700;
                    color: #fff;
                    letter-spacing: -0.3px;
                    margin: 0;
                }

                .as-subtitle {
                    font-size: 12.5px;
                    color: rgba(255,255,255,0.6);
                    font-weight: 400;
                    margin: 4px 0 0;
                }

                .as-close-btn {
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    border: none;
                    background: rgba(255,255,255,0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #fff;
                    transition: all 0.2s;
                    flex-shrink: 0;
                }
                .as-close-btn:hover { background: rgba(255,255,255,0.28); }

                .as-body {
                    padding: 22px 28px 28px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .as-section-label {
                    font-size: 10.5px;
                    font-weight: 700;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    color: var(--brand-light);
                    margin-bottom: 10px;
                }

                .as-select-group {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }

                .as-field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .as-label {
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--brand-dark);
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }

                .as-label svg { color: var(--brand-light); }

                .as-select, .as-input, .as-textarea {
                    width: 100%;
                    padding: 10px 14px;
                    border: 1.5px solid var(--brand-fog);
                    border-radius: 10px;
                    font-size: 13.5px;
                    font-family: 'Sora', sans-serif;
                    color: #1e293b;
                    background: var(--brand-mist);
                    outline: none;
                    transition: all 0.2s;
                    box-sizing: border-box;
                    appearance: none;
                    -webkit-appearance: none;
                }

                .as-select:focus, .as-input:focus, .as-textarea:focus {
                    border-color: var(--brand);
                    background: #fff;
                    box-shadow: 0 0 0 3px var(--brand-glow);
                }

                .as-select-wrap {
                    position: relative;
                }
                .as-select-wrap svg {
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    pointer-events: none;
                    color: var(--brand-light);
                }

                .as-textarea {
                    resize: vertical;
                    min-height: 80px;
                    line-height: 1.5;
                }

                .as-fees-input-wrap { position: relative; }

                .as-fees-badge {
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 10.5px;
                    font-weight: 700;
                    color: var(--brand);
                    background: var(--brand-fog);
                    padding: 2px 8px;
                    border-radius: 20px;
                    pointer-events: none;
                    letter-spacing: 0.3px;
                }

                .as-input-fees {
                    cursor: pointer;
                    padding-right: 88px;
                }
                .as-input-fees:hover {
                    border-color: var(--brand);
                    background: #fff;
                }

                .as-form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }

                .as-divider {
                    height: 1px;
                    background: var(--brand-fog);
                    margin: 2px 0;
                }

                .as-actions {
                    display: flex;
                    gap: 10px;
                    padding-top: 4px;
                }

                .as-btn-primary {
                    flex: 1;
                    padding: 12px 20px;
                    background: linear-gradient(135deg, var(--brand), var(--brand-dark));
                    color: #fff;
                    border: none;
                    border-radius: 10px;
                    font-size: 14px;
                    font-weight: 600;
                    font-family: 'Sora', sans-serif;
                    cursor: pointer;
                    transition: all 0.2s;
                    letter-spacing: 0.2px;
                }
                .as-btn-primary:hover {
                    background: linear-gradient(135deg, var(--brand-dark), var(--brand-deeper));
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(63,85,108,0.4);
                }
                .as-btn-primary:active { transform: translateY(0); }

                .as-btn-secondary {
                    padding: 12px 20px;
                    background: var(--brand-mist);
                    color: var(--brand);
                    border: 1.5px solid var(--brand-fog);
                    border-radius: 10px;
                    font-size: 14px;
                    font-weight: 600;
                    font-family: 'Sora', sans-serif;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .as-btn-secondary:hover {
                    background: var(--brand-fog);
                    color: var(--brand-dark);
                }

                /* ── FEES POPUP ── */
                .as-fees-modal {
                    background: #ffffff;
                    border-radius: 24px;
                    width: 100%;
                    max-width: 700px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 40px 100px rgba(15,25,36,0.3), 0 0 0 1px var(--brand-fog);
                    animation: slideUp 0.32s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .as-fees-header {
                    background: linear-gradient(135deg, var(--brand), var(--brand-dark));
                    padding: 28px 36px;
                    border-radius: 24px 24px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .as-fees-title {
                    font-size: 22px;
                    font-weight: 700;
                    color: #fff;
                    letter-spacing: -0.4px;
                    margin: 0 0 4px;
                }

                .as-fees-subtitle {
                    font-size: 13px;
                    color: rgba(255,255,255,0.6);
                }

                .as-fees-body {
                    padding: 30px 36px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .as-fees-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }

                .as-fee-card {
                    background: var(--brand-mist);
                    border: 1.5px solid var(--brand-fog);
                    border-radius: 14px;
                    padding: 18px 20px;
                    transition: all 0.2s;
                }

                .as-fee-card:focus-within {
                    border-color: var(--brand);
                    background: #fff;
                    box-shadow: 0 0 0 3px var(--brand-glow);
                }

                .as-fee-card-label {
                    font-size: 10.5px;
                    font-weight: 700;
                    letter-spacing: 0.8px;
                    text-transform: uppercase;
                    color: var(--brand-light);
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                    gap: 7px;
                }

                .as-fee-card-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    flex-shrink: 0;
                }

                .as-fee-input-wrap {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }

                .as-currency {
                    font-size: 17px;
                    font-weight: 600;
                    color: var(--brand-light);
                    font-family: 'JetBrains Mono', monospace;
                }

                .as-fee-input {
                    border: none;
                    outline: none;
                    background: transparent;
                    font-size: 26px;
                    font-weight: 700;
                    font-family: 'JetBrains Mono', monospace;
                    color: var(--brand-deeper);
                    width: 100%;
                    min-width: 0;
                }
                .as-fee-input::placeholder { color: var(--brand-fog); }

                /* Total bar */
                .as-total-bar {
                    background: linear-gradient(135deg, var(--brand), var(--brand-deeper));
                    border-radius: 16px;
                    padding: 22px 28px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    grid-column: 1 / -1;
                }

                .as-total-label {
                    font-size: 11px;
                    font-weight: 700;
                    color: rgba(255,255,255,0.65);
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                }

                .as-total-desc {
                    font-size: 12px;
                    color: rgba(255,255,255,0.4);
                    margin-top: 4px;
                }

                .as-total-amount {
                    font-size: 38px;
                    font-weight: 700;
                    color: #fff;
                    font-family: 'JetBrains Mono', monospace;
                    letter-spacing: -1px;
                }

                .as-total-currency {
                    font-size: 22px;
                    margin-right: 2px;
                    opacity: 0.65;
                }

                .as-fees-actions {
                    display: flex;
                    gap: 12px;
                    padding: 0 36px 32px;
                }

                /* dot colors — muted palette to match brand */
                .dot-tuition    { background: #3f556c; }
                .dot-transport  { background: #c07a2e; }
                .dot-books      { background: #2e7a5a; }
                .dot-exam       { background: #a63c3c; }
                .dot-misc       { background: #6a5a8c; }
            `}</style>

            {/* MAIN MODAL */}
            <div className="as-overlay">
                <div className="as-modal">

                    {/* Branded header */}
                    <div className="as-header">
                        <div>
                            <h2 className="as-title">{editData ? "Edit Student" : "Add Student Details"}</h2>
                            <p className="as-subtitle">Fill in student financial information below</p>
                        </div>
                        <button className="as-close-btn" onClick={handleClose}>
                            <X size={16} />
                        </button>
                    </div>

                    <div className="as-body">

                        {/* SCHOOL + CLASS */}
                        <div>
                            <p className="as-section-label">School & Class</p>
                            <div className="as-select-group">
                                <div className="as-field">
                                    <label className="as-label">School</label>
                                    <div className="as-select-wrap">
                                        <select className="as-select" value={selectedSchool} onChange={handleSchoolChange}>
                                            <option value="">Select school</option>
                                            {schools.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} />
                                    </div>
                                </div>
                                <div className="as-field">
                                    <label className="as-label">Class</label>
                                    <div className="as-select-wrap">
                                        <select className="as-select" value={selectedClass} onChange={handleClassChange}>
                                            <option value="">Select class</option>
                                            {classes.map(c => (
                                                <option key={c.id} value={c.id}>{c.grade} - {c.section}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* STUDENT SELECTOR */}
                        <div className="as-field">
                            <label className="as-label"><User size={13} /> Student</label>
                            <div className="as-select-wrap">
                                <select
                                    className="as-select"
                                    onChange={(e) => {
                                        const selected = students.find(s => s.student.id === e.target.value);
                                        if (!selected) return;
                                        setStudent({
                                            name: selected.student.name,
                                            email: selected.student.email,
                                            phone: selected.student.personalInfo?.phone || "",
                                            course: "",
                                            fees: "",
                                            address: ""
                                        });
                                    }}
                                >
                                    <option value="">Select student</option>
                                    {students.map(s => (
                                        <option key={s.student.id} value={s.student.id}>{s.student.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} />
                            </div>
                        </div>

                        <div className="as-divider" />

                        {/* FORM */}
                        <form onSubmit={handleSubmit}>
                            <p className="as-section-label">Contact & Academic Info</p>
                            <div className="as-form-grid" style={{ marginBottom: 16 }}>
                                <div className="as-field">
                                    <label className="as-label"><Mail size={13} /> Email</label>
                                    <input
                                        className="as-input"
                                        name="email"
                                        placeholder="student@email.com"
                                        value={student.email}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="as-field">
                                    <label className="as-label"><Phone size={13} /> Phone</label>
                                    <input
                                        className="as-input"
                                        name="phone"
                                        placeholder="+91 00000 00000"
                                        value={student.phone}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="as-field">
                                    <label className="as-label"><BookOpen size={13} /> Course</label>
                                    <input
                                        className="as-input"
                                        name="course"
                                        placeholder="e.g. Science"
                                        value={student.course}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="as-field">
                                    <label className="as-label">₹ Total Fees</label>
                                    <div className="as-fees-input-wrap">
                                        <input
                                            className="as-input as-input-fees"
                                            name="fees"
                                            placeholder="Click to set fees"
                                            value={student.fees ? `₹ ${student.fees}` : ""}
                                            onClick={() => setOpenFeesPopup(true)}
                                            readOnly
                                        />
                                        {student.fees && <span className="as-fees-badge">Breakdown</span>}
                                    </div>
                                </div>
                                <div className="as-field" style={{ gridColumn: "1 / -1" }}>
                                    <label className="as-label"><MapPin size={13} /> Address</label>
                                    <textarea
                                        className="as-textarea"
                                        name="address"
                                        placeholder="Enter full address..."
                                        value={student.address}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="as-actions">
                                <button type="submit" className="as-btn-primary">
                                    {editData ? "Update Student" : "Save Student"}
                                </button>
                                <button type="button" className="as-btn-secondary" onClick={handleClose}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* FEES BREAKDOWN POPUP */}
            {openFeesPopup && (
                <div className="as-overlay" style={{ zIndex: 1100 }}>
                    <div className="as-fees-modal">

                        <div className="as-fees-header">
                            <div>
                                <h3 className="as-fees-title">Fees Breakdown</h3>
                                <p className="as-fees-subtitle">Enter individual components — total is auto-calculated</p>
                            </div>
                            <button className="as-close-btn" onClick={() => setOpenFeesPopup(false)}>
                                <X size={16} />
                            </button>
                        </div>

                        {/* Add these CSS rules into your existing stylesheet */}
                        <style>{`
    .as-fee-card        { border: 1.5px solid rgba(39,67,91,.15); box-shadow: 0 2px 8px rgba(39,67,91,.08); }
    .as-fee-card:hover  { border-color: rgba(39,67,91,.35); box-shadow: 0 4px 14px rgba(39,67,91,.13); }
    .as-fee-card-label  { color: #4A6B80; }

    .dot-tuition   { background: #27435B; }
    .dot-transport { background: #3A5E78; }
    .dot-books     { background: #27435B; opacity: .75; }
    .dot-exam      { background: #1C3044; }
    .dot-misc      { background: #4A6B80; }

    .as-fee-input-wrap              { background: #EAF1F6; border: 1.5px solid #C8DCEC; }
    .as-fee-input-wrap:focus-within { border-color: #27435B; background: #fff; }
    .as-currency                    { color: #27435B; }
    .as-fee-input                   { color: #162535; }
    .as-fee-input::placeholder      { color: #A8C4D6; }

    .as-total-bar      { background: linear-gradient(135deg, #27435B, #1C3044); box-shadow: 0 4px 16px rgba(39,67,91,.28); }
    .as-total-label    { color: #fff; }
    .as-total-desc     { color: rgba(255,255,255,.55); }
    .as-total-amount   { color: #fff; }
    .as-total-currency { color: rgba(255,255,255,.75); }
`}</style>

                        {/* ── JSX UNCHANGED ── */}
                        <div className="as-fees-body">
                            <div className="as-fees-grid">
                                {[
                                    { key: "tuition", label: "Tuition Fee", dot: "dot-tuition" },
                                    { key: "transport", label: "Transport Fee", dot: "dot-transport" },
                                    { key: "books", label: "Books Fee", dot: "dot-books" },
                                    { key: "exam", label: "Exam Fee", dot: "dot-exam" },
                                    { key: "misc", label: "Misc Fee", dot: "dot-misc" },
                                ].map(({ key, label, dot }) => (
                                    <div className="as-fee-card" key={key}>
                                        <div className="as-fee-card-label">
                                            <span className={`as-fee-card-dot ${dot}`} />
                                            {label}
                                        </div>
                                        <div className="as-fee-input-wrap">
                                            <span className="as-currency">₹</span>
                                            <input
                                                className="as-fee-input"
                                                type="number"
                                                placeholder="0"
                                                value={feeBreakdown[key]}
                                                onChange={(e) =>
                                                    setFeeBreakdown({ ...feeBreakdown, [key]: e.target.value })
                                                }
                                            />
                                        </div>
                                    </div>
                                ))}

                                {/* TOTAL */}
                                <div className="as-total-bar">
                                    <div>
                                        <div className="as-total-label">Total Amount</div>
                                        <div className="as-total-desc">Sum of all fee components</div>
                                    </div>
                                    <div className="as-total-amount">
                                        <span className="as-total-currency">₹</span>
                                        {feeTotal.toLocaleString("en-IN")}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="as-fees-actions">
                            <button
                                className="as-btn-primary"
                                onClick={() => {
                                    setStudent(prev => ({ ...prev, fees: feeTotal }));
                                    setOpenFeesPopup(false);
                                }}
                            >
                                Apply Fees
                            </button>
                            <button className="as-btn-secondary" onClick={() => setOpenFeesPopup(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Addstudent;