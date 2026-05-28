import { prisma } from "../../config/db.js";
import cache from "../../utils/cacheService.js";

export const getParentStudents = async (req, res) => {
  try {
    const parentId = req.user?.id;

    if (!parentId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // ── Cache check ──────────────────────────────────────────
// TEMP: cache disabled
const cacheKey = `parent:students:${parentId}`;

    // ── Fetch parent students ───────────────────────────────
    const studentLinks =
      await prisma.studentParent.findMany({
        where: {
          parentId,
        },

        include: {
          student: {
            include: {
              personalInfo: true,

              enrollments: {
                orderBy: {
                  createdAt: "desc",
                },

                take: 1,

                include: {
                  classSection: true,
                },
              },

              attendanceRecords: true,
              resultSummaries: true,
              activityEnrollments: true,
            },
          },
        },
      });

    // ── Transform response ──────────────────────────────────
    const result =
      studentLinks.map((link) => {

        const s = link.student;

        const enrollment =
          s.enrollments?.[0];

        const info =
          s.personalInfo;

        // ── Safe name fallbacks ─────────────────────────────
        const firstName =
          info?.firstName ||
          s.name?.split(" ")[0] ||
          "";

        const lastName =
          info?.lastName ||
          s.name?.split(" ").slice(1).join(" ") ||
          "";

        return {
          // ── Keep original structure (Dashboard needs this)
          ...s,

          personalInfo: info,

          enrollments:
            s.enrollments || [],

          // ── Additional flattened fields
          firstName,
          lastName,

          profileImage:
            info?.profileImage || null,

          admissionNumber:
            enrollment?.admissionNumber || null,

          rollNumber:
            enrollment?.rollNumber || null,

          // ── Extra dashboard stats
          attendance:
            s.attendanceRecords?.length || 0,

          gpa:
            s.resultSummaries?.[0]?.gpa || 0,

          subjects:
            s.enrollments?.length || 0,

          activities:
            s.activityEnrollments?.length || 0,
        };
      });

    const response = {
      success: true,
      data: result,
    };

    // // ── Cache response ──────────────────────────────────────
    // await cache.set(
    //   cacheKey,
    //   JSON.stringify(response)
    // );

    return res.json(response);

  } catch (err) {

    console.error(
      "GET PARENT STUDENTS ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch students",
    });
  }
};

// import { prisma } from "../../config/db.js";
// import cache from "../../utils/cacheService.js";

// export const getParentStudents = async (req, res) => {
//   try {
//     const parentId = req.user?.id;

//     if (!parentId) {
//       return res.status(401).json({ success: false, message: "Unauthorized" });
//     }

//     // ── Cache check ──────────────────────────────────────────
//     const cacheKey = parent:students:${parentId};
//     const cached = await cache.get(cacheKey);
//     if (cached) return res.json(JSON.parse(cached));

//     const students = await prisma.studentParent.findMany({
//       where: { parentId },
//       include: {
//         student: {
//           include: {
//             personalInfo: true,
//             enrollments: {
//               orderBy: { createdAt: "desc" },
//               take: 1,
//             },
//             attendanceRecords:   true,
//             resultSummaries:     true,
//             activityEnrollments: true,
//           },
//         },
//       },
//     });

//     const result = students.map((link) => {
//       const s          = link.student;
//       const enrollment = s.enrollments?.[0];

//       return {
//         ...s,
//         personalInfo:    s.personalInfo,
//         admissionNumber: enrollment?.admissionNumber || null,
//         rollNumber:      enrollment?.rollNumber      || null,
//         attendance:      s.attendanceRecords?.length  || 0,
//         gpa:             s.resultSummaries?.[0]?.gpa  || 0,
//         subjects:        s.enrollments?.length         || 0,
//         activities:      s.activityEnrollments?.length || 0,
//       };
//     });

//     const response = { success: true, data: result };
//     await cache.set(cacheKey, response);

//     return res.json(response);
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ success: false, message: "Failed to fetch students" });
//   }
// };