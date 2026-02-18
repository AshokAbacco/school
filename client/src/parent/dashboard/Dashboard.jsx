import React, { useEffect, useRef } from "react";

import { ChevronRight, Trophy } from "lucide-react";

/* ─────────────────────────────────────────
   DATA
───────────────────────────────────────── */
const performanceData = [
  { label: "Exam 1", thisYear: 82, lastYear: 65 },
  { label: "Sports", thisYear: 70, lastYear: 55 },
  { label: "Exam 2", thisYear: 91, lastYear: 74 },
  { label: "Actives", thisYear: 60, lastYear: 78 },
  { label: "Exam 3", thisYear: 87, lastYear: 70 },
  { label: "Sports 2", thisYear: 50, lastYear: 62 },
];

const top3 = [
  { rank: 2, name: "Student 2", score: 998, initials: "S2", ring: "border-blue-400", badge: "bg-blue-500", badgeText: "text-white", size: "w-14 h-14", offset: "" },
  { rank: 1, name: "Student 1", score: 999, initials: "S1", ring: "border-yellow-400", badge: "bg-yellow-400", badgeText: "text-yellow-900", size: "w-18 h-18", offset: "-mb-4" },
  { rank: 3, name: "Student 3", score: 997, initials: "S3", ring: "border-purple-400", badge: "bg-purple-500", badgeText: "text-white", size: "w-14 h-14", offset: "" },
];

const rankList = [
  { rank: 4, name: "Student 4", score: 990, isYou: false },
  { rank: 5, name: "Student 5", score: 980, isYou: false },
  { rank: 6, name: "Student 6", score: 977, isYou: false },
  { rank: 7, name: "Student 7", score: 921, isYou: false },
  { rank: 8, name: "Student 8", score: 870, isYou: false },
  { rank: 21, name: "You", score: 812, isYou: true },
];

const teachers = [
  {
    name: "Teacher 1", subject: "Subject 1",
    classes: [
      { label: "Class: 1", time: "10:00 - 11:00" },
      { label: "Class: 3", time: "12:15 - 01:00" },
      { label: "Class: 5", time: "02:00 - 02:45" },
    ],
  },
  {
    name: "Teacher 2", subject: "Subject 2",
    classes: [
      { label: "Class: 2", time: "11:00 - 12:00" },
      { label: "Class: 4", time: "01:00 - 01:45" },
    ],
  },
  {
    name: "Teacher 3", subject: "Subject 3",
    classes: [
      { label: "Class: 1", time: "09:30 - 10:30" },
      { label: "Class: 4", time: "01:30 - 02:15" },
    ],
  },
];

/* ─────────────────────────────────────────
   BAR CHART  (pure canvas, no lib needed)
───────────────────────────────────────── */
function PerformanceChart() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const padL = 36, padR = 16, padT = 16, padB = 36;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const maxVal = 100;
    const groups = performanceData.length;
    const groupW = chartW / groups;
    const barW = 10;
    const gap = 3;

    // Grid lines
    ctx.strokeStyle = "#f0f4f8";
    ctx.lineWidth = 1;
    [0, 25, 50, 75, 100].forEach((v) => {
      const y = padT + chartH - (v / maxVal) * chartH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + chartW, y);
      ctx.stroke();
      ctx.fillStyle = "#94a3b8";
      ctx.font = "9px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(v, padL - 4, y + 3);
    });

    // Axes
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + chartH);
    ctx.lineTo(padL + chartW, padT + chartH);
    ctx.stroke();

    // Bars
    performanceData.forEach((d, i) => {
      const cx = padL + i * groupW + groupW / 2;

      // This Year – green
      const hTY = (d.thisYear / maxVal) * chartH;
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.roundRect(cx - barW - gap / 2, padT + chartH - hTY, barW, hTY, [3, 3, 0, 0]);
      ctx.fill();

      // Last Year – blue
      const hLY = (d.lastYear / maxVal) * chartH;
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.roundRect(cx + gap / 2, padT + chartH - hLY, barW, hLY, [3, 3, 0, 0]);
      ctx.fill();

      // X label
      ctx.fillStyle = "#94a3b8";
      ctx.font = "8.5px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(d.label, cx, padT + chartH + 14);
    });

    // X-axis title
    ctx.fillStyle = "#94a3b8";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Exam/Sports/Actives", padL + chartW / 2, H - 2);

    // Y-axis title
    ctx.save();
    ctx.translate(10, padT + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("Marks/Points", 0, 0);
    ctx.restore();
  }, []);

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-800">Performance</h3>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500" />
            This Year
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500" />
            Last Year
          </span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "170px", display: "block" }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────
   TIMELINE PILL
───────────────────────────────────────── */
function ClassPill({ label, time }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs font-semibold text-gray-700 leading-tight">{label}</span>
      <span className="text-xs text-gray-400 leading-tight">{time}</span>
    </div>
  );
}

function TimelineSep() {
  return (
    <div className="flex items-center mx-1">
      <div className="w-5 h-px bg-blue-300" />
      <div className="w-2 h-2 rounded-full bg-blue-500 mx-0.5" />
      <div className="w-5 h-px bg-blue-300" />
    </div>
  );
}

