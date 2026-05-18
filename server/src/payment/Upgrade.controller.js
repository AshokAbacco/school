import { prisma } from "../config/db.js";

//
// ✅ GET MY SUBSCRIPTION (current active)
//
export const getMySubscription = async (req, res) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { schoolId: req.user.schoolId },
      orderBy: { createdAt: "desc" },
    });
    if (!subscription) return res.json({ subscription: null });
    res.json({ subscription });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
};

//
// ✅ GET SUBSCRIPTION TIMELINE
//    Matches by superAdminId OR email — and auto-links orphaned payments
//
export const getSubscriptionTimeline = async (req, res) => {
  try {
    const userId = req.user.id;
    const email  = req.user.email;

    // Step 1: auto-link any unlinked SUCCESS payments that share this email
    await prisma.payment.updateMany({
      where: {
        email,
        superAdminId: null,
        status: "SUCCESS",
      },
      data: { superAdminId: userId },
    });

    // Step 2: fetch all payments for this user
    const payments = await prisma.payment.findMany({
      where: {
        OR: [
          { superAdminId: userId },
          { email },
        ],
        status: "SUCCESS",
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ subscriptions: formatPayments(payments) });

  } catch (err) {
    console.error("Timeline fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch timeline" });
  }
};

function formatPayments(payments) {
  return payments.map((p, index) => {
    const startDate = p.planStartDate || p.createdAt;
    const endDate   = p.planEndDate   || (() => {
      const d = new Date(p.createdAt);
      d.setFullYear(d.getFullYear() + 1);
      return d;
    })();

    return {
      id:        p.id,
      planId:    p.planId,
      planName:  p.planName,   // "Silver" / "Gold" / "Premium"
      userCount: p.userCount,
      paymentId: p.razorpayPaymentId,
      amount:    p.amount,
      startDate,
      endDate,
      status: index === 0 && new Date(endDate) > new Date() ? "ACTIVE" : "EXPIRED",
    };
  });
}

//
// ✅ CREATE / UPGRADE SUBSCRIPTION
//
export const createSubscription = async (req, res) => {
  try {
    const { universityId, planId, paymentId, userCount } = req.body;

    if (!universityId || !planId) {
      return res.status(400).json({ error: "Missing universityId or planId" });
    }

    const startDate = new Date();
    const endDate   = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    // Expire old subscriptions
    await prisma.subscription.updateMany({
      where: { universityId, status: "ACTIVE" },
      data:  { status: "EXPIRED" },
    });

    const subscription = await prisma.subscription.create({
      data: { universityId, planId, userCount, startDate, endDate, paymentId },
    });

    // Link payment to this superAdmin
    if (req.user?.id && paymentId) {
      await prisma.payment.update({
        where: { id: paymentId },
        data:  { superAdminId: req.user.id },
      }).catch(() => {});
    }

    return res.json({ message: "Subscription activated", subscription });

  } catch (err) {
    console.error("❌ subscription error:", err);
    res.status(500).json({ error: "Failed to create subscription" });
  }
};