// server/src/parent/controllers/dashboardController.js
// ═══════════════════════════════════════════════════════════════
//  Parent — Dashboard Controller
//  Mirrors student dashboardController but:
//    • Auth via req.user.id (authMiddleware)
//    • Requires ?studentId=<uuid>
//    • Validates parent owns student via StudentParent
//  Returns identical shape to student dashboard so the UI
//  components work without any changes.
// ═══════════════════════════════════════════════════════════════

import { prisma } from "../../config/db.js";

async function verifyParentOwnsStudent(parentId, studentId) {
  const link = await prisma.studentParent.findFirst({
    where: { parentId, studentId },
  });
  
  return !!link;
}

export const getDashboard = async (req, res) => {
  try {
    const parentId  = req.user?.id;
    const studentId = req.query.studentId;

    if (!parentId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!studentId)
      return res.status(400).json({ success: false, message: "studentId is required" });

    const owns = await verifyParentOwnsStudent(parentId, studentId);
    if (!owns)
      return res.status(403).json({ success: false, message: "Access denied" });

    // ── Student basic info ────────────────────────────────────
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { personalInfo: true },
    });
    if (!student)
      return res.status(404).json({ success: false, message: "Student not found" });

    // ── Active enrollment ─────────────────────────────────────
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: {
        academicYear: true,
        classSection: true,
      },
    });

    if (!enrollment)
      return res.status(404).json({ success: false, message: "No active enrollment found" });

    const { academicYearId, classSectionId } = enrollment;
    const schoolId = enrollment.classSection.schoolId;

    const today = new Date();
    const todayDay = today.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();

    // ── Today's timetable ─────────────────────────────────────
    const timetableEntries = await prisma.timetableEntry.findMany({
      where: { classSectionId, academicYearId, day: todayDay },
      include: {
        subject:          { select: { name: true } },
        teacher:          { include: { user: { select: { name: true } } } },
        periodDefinition: true,
      },
      orderBy: { periodDefinition: { order: "asc" } },
    });

    const todaySchedule = timetableEntries
      .filter(e => e.periodDefinition.slotType === "PERIOD")
      .map(e => ({
        subject:   e.subject.name,
        teacher:   e.teacher?.user?.name ?? "",
        startTime: e.periodDefinition.startTime,
        endTime:   e.periodDefinition.endTime,
      }));

    // ── Recent marks (last 5 published) ──────────────────────
    const recentMarksRaw = await prisma.marks.findMany({
      where: {
        studentId,
        schedule: {
          assessmentGroup: { isPublished: true },
          classSectionId,
        },
      },
      include: {
        schedule: {
          include: {
            subject:         { select: { name: true } },
            assessmentGroup: { select: { name: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    const recentMarks = recentMarksRaw.map(m => {
      const pct = m.marksObtained != null && m.schedule.maxMarks > 0
        ? parseFloat(((m.marksObtained / m.schedule.maxMarks) * 100).toFixed(1))
        : null;
      return {
        id:             m.id,
        subject:        m.schedule.subject.name,
        assessmentName: m.schedule.assessmentGroup.name,
        marksObtained:  m.marksObtained,
        maxMarks:       m.schedule.maxMarks,
        percentage:     pct,
      };
    });

    // ── Latest overall result ─────────────────────────────────
    const latestResult = await prisma.resultSummary.findFirst({
      where: { studentId, academicYearId },
      orderBy: { assessmentGroup: { createdAt: "desc" } },
      include: { assessmentGroup: { select: { name: true } }, term: { select: { name: true } } },
    });

    // ── Upcoming exams (next 5) ───────────────────────────────
    const upcomingSchedules = await prisma.assessmentSchedule.findMany({
      where: {
        classSectionId,
        examDate: { gte: today },
        assessmentGroup: {
          academicYearId,
          schoolId,
          isPublished: false,
        },
      },
      include: {
        subject:         { select: { name: true } },
        assessmentGroup: { select: { name: true } },
      },
      orderBy: { examDate: "asc" },
      take: 5,
    });

    const upcomingExams = upcomingSchedules.map(s => ({
      id:             s.id,
      subject:        s.subject.name,
      assessmentName: s.assessmentGroup.name,
      examDate:       s.examDate,
      startTime:      s.startTime,
      maxMarks:       s.maxMarks,
    }));

    // ── Attendance ────────────────────────────────────────────
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: { studentId, academicYearId },
    });

    const presentDays = attendanceRecords.filter(r => r.status === "PRESENT").length;
    const absentDays  = attendanceRecords.filter(r => r.status === "ABSENT").length;
    const lateDays    = attendanceRecords.filter(r => r.status === "LATE").length;
    const totalDays   = attendanceRecords.length;
    const percentage  = totalDays > 0 ? parseFloat(((presentDays / totalDays) * 100).toFixed(1)) : 0;

    // ── Activities summary ────────────────────────────────────
    const [enrolledActivities, achievements] = await Promise.all([
      prisma.studentActivityEnrollment.count({ where: { studentId, academicYearId, status: "ACTIVE" } }),
      prisma.eventResult.count({ where: { studentId, resultType: { not: "PARTICIPATED" } } }),
    ]);

    // ── Recent awards ─────────────────────────────────────────
    const studentAwards = await prisma.studentAward.findMany({
      where: { studentId, academicYearId },
      include: { award: { select: { name: true, category: true } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    const awards = studentAwards.map(sa => ({
      id:       sa.id,
      name:     sa.award.name,
      category: sa.award.category,
      date:     sa.createdAt,
      remarks:  sa.remarks,
    }));

    // ── Upcoming meetings ─────────────────────────────────────
    const upcomingMeetingsRaw = await prisma.meeting.findMany({
      where: {
        schoolId,
        meetingDate: { gte: today },
        status: "SCHEDULED",
        OR: [
          { students: { some: { studentId } } },
          { classes: { some: { classSectionId } } },
          { type: { in: ["PARENT", "GENERAL"] } },
        ],
      },
      orderBy: { meetingDate: "asc" },
      take: 3,
    });

    const upcomingMeetings = upcomingMeetingsRaw.map(m => ({
      id:          m.id,
      title:       m.title,
      type:        m.type,
      meetingDate: m.meetingDate,
      startTime:   m.startTime,
      venue:       m.location ?? m.venueDetail ?? null,
    }));

    return res.json({
      success: true,
      data: {
        student: {
          id:           studentId,
          firstName:    student.personalInfo?.firstName ?? student.name.split(" ")[0],
          lastName:     student.personalInfo?.lastName  ?? "",
          profileImage: student.personalInfo?.profileImage ?? null,
        },
        enrollment: {
          classSection:    { name: enrollment.classSection.name },
          rollNumber:      enrollment.rollNumber,
          admissionNumber: enrollment.admissionNumber,
          academicYear:    enrollment.academicYear.name,
        },
        todaySchedule,
        recentMarks,
        latestResult: latestResult
          ? {
              percentage:      latestResult.percentage,
              grade:           latestResult.grade,
              assessmentGroup: latestResult.assessmentGroup?.name ?? null,
              termName:        latestResult.term?.name ?? null,
            }
          : null,
        upcomingExams,
        attendance: { presentDays, absentDays, lateDays, totalDays, percentage },
        activities: { enrolled: enrolledActivities, achievements },
        awards,
        upcomingMeetings,
      },
    });
  } catch (err) {
    console.error("[parent/getDashboard]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};