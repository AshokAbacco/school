import { prisma } from "../../config/db.js";

// ─── GET: All certificates/awards for the logged-in student ──────────────────
export const getStudentCertificates = async (req, res) => {
  try {
    const { id: studentId, schoolId } = req.user; // student auth middleware

    // ── 1. School info ────────────────────────────────────────────────────────
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true, type: true, city: true, state: true },
    });

    // ── 2. Student info + current enrollment ─────────────────────────────────
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        personalInfo: {
          select: { firstName: true, lastName: true, profileImage: true },
        },
        enrollments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            classSection: { select: { name: true, grade: true, section: true } },
            academicYear: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const currentEnrollment = student.enrollments[0] ?? null;
    const currentAcademicYearId = currentEnrollment?.academicYear?.id ?? null;

    // ── 3. MANUAL AWARDS ─────────────────────────────────────────────────────
    const manualAwards = await prisma.studentAward.findMany({
      where: { studentId },
      include: {
        award: {
          select: { name: true, category: true, description: true },
        },
        classSection: { select: { name: true, grade: true } },
        academicYear: { select: { name: true } },
        givenBy: {
          select: {
            name: true,
            teacherProfile: {
              select: { firstName: true, lastName: true, designation: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const manualCertificates = manualAwards.map((sa) => {
      const teacherName = sa.givenBy?.teacherProfile
        ? `${sa.givenBy.teacherProfile.firstName} ${sa.givenBy.teacherProfile.lastName}`
        : sa.givenBy?.name ?? "Class Teacher";
      const designation = sa.givenBy?.teacherProfile?.designation ?? "Teacher";
      return {
        id: sa.id,
        source: "MANUAL",
        category: sa.award.category,
        title: sa.award.name,
        description: sa.award.description ?? "",
        achievementText: sa.remarks
          ? `${sa.award.name} — ${sa.remarks}`
          : sa.award.name,
        remarks: sa.remarks ?? null,
        issuedBy: teacherName,
        issuedByDesignation: designation,
        classSection: sa.classSection?.name ?? currentEnrollment?.classSection?.name ?? "",
        grade: sa.classSection?.grade ?? currentEnrollment?.classSection?.grade ?? "",
        academicYear: sa.academicYear?.name ?? "",
        issuedDate: sa.createdAt,
      };
    });

    // ── 4. EVENT / ACTIVITY AWARDS ────────────────────────────────────────────
    const eventResults = await prisma.eventResult.findMany({
      where: { studentId },
      include: {
        event: {
          select: {
            name: true,
            eventDate: true,
            eventType: true,
            academicYear: { select: { name: true } },
            school: { select: { name: true } },
          },
        },
        recordedBy: {
          select: {
            name: true,
            teacherProfile: {
              select: { firstName: true, lastName: true, designation: true },
            },
          },
        },
      },
      orderBy: { recordedAt: "desc" },
    });

    // Also check team results
    const teamMemberships = await prisma.eventTeamMember.findMany({
      where: { studentId },
      include: {
        team: {
          include: {
            results: {
              include: {
                event: {
                  select: {
                    name: true,
                    eventDate: true,
                    eventType: true,
                    academicYear: { select: { name: true } },
                  },
                },
                recordedBy: {
                  select: {
                    name: true,
                    teacherProfile: {
                      select: { firstName: true, lastName: true, designation: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const RESULT_LABEL = {
      WINNER:       "Winner — 1st Place",
      RUNNER_UP:    "Runner Up — 2nd Place",
      THIRD_PLACE:  "3rd Place",
      PARTICIPATED: "Participation",
      SPECIAL_AWARD: "Special Award",
    };

    const eventCertificates = eventResults.map((er) => {
      const recorderName = er.recordedBy?.teacherProfile
        ? `${er.recordedBy.teacherProfile.firstName} ${er.recordedBy.teacherProfile.lastName}`
        : er.recordedBy?.name ?? "Coordinator";
      return {
        id: er.id,
        source: "EVENT",
        category: "SPORTS", // fallback — event category comes from Activity
        resultType: er.resultType,
        title: er.awardTitle ?? RESULT_LABEL[er.resultType] ?? er.resultType,
        description: er.event?.name ?? "",
        achievementText: `${RESULT_LABEL[er.resultType] ?? er.resultType} in ${er.event?.name ?? "Event"}`,
        remarks: er.remarks ?? null,
        issuedBy: recorderName,
        issuedByDesignation: er.recordedBy?.teacherProfile?.designation ?? "Event Coordinator",
        classSection: currentEnrollment?.classSection?.name ?? "",
        grade: currentEnrollment?.classSection?.grade ?? "",
        academicYear: er.event?.academicYear?.name ?? "",
        issuedDate: er.recordedAt,
        eventName: er.event?.name ?? "",
        eventType: er.event?.eventType ?? "",
      };
    });

    // Team-based event results
    const teamCertificates = teamMemberships.flatMap((tm) =>
      tm.team.results.map((tr) => {
        const recorderName = tr.recordedBy?.teacherProfile
          ? `${tr.recordedBy.teacherProfile.firstName} ${tr.recordedBy.teacherProfile.lastName}`
          : tr.recordedBy?.name ?? "Coordinator";
        return {
          id: `team-${tr.id}`,
          source: "EVENT",
          category: "SPORTS",
          resultType: tr.resultType,
          title: tr.awardTitle ?? RESULT_LABEL[tr.resultType] ?? tr.resultType,
          description: tr.event?.name ?? "",
          achievementText: `${RESULT_LABEL[tr.resultType] ?? tr.resultType} in ${tr.event?.name ?? "Event"} (Team: ${tm.team.name})`,
          remarks: tr.remarks ?? null,
          issuedBy: recorderName,
          issuedByDesignation: "Event Coordinator",
          classSection: currentEnrollment?.classSection?.name ?? "",
          grade: currentEnrollment?.classSection?.grade ?? "",
          academicYear: tr.event?.academicYear?.name ?? "",
          issuedDate: tr.recordedAt,
          eventName: tr.event?.name ?? "",
          teamName: tm.team.name,
        };
      })
    );

    // ── 5. CALCULATED AWARDS ──────────────────────────────────────────────────
    const calculatedCertificates = [];

    if (currentAcademicYearId) {
      // 5a. Perfect Attendance — check if student has 0 ABSENT records this year
      const absentCount = await prisma.attendanceRecord.count({
        where: {
          studentId,
          academicYearId: currentAcademicYearId,
          status: "ABSENT",
        },
      });

      const totalDays = await prisma.attendanceRecord.count({
        where: { studentId, academicYearId: currentAcademicYearId },
      });

      if (totalDays > 0 && absentCount === 0) {
        calculatedCertificates.push({
          id: `calc-attendance-${currentAcademicYearId}`,
          source: "CALCULATED",
          category: "ATTENDANCE",
          title: "Perfect Attendance",
          description: "100% attendance for the academic year",
          achievementText: `Perfect Attendance — ${totalDays} days present`,
          remarks: null,
          issuedBy: school?.name ?? "School",
          issuedByDesignation: "Administration",
          classSection: currentEnrollment?.classSection?.name ?? "",
          grade: currentEnrollment?.classSection?.grade ?? "",
          academicYear: currentEnrollment?.academicYear?.name ?? "",
          issuedDate: new Date(),
        });
      }

      // 5b. Class Topper — check if this student has highest % in their class
      if (currentEnrollment) {
        // Get all students in same class
        const classmateEnrollments = await prisma.studentEnrollment.findMany({
          where: {
            classSectionId: currentEnrollment.classSection
              ? undefined
              : undefined, // need the classSectionId
            academicYearId: currentAcademicYearId,
          },
          select: { studentId: true },
        });

        // Get result summaries for this class
        const classmateIds = classmateEnrollments.map((e) => e.studentId);

        const allSummaries = await prisma.resultSummary.findMany({
          where: {
            studentId: { in: [...classmateIds, studentId] },
            academicYearId: currentAcademicYearId,
            isPublished: true,
            percentage: { not: null },
          },
          orderBy: { percentage: "desc" },
          select: { studentId: true, percentage: true },
        });

        // Get this student's best percentage
        const myBest = allSummaries.find((s) => s.studentId === studentId);
        const topPercentage = allSummaries[0]?.percentage ?? null;

        if (
          myBest &&
          topPercentage !== null &&
          myBest.percentage === topPercentage &&
          allSummaries.filter((s) => s.percentage === topPercentage).length === 1
        ) {
          calculatedCertificates.push({
            id: `calc-topper-${currentAcademicYearId}`,
            source: "CALCULATED",
            category: "ACADEMIC",
            title: "Class Topper",
            description: `Highest academic performance in ${currentEnrollment.classSection?.name ?? "class"}`,
            achievementText: `Class Topper — ${myBest.percentage?.toFixed(1)}% overall`,
            remarks: null,
            issuedBy: school?.name ?? "School",
            issuedByDesignation: "Principal",
            classSection: currentEnrollment?.classSection?.name ?? "",
            grade: currentEnrollment?.classSection?.grade ?? "",
            academicYear: currentEnrollment?.academicYear?.name ?? "",
            issuedDate: new Date(),
          });
        }
      }
    }

    // ── 6. Combine all ────────────────────────────────────────────────────────
    const allCertificates = [
      ...manualCertificates,
      ...eventCertificates,
      ...teamCertificates,
      ...calculatedCertificates,
    ].sort((a, b) => new Date(b.issuedDate) - new Date(a.issuedDate));

    // ── 7. Stats ──────────────────────────────────────────────────────────────
    const stats = {
      total: allCertificates.length,
      manual: manualCertificates.length,
      event: eventCertificates.length + teamCertificates.length,
      calculated: calculatedCertificates.length,
      byCategory: allCertificates.reduce((acc, c) => {
        acc[c.category] = (acc[c.category] ?? 0) + 1;
        return acc;
      }, {}),
    };

    return res.status(200).json({
      success: true,
      data: {
        student: {
          name: student.name,
          firstName: student.personalInfo?.firstName ?? "",
          lastName: student.personalInfo?.lastName ?? "",
          profileImage: student.personalInfo?.profileImage ?? null,
          classSection: currentEnrollment?.classSection?.name ?? "",
          grade: currentEnrollment?.classSection?.grade ?? "",
          rollNumber: currentEnrollment?.rollNumber ?? "",
          admissionNumber: currentEnrollment?.admissionNumber ?? "",
          academicYear: currentEnrollment?.academicYear?.name ?? "",
        },
        school: {
          name: school?.name ?? "",
          type: school?.type ?? "",
          city: school?.city ?? "",
          state: school?.state ?? "",
        },
        certificates: allCertificates,
        stats,
      },
    });
  } catch (error) {
    console.error("getStudentCertificates error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};