/* ─────────────────────────────────────────
   LINKED TEACHERS
───────────────────────────────────────── */
function LinkedTeachers() {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <h3 className="text-sm font-bold text-gray-800 mb-3">Linked Teacher's</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left text-gray-400 font-semibold pb-2 pr-3 whitespace-nowrap">
                &nbsp;
              </th>
              <th className="text-left text-gray-400 font-semibold pb-2 pr-4 whitespace-nowrap">
                &nbsp;
              </th>
              <th className="text-center text-gray-700 font-bold pb-2" colSpan={5}>
                Today Class Schedule
              </th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t, i) => (
              <tr key={i} className="border-t border-gray-50">
                <td className="py-2.5 pr-3 font-bold text-gray-700 whitespace-nowrap align-middle">
                  {t.name}
                </td>
                <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap align-middle">
                  {t.subject}
                </td>
                <td className="py-2.5 align-middle" colSpan={5}>
                  <div className="flex items-center flex-wrap gap-y-1">
                    {t.classes.map((cls, ci) => (
                      <React.Fragment key={ci}>
                        <ClassPill label={cls.label} time={cls.time} />
                        {ci < t.classes.length - 1 && <TimelineSep />}
                      </React.Fragment>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   RANK BOARD
───────────────────────────────────────── */
function RankBoard() {
  const avatarColors = [
    "from-sky-400 to-blue-500",
    "from-yellow-400 to-orange-500",
    "from-violet-400 to-purple-500",
  ];

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col h-full"
      style={{
        background: "linear-gradient(160deg,#4f7cf7 0%,#7c3aed 55%,#db2777 100%)",
      }}
    >
      <div className="p-5 flex flex-col h-full">
        {/* Title */}
        <div className="flex items-center gap-2 mb-5">
          <Trophy className="w-5 h-5 text-yellow-300" />
          <h3 className="text-white font-extrabold text-lg">Rank Board</h3>
        </div>

        <div className="flex items-end justify-center gap-3 mb-5">
          {top3.map((student, index) => (
            <div
              key={student.rank}
              className={`flex flex-col items-center ${student.rank === 1 ? "-mt-5" : ""}`}
            >
              <div
                className={`${student.rank === 1 ? "w-[72px] h-[72px]" : "w-14 h-14"
                  } rounded-full bg-gradient-to-br ${avatarColors[index]
                  } border-4 flex items-center justify-center text-white font-black ${student.rank === 1 ? "text-base" : "text-sm"
                  } mb-1 shadow-lg`}
              >
                {student.initials}
              </div>

              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-black mb-1">
                #{student.rank}
              </span>

              <p className="text-white text-xs font-semibold">
                {student.name}
              </p>
              <p className="text-blue-200 text-xs">
                Score {student.score}
              </p>
            </div>
          ))}
        </div>


        {/* Rank list */}
        <div className="flex flex-col gap-2 flex-1">
          {rankList.map((item) => (
            <div
              key={item.rank}
              className={`flex items-center justify-between px-4 py-2 rounded-xl text-xs font-semibold ${item.isYou
                ? "bg-white/25 border border-white/40"
                : "bg-white/10"
                }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-white font-black w-7">#{item.rank}</span>
                <span className={item.isYou ? "text-yellow-300 font-bold" : "text-white"}>
                  {item.name}
                </span>
              </div>
              <span className="text-white">{item.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   HELLO BUDDY BANNER
───────────────────────────────────────── */
function HelloBanner() {
  return (
    <div
      className="relative rounded-2xl overflow-hidden flex items-stretch"
      style={{
        background: "linear-gradient(135deg,#4f7cf7 0%,#7c3aed 100%)",
        minHeight: "150px",
      }}
    >
      {/* Decorative circles */}
      <div
        className="absolute rounded-full bg-white/20"
        style={{ width: 200, height: 200, top: -80, right: 130 }}
      />
      <div
        className="absolute rounded-full bg-white/10"
        style={{ width: 130, height: 130, bottom: -50, right: 230 }}
      />

      {/* Text content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-7 py-6">
        <h2 className="text-white font-extrabold text-xl mb-1.5">Hello Buddy!</h2>
        <p className="text-blue-100 text-xs leading-relaxed mb-3">
          You have 3 new tasks. It is a lot of work for today!<br />
          So let's start!
        </p>
        <button className="flex items-center gap-0.5 text-white text-xs font-bold underline underline-offset-2 hover:text-blue-200 transition w-fit">
          Review Tasks
          <ChevronRight className="w-3.5 h-3.5" />
          <ChevronRight className="w-3.5 h-3.5 -ml-2" />
        </button>
      </div>

      {/* Character – 3D illustration feel */}
      <div
        className="relative z-10 flex-shrink-0 flex items-end pr-4"
        style={{ minWidth: "110px" }}
      >
        {/* Stylised cartoon character placeholder */}
        <div className="flex flex-col items-center pb-2">
          {/* Head */}
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-b from-amber-300 to-amber-400 border-2 border-amber-200 shadow-lg flex items-center justify-center text-2xl">
              🙋
            </div>
          </div>
          {/* Body */}
          <div
            className="w-10 h-14 rounded-t-xl mt-0.5 shadow-md"
            style={{ background: "linear-gradient(180deg,#f97316 0%,#ea580c 100%)" }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   DASHBOARD PAGE
───────────────────────────────────────── */
const Dashboard = () => {
  return (
    <div className="p-4 h-full">
      <div className="flex gap-4 h-full">

        {/* Left column */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <HelloBanner />
          <PerformanceChart />
          <LinkedTeachers />
        </div>

        {/* Right column – Rank Board */}
        <div className="flex-shrink-0" style={{ width: "260px" }}>
          <RankBoard />
        </div>

      </div>
    </div>
  );
};

export default Dashboard;

