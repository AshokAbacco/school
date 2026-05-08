import prisma from "../config/db.js";

export const checkSubscription = async (req, res, next) => {
  try {
    const universityId = req.user.universityId;

    const subscription = await prisma.subscription.findFirst({
      where: {
        universityId,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      return res.status(403).json({
        message: "No active subscription. Please upgrade.",
      });
    }

    // 🔥 check expiry
    if (new Date() > subscription.endDate) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "EXPIRED" },
      });

      return res.status(403).json({
        message: "Subscription expired. Please renew.",
      });
    }

    req.subscription = subscription;

    next();
  } catch (err) {
    res.status(500).json({ error: "Subscription check failed" });
  }
};