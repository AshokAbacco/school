// main_backend/idCardControlls.js
// ─────────────────────────────────────────────────────────────────────────────
// SUPERADMIN AUTH REQUIRED
//
// 2. GET  /api/id-cards/templates          → All templates for SuperAdmin UI
//    DELETE /api/id-cards/templates/:id    → Delete a template
//    POST /api/id-cards/orders             → Place an order for a school
//    PATCH /api/id-cards/orders/:id/status → Update order status
//    GET  /api/id-cards/orders/stats       → Summary stats
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient }     from "@prisma/client";
import { S3Client, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl }     from "@aws-sdk/s3-request-presigner";

const prisma = new PrismaClient();

const r2 = new S3Client({
  region:   "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET;

const getSignedImageUrl = async (key) => {
  try {
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    return await getSignedUrl(r2, cmd, { expiresIn: 3600 });
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET ALL TEMPLATES — GET /api/id-cards/templates
//    SuperAdmin auth required
//    Returns all active templates with signed image URLs
// ─────────────────────────────────────────────────────────────────────────────
export const getTemplates = async (req, res) => {
  try {
    const schoolId = req.query.schoolId || null;

    const templates = await prisma.idCardTemplate.findMany({
      where: {
        isActive: true,
        OR: [
          { isDefault: true, schoolId: null },
          ...(schoolId ? [{ schoolId }] : []),
        ],
      },
      orderBy: [{ isDefault: "desc" }, { uploadedAt: "desc" }],
    });

    const withUrls = await Promise.all(
      templates.map(async (t) => ({
        id:           t.id,
        title:        t.title,
        description:  t.description,
        imageKey:     t.imageKey,
        imageUrl:     t.imageKey ? await getSignedImageUrl(t.imageKey) : null,
        isDefault:    t.isDefault,
        schoolId:     t.schoolId,
        isOwn:        t.schoolId === schoolId,
        uploadedAt:   t.uploadedAt,
        templateType: t.templateType,
        templateKey:  t.templateKey,
        primaryColor: t.primaryColor,
        accentColor:  t.accentColor,
      }))
    );

    return res.json({ templates: withUrls });
  } catch (err) {
    console.error("getTemplates error:", err);
    return res.status(500).json({ error: "Failed to fetch templates." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE TEMPLATE — DELETE /api/id-cards/templates/:id
//    SuperAdmin auth required
// ─────────────────────────────────────────────────────────────────────────────
export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await prisma.idCardTemplate.findUnique({ where: { id } });
    if (!template) return res.status(404).json({ error: "Template not found." });

   if (template.imageKey) {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: template.imageKey }));
}
    await prisma.idCardTemplate.delete({ where: { id } });

    return res.json({ message: "Template deleted successfully." });
  } catch (err) {
    console.error("deleteTemplate error:", err);
    return res.status(500).json({ error: "Failed to delete template." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PLACE ORDER — POST /api/id-cards/orders/place
//    SuperAdmin auth required
//    Body: {
//      schoolId, templateId?,
//      classDetails: [{ classId?, className, studentCount }],
//      contactName?, contactPhone?, contactEmail?, notes?
//    }
// ─────────────────────────────────────────────────────────────────────────────
export const placeOrder = async (req, res) => {
  try {
    const {
      schoolId, templateId,
      classDetails = [],
      contactName, contactPhone, contactEmail, notes,
    } = req.body;

    if (!schoolId)
      return res.status(400).json({ error: "schoolId is required." });
    if (!Array.isArray(classDetails) || classDetails.length === 0)
      return res.status(400).json({ error: "classDetails must be a non-empty array." });

    for (const cd of classDetails) {
      if (!cd.className)
        return res.status(400).json({ error: `className is required for each class.` });
      if (!cd.studentCount || Number(cd.studentCount) < 1)
        return res.status(400).json({ error: `Invalid studentCount for "${cd.className}".` });
    }

    const school = await prisma.school.findUnique({
      where:  { id: schoolId },
      select: { name: true },
    });
    if (!school) return res.status(404).json({ error: "School not found." });

    const totalCards = classDetails.reduce((sum, cd) => sum + Number(cd.studentCount), 0);

    const order = await prisma.idCardOrder.create({
      data: {
        schoolId,
        schoolName:   school.name,
        templateId:   templateId || null,
        classDetails,
        totalCards,
        contactName:  contactName  || null,
        contactPhone: contactPhone || null,
        contactEmail: contactEmail || null,
        notes:        notes        || null,
        status:       "PENDING",
      },
    });

    return res.status(201).json({ message: "Order placed successfully.", order });
  } catch (err) {
    console.error("placeOrder error:", err);
    return res.status(500).json({ error: "Failed to place order." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE ORDER STATUS — PATCH /api/id-cards/orders/:id/status
//    SuperAdmin auth required
//    Body: { status: "CONFIRMED" | "PROCESSING" | "DISPATCHED" | "DELIVERED" | "CANCELLED" }
// ─────────────────────────────────────────────────────────────────────────────
export const updateOrderStatus = async (req, res) => {
  try {
    const { id }     = req.params;
    const { status } = req.body;

    const valid = ["PENDING","CONFIRMED","PROCESSING","DISPATCHED","DELIVERED","CANCELLED"];
    if (!valid.includes(status))
      return res.status(400).json({ error: `Status must be one of: ${valid.join(", ")}` });

    const order = await prisma.idCardOrder.update({
      where: { id },
      data:  { status },
    });

    return res.json({ message: "Status updated.", order });
  } catch (err) {
    console.error("updateOrderStatus error:", err);
    return res.status(500).json({ error: "Failed to update status." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ORDER STATS — GET /api/id-cards/stats
//    SuperAdmin auth required
//    Returns total orders, total cards, per-status breakdown, recent 5 orders
// ─────────────────────────────────────────────────────────────────────────────
export const getOrderStats = async (req, res) => {
  try {
    const [totalOrders, totalCardsAgg, byStatus, recentOrders] = await Promise.all([
      prisma.idCardOrder.count(),
      prisma.idCardOrder.aggregate({ _sum: { totalCards: true } }),
      prisma.idCardOrder.groupBy({
        by:     ["status"],
        _count: { _all: true },
        _sum:   { totalCards: true },
      }),
      prisma.idCardOrder.findMany({
        orderBy: { orderedAt: "desc" },
        take:    5,
        select: {
          id: true, schoolName: true,
          totalCards: true, status: true, orderedAt: true,
        },
      }),
    ]);

    const statusBreakdown = {};
    for (const row of byStatus) {
      statusBreakdown[row.status] = {
        orderCount: row._count._all,
        totalCards: row._sum.totalCards || 0,
      };
    }

    return res.json({
      totalOrders,
      totalCards: totalCardsAgg._sum.totalCards || 0,
      statusBreakdown,
      recentOrders,
    });
  } catch (err) {
    console.error("getOrderStats error:", err);
    return res.status(500).json({ error: "Failed to fetch stats." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL ORDERS — GET /api/id-cards/orders
// ─────────────────────────────────────────────────────────────────────────────
export const getOrders = async (req, res) => {
  try {
    const orders = await prisma.idCardOrder.findMany({
      orderBy: { orderedAt: "desc" },
      include: {
        template: {
          select: {
            id: true, title: true, imageKey: true,
            templateType: true, templateKey: true,
            primaryColor: true, accentColor: true,
          },
        },
      },
    });

    const withUrls = await Promise.all(
      orders.map(async (o) => ({
        ...o,
        template: o.template
          ? {
              ...o.template,
              imageUrl: o.template.imageKey
                ? await getSignedImageUrl(o.template.imageKey)
                : null,
            }
          : null,
      }))
    );

    return res.json({ orders: withUrls });
  } catch (err) {
    console.error("getOrders error:", err);
    return res.status(500).json({ error: "Failed to fetch orders." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE CODED TEMPLATE — POST /api/id-cards/templates/coded
// ─────────────────────────────────────────────────────────────────────────────
export const createCodedTemplate = async (req, res) => {
  try {
    const { title, templateKey, primaryColor, accentColor, description } = req.body;

    if (!title)       return res.status(400).json({ error: "title is required." });
    if (!templateKey) return res.status(400).json({ error: "templateKey is required." });

    const resolvedPrimary = primaryColor || "#1a5c38";
    const resolvedAccent  = accentColor  || "#c9a84c";

    // Deduplicate on the full combination — same key + same colors
    // This lets custom themes with different colors through
    const existing = await prisma.idCardTemplate.findFirst({
      where: {
        templateKey,
        primaryColor: resolvedPrimary,
        accentColor:  resolvedAccent,
        templateType: "CODED",
      },
    });
    if (existing) return res.json({ template: existing, alreadyExists: true });

    const template = await prisma.idCardTemplate.create({
      data: {
        title,
        description:  description || null,
        templateType: "CODED",
        templateKey,
        primaryColor: resolvedPrimary,
        accentColor:  resolvedAccent,
        imageKey:     null,
        isDefault:    true,
        isActive:     true,
      },
    });

    return res.status(201).json({ template });
  } catch (err) {
    console.error("createCodedTemplate error:", err);
    return res.status(500).json({ error: "Failed to create coded template." });
  }
};