const certificates = [
    {
        id: 1,
        recipient: "Student XYZ Surname",
        description: "For completing the Science Fair with excellence",
        date: "15 Jan 2026",
        awarder: "Dr. Sharma",
        sealColor: "#f59e0b",
        hasRibbon: true,
    },
    {
        id: 2,
        recipient: "Student XYZ Surname",
        description: "For outstanding performance in Math Olympiad",
        date: "10 Dec 2025",
        awarder: "Ms. Patel",
        sealColor: "#f59e0b",
        hasRibbon: false,
    },
    {
        id: 3,
        recipient: "Student XYZ Surname",
        description: "For exceptional athletic performance",
        date: "20 Nov 2025",
        awarder: "Mr. Singh",
        sealColor: "#f59e0b",
        hasRibbon: true,
    },
    {
        id: 4,
        recipient: "Student XYZ Surname",
        description: "Description, example: for completing course",
        date: "25 Nov 2025",
        awarder: "Awarder",
        sealColor: "#f59e0b",
        hasRibbon: false,
    },
];

// ── Certificate Card (visual document style) ──────────────────────────────────
const CertificateCard = ({ cert }) => (
    <div className="relative bg-white rounded-lg shadow-md overflow-hidden border border-gray-200"
        style={{ aspectRatio: '4/3' }}>

        {/* ── Top-left blue corner decoration ── */}
        <div className="absolute top-0 left-0 w-16 h-16 overflow-hidden">
            <div
                className="absolute"
                style={{
                    width: 0, height: 0,
                    borderTop: '64px solid #1e3a8a',
                    borderRight: '64px solid transparent',
                }}
            />
            {/* Gold stripe on corner */}
            <div
                className="absolute"
                style={{
                    width: 0, height: 0,
                    borderTop: '56px solid #ca8a04',
                    borderRight: '56px solid transparent',
                }}
            />
        </div>

        {/* ── Bottom-right blue corner decoration ── */}
        <div className="absolute bottom-0 right-0 w-16 h-16 overflow-hidden">
            <div
                className="absolute bottom-0 right-0"
                style={{
                    width: 0, height: 0,
                    borderBottom: '64px solid #1e3a8a',
                    borderLeft: '64px solid transparent',
                }}
            />
            <div
                className="absolute bottom-0 right-0"
                style={{
                    width: 0, height: 0,
                    borderBottom: '56px solid #ca8a04',
                    borderLeft: '56px solid transparent',
                }}
            />
        </div>

        {/* ── Diagonal line decorations (top-right area) ── */}
        <svg className="absolute top-2 right-2 opacity-20" width="80" height="80" viewBox="0 0 80 80">
            <line x1="80" y1="0" x2="0" y2="80" stroke="#1e3a8a" strokeWidth="1" />
            <line x1="80" y1="10" x2="10" y2="80" stroke="#1e3a8a" strokeWidth="1" />
            <line x1="80" y1="20" x2="20" y2="80" stroke="#1e3a8a" strokeWidth="1" />
        </svg>

        {/* ── Certificate Content ── */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 py-4 text-center">
            {/* Title */}
            <p className="text-xs font-bold tracking-widest text-gray-800 uppercase" style={{ fontSize: '11px', letterSpacing: '3px' }}>
                CERTIFICATE
            </p>
            <p className="text-blue-600 font-semibold tracking-widest uppercase mt-0.5" style={{ fontSize: '9px', letterSpacing: '2px' }}>
                OF ACHIEVEMENT
            </p>

            {/* Divider */}
            <div className="flex items-center gap-2 my-2 w-full">
                <div className="flex-1 h-px bg-gray-300" />
                <div className="w-1 h-1 rounded-full bg-gray-400" />
                <div className="flex-1 h-px bg-gray-300" />
            </div>

            {/* Proudly presented to */}
            <p className="text-gray-400 uppercase tracking-widest" style={{ fontSize: '7px', letterSpacing: '2px' }}>
                PROUDLY PRESENTED TO
            </p>

            {/* Recipient */}
            <p className="text-blue-600 font-bold mt-1" style={{ fontSize: '15px' }}>
                {cert.recipient}
            </p>

            {/* Divider */}
            <div className="w-24 h-px bg-gray-300 my-2" />

            {/* Description */}
            <p className="text-gray-500" style={{ fontSize: '8px' }}>
                {cert.description}
            </p>

            {/* Bottom row: Date, Seal, Signature */}
            <div className="flex items-end justify-between w-full mt-3 px-2">
                {/* Date */}
                <div className="text-left">
                    <p className="text-gray-800 font-medium" style={{ fontSize: '8px' }}>{cert.date}</p>
                    <div className="w-14 h-px bg-gray-400 mt-0.5" />
                    <p className="text-gray-400 uppercase tracking-widest mt-0.5" style={{ fontSize: '6px' }}>DATE</p>
                </div>

                {/* Gold Medal Seal */}
                <div className="flex flex-col items-center -mb-1">
                    {/* Seal circle */}
                    <div
                        className="rounded-full flex items-center justify-center shadow-md"
                        style={{
                            width: '36px',
                            height: '36px',
                            background: 'radial-gradient(circle at 35% 35%, #fde68a, #f59e0b, #b45309)',
                        }}
                    >
                        {/* Inner ring */}
                        <div
                            className="rounded-full border-2 border-yellow-300 flex items-center justify-center"
                            style={{ width: '28px', height: '28px' }}
                        >
                            <span style={{ fontSize: '10px' }}>★</span>
                        </div>
                    </div>
                    {/* Ribbon (only on some) */}
                    {cert.hasRibbon && (
                        <div className="flex gap-0.5 mt-0.5">
                            <div className="w-2 h-3 bg-blue-700 rounded-b-sm" />
                            <div className="w-2 h-3 bg-blue-800 rounded-b-sm" />
                        </div>
                    )}
                </div>

                {/* Signature */}
                <div className="text-right">
                    <p className="text-gray-800 font-medium italic" style={{ fontSize: '8px' }}>{cert.awarder}</p>
                    <div className="w-14 h-px bg-gray-400 mt-0.5 ml-auto" />
                    <p className="text-gray-400 uppercase tracking-widest mt-0.5" style={{ fontSize: '6px' }}>SIGNATURE</p>
                </div>
            </div>
        </div>
    </div>
);

// ── Main Certificates Page ────────────────────────────────────────────────────
const Certificates = () => {
    return (
        <div className="p-6 bg-white min-h-screen max-w-5xl">
            {/* Header */}
            <h1 className="text-3xl font-bold text-gray-900 mb-6">My Certificates</h1>

            {/* Certificates Grid */}
            <div className="grid grid-cols-3 gap-6 mb-8">
                {certificates.map((cert) => (
                    <CertificateCard key={cert.id} cert={cert} />
                ))}
            </div>


        </div>
    );
};

export default Certificates;