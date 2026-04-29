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
      isSeen: false,
    },
  });

  // find receiver
  const receiver = chat.participants.find(
    (p) => p.userId !== sender.id
  );

  let senderName = "User";

let userData = null;

if (sender.role === "SUPER_ADMIN") {
  userData = await prisma.superAdmin.findUnique({ where: { id: sender.id }, select: { name: true } });
} else if (sender.role === "PARENT") {
  userData = await prisma.parent.findUnique({ where: { id: sender.id }, select: { name: true } });
} else {
  userData = await prisma.user.findUnique({ where: { id: sender.id }, select: { name: true } });
}
 
 
  senderName = userData?.name || "User";

  // ✅ emit ONLY to receiver
  if (receiver) {
    global.io.to(String(receiver.userId)).emit("new_message", {
      ...message,
      senderName,
      receiverId: receiver.userId,
    });
  }

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
      _count: {
        select: {
          messages: {
            where: {
              senderId: { not: user.id },
              isSeen: false,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const result = [];

  for (const chat of chats) {
    const other = chat.participants.find(
      (p) => p.userId !== user.id
    );

    if (!other) continue;

    let userData = null;

    // 🔥 FETCH BASED ON ROLE
    if (other.role === "SUPER_ADMIN") {
      userData = await prisma.superAdmin.findUnique({
        where: { id: other.userId },
        select: { name: true, email: true },
      });
    } else if (["ADMIN", "TEACHER", "FINANCE"].includes(other.role)) {
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

    result.push({
      id: chat.id,
      unreadCount: chat._count.messages,
      messages: chat.messages,
      otherUser: {
        id: other.userId,
        name: userData?.name || "User",
        email: userData?.email || "",
        role: other.role,
      },
    });
  }

  return result;
};

export const getMessagesService = async (chatRoomId, userId) => {
  // mark as seen
  await prisma.message.updateMany({
    where: {
      chatRoomId,
      senderId: { not: userId },
      isSeen: false,
    },
    data: { isSeen: true },
  });

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