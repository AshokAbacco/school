import { prisma } from "../../config/db.js";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/finance/list?page=1&limit=15
//
// Returns paginated expense data grouped by category.
// Each category section carries only the items that fall within the current page
// window across ALL items.  The response also includes pagination metadata so
// the frontend can render page controls.
//
// Response shape:
// {
//   sections: [...],   // same shape as before, items sliced to page window
//   pagination: {
//     page:       1,
//     limit:      15,
//     totalItems: 42,
//     totalPages: 3,
//   }
// }
// ─────────────────────────────────────────────────────────────────────────────
export const getExpenses = async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      return res.status(400).json({ message: "SchoolId missing" });
    }

    // ── pagination params ──────────────────────────────────────────────────
    const page  = Math.max(1, parseInt(req.query.page  ?? "1",  10));
    const limit = Math.max(1, parseInt(req.query.limit ?? "15", 10));

    // ── fetch all categories + their live (non-deleted) expenses ──────────
    const categories = await prisma.expenseCategory.findMany({
      where: { schoolId },
      include: {
        expenses: {
          where: { expense: { deletedAt: null } },
          include: { expense: true },
          orderBy: { expense: { createdAt: "desc" } },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // ── flatten ALL items (for pagination math) ────────────────────────────
    const allItems = [];
    for (const cat of categories) {
      for (const m of cat.expenses) {
        allItems.push({
          _categoryId: cat.id,
          id:          m.expense.id,
          label:       m.expense.label,
          amount:      m.expense.amount,
          icon:        m.expense.icon || "Package",
          createdAt:   m.expense.createdAt,
        });
      }
    }

    const totalItems = allItems.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const safePage   = Math.min(page, totalPages);
    const offset     = (safePage - 1) * limit;

    // IDs of items on the current page
    const pageItems   = allItems.slice(offset, offset + limit);
    const pageItemIds = new Set(pageItems.map((i) => i.id));

    // ── build sections containing only the page's items ───────────────────
    const sections = categories
      .map((cat) => {
        const items = cat.expenses
          .filter((m) => pageItemIds.has(m.expense.id))
          .map((m) => ({
            id:        m.expense.id,
            label:     m.expense.label,
            amount:    m.expense.amount,
            icon:      m.expense.icon || "Package",
            createdAt: m.expense.createdAt,
          }));

        // Section total is always over ALL items in the category (not just the page),
        // so percentages in the UI are meaningful.
        const sectionTotal = cat.expenses.reduce((s, m) => s + m.expense.amount, 0);

        return {
          key:   cat.id,
          label: cat.name,
          icon:  cat.icon  || "Package",
          color: cat.color || "#3c5d74",
          total: sectionTotal, // full category total
          items,               // only page-visible items
        };
      })
      .filter((s) => s.items.length > 0); // hide empty sections on this page

    res.json({
      sections,
      pagination: {
        page:       safePage,
        limit,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Fetch expense error:", error);
    res.status(500).json({ message: "Error fetching expenses" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/finance/add
// ─────────────────────────────────────────────────────────────────────────────
export const addExpense = async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      return res.status(400).json({ message: "SchoolId missing" });
    }

    const { label, amount, icon, sectionKey, isNewSection, newSectionLabel } = req.body;

    if (!label || !amount) {
      return res.status(400).json({ message: "Label and amount are required" });
    }

    let categoryId = sectionKey;

    if (isNewSection) {
      if (!newSectionLabel) {
        return res.status(400).json({ message: "New section name is required" });
      }
      const newCategory = await prisma.expenseCategory.create({
        data: {
          name:    newSectionLabel,
          icon:    icon || "Package",
          color:   "#3c5d74",
          schoolId,
        },
      });
      categoryId = newCategory.id;
    }

    if (!categoryId) {
      return res.status(400).json({ message: "Category is required" });
    }

    const expense = await prisma.expense.create({
      data: {
        label,
        amount: Number(amount),
        icon:   icon || "Package",
        school: { connect: { id: schoolId } },
      },
    });

    await prisma.expenseCategoryMap.create({
      data: { expenseId: expense.id, categoryId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Add expense error:", error);
    res.status(500).json({ message: "Error adding expense", detail: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/finance/delete/:id  (soft-delete)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteExpense = async (req, res) => {
  try {
    const { id }   = req.params;
    const schoolId = req.user?.schoolId;

    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    if (expense.schoolId !== schoolId) return res.status(403).json({ message: "Not authorized" });

    await prisma.expense.update({ where: { id }, data: { deletedAt: new Date() } });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Delete failed" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/finance/update/:id
// ─────────────────────────────────────────────────────────────────────────────
export const updateExpense = async (req, res) => {
  try {
    const { id }                  = req.params;
    const { label, amount, icon } = req.body;
    const schoolId                = req.user?.schoolId;

    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    if (expense.schoolId !== schoolId) return res.status(403).json({ message: "Not authorized" });

    const updated = await prisma.expense.update({
      where: { id },
      data:  { label, amount: Number(amount), icon },
    });
    res.json(updated);
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Update failed" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/finance/category/update/:id
// ─────────────────────────────────────────────────────────────────────────────
export const updateCategory = async (req, res) => {
  try {
    const { id }   = req.params;
    const { name } = req.body;
    const schoolId = req.user?.schoolId;

    const category = await prisma.expenseCategory.findUnique({ where: { id } });
    if (!category) return res.status(404).json({ message: "Category not found" });
    if (category.schoolId !== schoolId) return res.status(403).json({ message: "Not authorized" });

    const updated = await prisma.expenseCategory.update({ where: { id }, data: { name } });
    res.json(updated);
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({ message: "Category update failed" });
  }
};