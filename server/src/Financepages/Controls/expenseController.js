import { prisma } from "../../config/db.js";

export const getExpenses = async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ message: "SchoolId missing" });
    }

    const categories = await prisma.expenseCategory.findMany({
      where: { schoolId },
      include: {
        expenses: {
          where: {
            expense: {
              deletedAt: null,
            },
          },
          include: {
            expense: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const formatted = categories.map((cat) => {
      const items = cat.expenses.map((m) => ({
        id:        m.expense.id,
        label:     m.expense.label,
        amount:    m.expense.amount,
        icon:      m.expense.icon || "Package",
        createdAt: m.expense.createdAt, // ✅ included so date filtering works in Excel download
      }));
      const total = items.reduce((sum, i) => sum + i.amount, 0);

      return {
        key:   cat.id,
        label: cat.name,
        icon:  cat.icon  || "Package",
        color: cat.color || "#3c5d74",
        total,
        items,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error("Fetch expense error:", error);
    res.status(500).json({ message: "Error fetching expenses" });
  }
};

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
        school: {
          connect: { id: schoolId },
        },
      },
    });

    await prisma.expenseCategoryMap.create({
      data: {
        expenseId:  expense.id,
        categoryId,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Add expense error:", error);
    res.status(500).json({ message: "Error adding expense", detail: error.message });
  }
};

// ✅ Soft-delete — keeps map row, filters via deletedAt in getExpenses
export const deleteExpense = async (req, res) => {
  try {
    const { id }     = req.params;
    const schoolId   = req.user?.schoolId;

    const expense = await prisma.expense.findUnique({ where: { id } });

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    if (expense.schoolId !== schoolId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await prisma.expense.update({
      where: { id },
      data:  { deletedAt: new Date() },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Delete failed" });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const { id }             = req.params;
    const { label, amount, icon } = req.body;
    const schoolId           = req.user?.schoolId;

    const expense = await prisma.expense.findUnique({ where: { id } });

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    if (expense.schoolId !== schoolId) {
      return res.status(403).json({ message: "Not authorized" });
    }

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

export const updateCategory = async (req, res) => {
  try {
    const { id }   = req.params;
    const { name } = req.body;
    const schoolId = req.user?.schoolId;

    const category = await prisma.expenseCategory.findUnique({ where: { id } });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (category.schoolId !== schoolId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updated = await prisma.expenseCategory.update({
      where: { id },
      data:  { name },
    });

    res.json(updated);
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({ message: "Category update failed" });
  }
};