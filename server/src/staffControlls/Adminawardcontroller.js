import { prisma } from "../config/db.js";
import cacheService from "../utils/cacheService.js";

export const getAwards = async (req, res) => {
  try {
    const { schoolId } = req.user;

    const cacheKey = await cacheService.buildKey(schoolId, "awards:list");
    const cached = await cacheService.get(cacheKey);
    if (cached) return res.status(200).json({ success: true, data: JSON.parse(cached) });

    const awards = await prisma.award.findMany({
      where: { schoolId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: { _count: { select: { studentAwards: true } } },
    });

    await cacheService.set(cacheKey, awards);
    return res.status(200).json({ success: true, data: awards });
  } catch (error) {
    console.error("getAwards error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createAward = async (req, res) => {
  try {
    const { schoolId } = req.user;
    const { name, description, category } = req.body;

    if (!name || !category) {
      return res.status(400).json({ success: false, message: "name and category are required" });
    }

    const existing = await prisma.award.findUnique({
      where: { schoolId_name: { schoolId, name: name.trim() } },
    });
    if (existing) {
      return res.status(409).json({ success: false, message: `An award named "${name.trim()}" already exists` });
    }

    const award = await prisma.award.create({
      data: { name: name.trim(), description: description?.trim() ?? null, category, schoolId },
    });

    await cacheService.invalidateSchool(schoolId);
    return res.status(201).json({ success: true, message: `Award "${award.name}" created`, data: award });
  } catch (error) {
    console.error("createAward error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateAward = async (req, res) => {
  try {
    const { schoolId } = req.user;
    const { id } = req.params;
    const { name, description, category } = req.body;

    if (!name || !category) {
      return res.status(400).json({ success: false, message: "name and category are required" });
    }

    const existing = await prisma.award.findFirst({ where: { id, schoolId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Award not found" });
    }

    const duplicate = await prisma.award.findFirst({
      where: { schoolId, name: name.trim(), id: { not: id } },
    });
    if (duplicate) {
      return res.status(409).json({ success: false, message: `An award named "${name.trim()}" already exists` });
    }

    const updated = await prisma.award.update({
      where: { id },
      data: { name: name.trim(), description: description?.trim() ?? null, category },
    });

    await cacheService.invalidateSchool(schoolId);
    return res.status(200).json({ success: true, message: "Award updated", data: updated });
  } catch (error) {
    console.error("updateAward error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteAward = async (req, res) => {
  try {
    const { schoolId } = req.user;
    const { id } = req.params;

    const existing = await prisma.award.findFirst({
      where: { id, schoolId },
      include: { _count: { select: { studentAwards: true } } },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Award not found" });
    }

    if (existing._count.studentAwards > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete — ${existing._count.studentAwards} student(s) have received this award`,
      });
    }

    await prisma.award.delete({ where: { id } });

    await cacheService.invalidateSchool(schoolId);
    return res.status(200).json({ success: true, message: `Award "${existing.name}" deleted` });
  } catch (error) {
    console.error("deleteAward error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};