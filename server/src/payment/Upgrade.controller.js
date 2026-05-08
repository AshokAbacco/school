import { prisma } from "../config/db.js";


export const getMySubscription = async (req, res) => {
  try {
    const universityId = req.user.universityId;

    const subscription = await prisma.subscription.findFirst({
      where: {
        schoolId: req.user.schoolId,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      return res.json({ subscription: null });
    }

    res.json({ subscription });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
};

export const createSubscription = async (req, res) => {
  try {
    const { universityId, planId, paymentId, userCount } = req.body;

    if (!universityId || !planId) {
      return res.status(400).json({ error: "Missing data" });
    }

    // 🧠 Plan duration (1 year)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    // ❗ deactivate old subscription
    await prisma.subscription.updateMany({
      where: {
        universityId,
        status: "ACTIVE",
      },
      data: {
        status: "EXPIRED",
      },
    });

    // ✅ Create new subscription
    const subscription = await prisma.subscription.create({
      data: {
        universityId,
        planId,
        userCount,
        startDate,
        endDate,
        paymentId,
      },
    });

    

    return res.json({
      message: "Subscription activated",
      subscription,
    });
  } catch (err) {
    console.error("❌ subscription error:", err);
    res.status(500).json({ error: "Failed to create subscription" });
  }
};