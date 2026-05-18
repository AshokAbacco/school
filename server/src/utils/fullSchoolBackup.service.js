import { prisma } from "../config/db.js";
import { uploadToCloud } from "./cloud.service.js";

export const createFullSchoolBackup =
  async (schoolId) => {

    try {

      const school =
        await prisma.school.findUnique({

          where: { id: schoolId },

          include: {

            students: {
              include: {
                personalInfo: true,
                documents: true,
                enrollments: true,
                parentLinks: {
                  include: {
                    parent: true,
                  },
                },
              },
            },

            parents: true,

            teacherProfiles: true,

            classSections: true,

            subjects: true,

            academicYears: true,

          },
        });

      if (!school) {
        throw new Error("School not found");
      }

      const backupData = {
        school,
        createdAt: new Date(),
      };

      const timestamp = Date.now();

      const key =
        `full-school-backups/${schoolId}/` +
        `backup-${timestamp}.json`;

      await uploadToCloud(
        {
          buffer: Buffer.from(
            JSON.stringify(
              backupData,
              null,
              2
            )
          ),

          mimetype:
            "application/json",
        },

        key
      );

      console.log(
        "✅ Full school backup saved"
      );

      return true;

    } catch (err) {

      console.log(
        "❌ Full backup failed:",
        err.message
      );

      return false;

    }

};