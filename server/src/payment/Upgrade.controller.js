import { prisma } from "../config/db.js";

// ✅ Create Plan (Super Admin)
export const createPlan = async (req, res) => {
  try {
    const { name, price, maxUsers, maxSchools, features } = req.body;

    const plan = await prisma.plan.create({
      data: {
        name,
        price,
        maxUsers,
        maxSchools,
        features,
      },
    });

    res.json(plan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create plan" });
  }
};

// ✅ Get All Plans
export const getPlans = async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
    });

    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch plans" });
  }
};

// ✅ Subscribe after payment success
export const createSubscription = async (req, res) => {
  try {
    const { schoolId, planId, paymentId, userCount } = req.body;

    // 1 year subscription
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    const subscription = await prisma.subscription.create({
      data: {
        schoolId,
        planId,
        paymentId,
        userCount,
        endDate,
      },
    });

    res.json(subscription);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Subscription failed" });
  }
};

// ✅ Get School Subscription
export const getSubscription = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const sub = await prisma.subscription.findFirst({
      where: { schoolId },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });

    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
};