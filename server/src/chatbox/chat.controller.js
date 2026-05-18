// server/src/chatbox/chat.controller.js
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
  return await getMessagesService(chatRoomId, req.user.id); 
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

  let where = {
    role,
  };

  // ✅ SUPER ADMIN -> same university schools only
  if (req.user.role === "SUPER_ADMIN") {

    where.school = {
      universityId: req.user.universityId,
    };

  }

  // ✅ NORMAL SCHOOL USERS
  else {

    where.schoolId = req.user.schoolId;

  }

  users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
}

// FINANCE
if (role === "FINANCE") {

  let where = {
    role: "FINANCE",
  };

  // ✅ SUPER ADMIN -> same university schools only
  if (req.user.role === "SUPER_ADMIN") {

    where.school = {
      universityId: req.user.universityId,
    };

  }

  // ✅ NORMAL USERS
  else {

    where.schoolId = req.user.schoolId;

  }

  users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
}

     
      // PARENT
      if (role === "PARENT") {

        // TEACHER sees only own class parents
        if (req.user.role === "TEACHER") {
          const entries = await prisma.timetableEntry.findMany({
            where: {
              teacher: {
                userId: req.user.id,
              },
            },
            select: {
              classSectionId: true,
            },
          });

          const classIds = entries.map(e => e.classSectionId);

          const students = await prisma.studentEnrollment.findMany({
            where: {
              classSectionId: { in: classIds },
              status: "ACTIVE",
            },
            select: { studentId: true },
          });

          const studentIds = students.map(s => s.studentId);

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

          const map = new Map();

          parents.forEach((p) => {
            if (p.parent) {
              map.set(p.parent.id, {
                ...p.parent,
                role: "PARENT",
              });
            }
          });

          users = Array.from(map.values());
        }

        // ADMIN / SUPER_ADMIN / FINANCE sees only same school parents
        else {

          // 🔥 get students of this school
          const students = await prisma.student.findMany({
            where: {
              schoolId: req.user.schoolId,
            },
            select: {
              id: true,
            },
          });

          const studentIds = students.map((s) => s.id);

          // 🔥 get parent links
          const parentLinks = await prisma.studentParent.findMany({
            where: {
              studentId: {
                in: studentIds,
              },
            },
            include: {
              parent: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          });

          // 🔥 remove duplicates
          const map = new Map();

          parentLinks.forEach((p) => {
            if (p.parent) {
              map.set(p.parent.id, {
                ...p.parent,
                role: "PARENT",
              });
            }
          });

          users = Array.from(map.values());
        }
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

export const markMessagesSeen = async (req, res) => {
  const userId = req.user.id;
  const { chatRoomId } = req.body;

  await prisma.message.updateMany({
    where: {
      chatRoomId,
      senderId: { not: userId }, // only messages from others
      isSeen: false,
    },
    data: {
      isSeen: true,
    },
  });

  res.json({ success: true });
};

export const getTeachersBySubject = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    const entries = await prisma.timetableEntry.findMany({
      where: {
        teacher: {
          schoolId: schoolId, // ✅ FIXED
        },
      },
      include: {
        subject: true,
        teacher: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    console.log("ENTRIES:", entries.length); // 👈 DEBUG

    const map = new Map();

    entries.forEach((e) => {
      if (!e.subject || !e.teacher?.user) return;

      const subjectId = e.subject.id;

      if (!map.has(subjectId)) {
        map.set(subjectId, {
          subjectId,
          subjectName: e.subject.name,
          teachers: [],
        });
      }

      const group = map.get(subjectId);

      if (!group.teachers.find(t => t.id === e.teacher.user.id)) {
        group.teachers.push({
          id: e.teacher.user.id,
          name: e.teacher.user.name,
          email: e.teacher.user.email,
        });
      }
    });

    const result = Array.from(map.values()).map((s) => ({
      ...s,
      count: s.teachers.length,
    }));

    console.log("RESULT:", result); // 👈 DEBUG

    res.json({ success: true, data: result });

  } catch (err) {
    console.log("ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const groupSendMessage = async (req, res) => {
  try {
    const { classSectionIds, message, type } = req.body;

    if (!classSectionIds?.length || !message) {
      return res.status(400).json({
        success: false,
        message: "classSectionIds and message required",
      });
    }

    // 🔥 get students
    const students = await prisma.studentEnrollment.findMany({
      where: {
        classSectionId: { in: classSectionIds },
        status: "ACTIVE",
      },
      select: {
        studentId: true,
      },
    });

    const studentIds = [...new Set(students.map(s => s.studentId))];

    // 🔥 create chat + message for each student
    for (const studentId of studentIds) {
      let chat = await prisma.chatRoom.findFirst({
        where: {
          type: "NOTIFICATION",
          participants: {
            some: { userId: req.user.id },
          },
          AND: {
            participants: {
              some: { userId: studentId },
            },
          },
        },
      });

      if (!chat) {
        chat = await prisma.chatRoom.create({
          data: {
            type: "NOTIFICATION",
            participants: {
              create: [
                { userId: req.user.id, role: req.user.role },
                { userId: studentId, role: "STUDENT" },
              ],
            },
          },
        });
      }

      await prisma.message.create({
        data: {
          chatRoomId: chat.id,
          senderId: req.user.id,
          senderRole: req.user.role,
          content: message,
          type: "NOTIFICATION",
        },
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("GROUP SEND ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};