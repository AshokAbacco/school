import { prisma } from "../config/db.js";
import { canChat, isNotificationOnly } from "./chat.permissions.js";

export const createChatService = async (sender, receiverId, receiverRole) => {
  if (!canChat(sender.role, receiverRole) &&
      !isNotificationOnly(sender.role, receiverRole)) {
    throw { status: 403, message: "Chat not allowed" };
  }

  const type = isNotificationOnly(sender.role, receiverRole)
    ? "NOTIFICATION"
    : "PRIVATE";

  // Check existing chat
const existing = await prisma.chatRoom.findFirst({
  where: {
    AND: [
      {
        participants: {
          some: { userId: sender.id },
        },
      },
      {
        participants: {
          some: { userId: receiverId },
        },
      },
    ],
  },
  include: { participants: true },
});

  if (existing) return existing;

  const chat = await prisma.chatRoom.create({
    data: {
      type,
      participants: {
        create: [
          { userId: sender.id, role: sender.role },
          { userId: receiverId, role: receiverRole },
        ],
      },
    },
  });

  return chat;
};

export const sendMessageService = async (sender, chatRoomId, content) => {
  const chat = await prisma.chatRoom.findUnique({
    where: { id: chatRoomId },
    include: { participants: true },
  });

  if (!chat) throw { status: 404, message: "Chat not found" };

  // ❌ Student cannot reply in notification
  if (chat.type === "NOTIFICATION" && sender.role === "STUDENT") {
    throw { status: 403, message: "طلاب cannot reply" };
  }

  const message = await prisma.message.create({
    data: {
      chatRoomId,
      senderId: sender.id,
      senderRole: sender.role,
      content,
      type: chat.type === "NOTIFICATION" ? "NOTIFICATION" : "TEXT",
    },
  });

  return message;
};

export const getChatsService = async (user) => {
  const chats = await prisma.chatRoom.findMany({
    where: {
      participants: {
        some: { userId: user.id },
      },
    },
    include: {
      participants: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const result = [];

  for (const chat of chats) {
    const other = chat.participants.find(
      (p) => p.userId !== user.id
    );

    // ❗ FIX: prevent crash
    if (!other) {
      console.log("Invalid chat (no other user):", chat.id);
      continue;
    }

    let userData = null;

    try {
      if (other.role === "SUPER_ADMIN") {
        userData = await prisma.superAdmin.findUnique({
          where: { id: other.userId },
          select: { name: true, email: true },
        });
      } else if (other.role === "ADMIN" || other.role === "TEACHER") {
        userData = await prisma.user.findUnique({
          where: { id: other.userId },
          select: { name: true, email: true },
        });
      } else if (other.role === "FINANCE") {
        userData = await prisma.user.findUnique({
          where: { id: other.userId },
          select: { name: true, email: true },
        });
      } else if (other.role === "PARENT") {
        userData = await prisma.parent.findUnique({
          where: { id: other.userId },
          select: { name: true, email: true },
        });
      } else if (other.role === "STUDENT") {
        userData = await prisma.student.findUnique({
          where: { id: other.userId },
          select: { name: true, email: true },
        });
      }
    } catch (err) {
      console.log("User fetch error:", err.message);
    }

    result.push({
      ...chat,
      otherUser: {
        name: userData?.name || "User",
        email: userData?.email || "",
        role: other.role,
      },
    });
  }

  return result;
};

export const getMessagesService = async (chatRoomId) => {
  return await prisma.message.findMany({
    where: { chatRoomId },
    orderBy: { createdAt: "asc" },
  });
};

export const deleteChatService = async (user, chatRoomId) => {
  const chat = await prisma.chatRoom.findUnique({
    where: { id: chatRoomId },
    include: { participants: true },
  });

  if (!chat) throw { status: 404, message: "Chat not found" };

  const isMember = chat.participants.some(p => p.userId === user.id);
  if (!isMember) {
    throw { status: 403, message: "Not allowed" };
  }

  // ✅ delete messages
  await prisma.message.deleteMany({
    where: { chatRoomId },
  });

  // ✅ delete participants (🔥 THIS WAS MISSING)
  await prisma.chatParticipant.deleteMany({
    where: { chatRoomId },
  });

  // ✅ now delete chat
  await prisma.chatRoom.delete({
    where: { id: chatRoomId },
  });

  return { success: true };
};