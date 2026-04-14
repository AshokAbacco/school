import { prisma } from "../config/db.js";
import {
  createChatService,
  sendMessageService,
  getChatsService,
  getMessagesService,
  deleteChatService,
} from "./chat.service.js";

// wrapper
const handle = (fn) => async (req, res) => {
  try {
    const result = await fn(req, res);
    res.json({ success: true, data: result });
  } catch (err) {
    console.log("ERROR:", err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

// ✅ Create Chat
export const createChat = handle(async (req) => {
  const { receiverId, receiverRole } = req.body;
  return await createChatService(req.user, receiverId, receiverRole);
});

// ✅ Send Message
export const sendMessage = handle(async (req) => {
  const { chatRoomId, content } = req.body;
  return await sendMessageService(req.user, chatRoomId, content);
});

// ✅ Get Chats
export const getChats = handle(async (req) => {
  return await getChatsService(req.user);
});

// ✅ Get Messages
export const getMessages = handle(async (req) => {
  const { chatRoomId } = req.params;
  return await getMessagesService(chatRoomId);
});
// ✅ Delete Chat
export const deleteChat = handle(async (req) => {
  const { chatRoomId } = req.params;
  return await deleteChatService(req.user, chatRoomId);
});

// ✅ GET USERS (IMPORTANT FOR ALL PAGES)
export const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.query;

    let users = [];

    // SUPER ADMIN
    if (role === "SUPER_ADMIN") {
      users = await prisma.superAdmin.findMany({
        where: {
          universityId: req.user.universityId, // ✅ FIXED
        },
        select: { id: true, name: true, email: true },
      });
    }

    // ADMIN + TEACHER
    if (role === "ADMIN" || role === "TEACHER") {
      users = await prisma.user.findMany({
        where: {
          role,
          schoolId: req.user.schoolId, // ✅ FIXED
        },
        select: { id: true, name: true, email: true, role: true },
      });
    }

    // FINANCE
    if (role === "FINANCE") {
      users = await prisma.user.findMany({
        where: {
          role: "FINANCE",
          schoolId: req.user.schoolId,
        },
        select: { id: true, name: true, email: true },
      });
    }

    // PARENT
      if (role === "PARENT" && req.user.role === "TEACHER") {

        // 1. Find teacher classes
        const entries = await prisma.timetableEntry.findMany({
          where: {
            teacher: {
              userId: req.user.id,
            },
          },
          select: {
            classSectionId: true,
            academicYearId: true,
          },
        });

        const classIds = entries.map(e => e.classSectionId);

        // 2. Find students in those classes
        const students = await prisma.studentEnrollment.findMany({
          where: {
            classSectionId: { in: classIds },
            status: "ACTIVE",
          },
          select: { studentId: true },
        });

        const studentIds = students.map(s => s.studentId);

        // 3. Get parents of those students
        const parents = await prisma.studentParent.findMany({
          where: {
            studentId: { in: studentIds },
          },
          include: {
            parent: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        // 4. Unique parents
        const map = new Map();
        parents.forEach(p => {
          if (p.parent) {
            map.set(p.parent.id, {
              ...p.parent,
              role: "PARENT",
            });
          }
        });

        users = Array.from(map.values());
      }

    // STUDENT
    if (role === "STUDENT") {
      users = await prisma.student.findMany({
        where: { schoolId: req.user.schoolId },
        select: { id: true, name: true, email: true },
      });
    }

    res.json({ success: true, data: users });

  } catch (err) {
    console.log("USER FETCH ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getParentTeachers = async (req, res) => {
  try {
    const parentId = req.user.id;
    const { studentId } = req.query;

    if (!studentId) {
      return res.status(400).json({ success: false, message: "studentId required" });
    }

    // ✅ verify parent owns student
    const link = await prisma.studentParent.findFirst({
      where: { parentId, studentId },
    });

    if (!link) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // ✅ get active enrollment
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });

    if (!enrollment) {
      return res.status(404).json({ success: false, message: "No enrollment" });
    }

    // ✅ get teachers from timetableEntry (CORRECT TABLE)
    const entries = await prisma.timetableEntry.findMany({
      where: {
        classSectionId: enrollment.classSectionId,
        academicYearId: enrollment.academicYearId,
      },
      include: {
        teacher: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
         subject: true,
      },
    });

    // ✅ unique teachers
    // ✅ unique teachers + subjects
    const map = new Map();

    entries.forEach((e) => {
      if (e.teacher?.user) {
        const teacherId = e.teacher.user.id;

        // create teacher if not exists
        if (!map.has(teacherId)) {
          map.set(teacherId, {
            id: teacherId,
            name: e.teacher.user.name,
            email: e.teacher.user.email,
            role: "TEACHER",
            subjects: new Set(), // ✅ store subjects
          });
        }

        // add subject
        if (e.subject?.name) {
          map.get(teacherId).subjects.add(e.subject.name);
        }
      }
    });

    // ✅ convert Set → Array
    const teachers = Array.from(map.values()).map((t) => ({
      ...t,
      subjects: Array.from(t.subjects),
    }));

    res.json({ success: true, data: teachers });
  } catch (err) {
    console.error("getParentTeachers error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};