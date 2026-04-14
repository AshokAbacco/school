import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getExpenses = async (req, res) => {
  try {
    const schoolId = req.user?.schoolId; // ✅ FIX

    if (!schoolId) {
      return res.status(400).json({ message: "SchoolId missing" });
    }

    const categories = await prisma.expenseCategory.findMany({
      where: { schoolId }, // ✅ NOW WORKS
      include: {
        expenses: {
          include: { expense: true }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    const formatted = categories.map(cat => {
      const items = cat.expenses.map(m => ({
        id: m.expense.id, 
        label: m.expense.label,
        amount: m.expense.amount,
        icon: m.expense.icon || "Package"
      }));

      const total = items.reduce((sum, i) => sum + i.amount, 0);

      return {
        key: cat.id,
        label: cat.name,
        icon: cat.icon || "Package",
        color: cat.color || "#3c5d74",
        total,
        items
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
    const schoolId = req.user?.schoolId; // ✅ FIX

    if (!schoolId) {
      return res.status(400).json({ message: "SchoolId missing" });
    }

    const { label, amount, icon, sectionKey, isNewSection, newSectionLabel } = req.body;

    let categoryId = sectionKey;

    if (isNewSection) {
      const newCategory = await prisma.expenseCategory.create({
        data: {
          name: newSectionLabel,
          icon,
          color: "#3c5d74",
          schoolId, // ✅ FIX
        },
      });

      categoryId = newCategory.id;
    }

    const expense = await prisma.expense.create({
      data: {
        label,
        amount: Number(amount),
        icon,
      },
    });

    await prisma.expenseCategoryMap.create({
      data: {
        expenseId: expense.id,
        categoryId,
      },
    });

    res.json({ success: true });

  } catch (error) {
    console.error("Add expense error:", error);
    res.status(500).json({ message: "Error adding expense" });
  }
};

// ✅ DELETE EXPENSE
export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    // delete mapping first
    await prisma.expenseCategoryMap.deleteMany({
      where: { expenseId: id }
    });

    // delete expense
    await prisma.expense.delete({
      where: { id }
    });

    res.json({ success: true });

  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Delete failed" });
  }
};

// ✅ UPDATE EXPENSE
export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, amount, icon } = req.body;

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        label,
        amount: Number(amount),
        icon
      }
    });

    res.json(updated);

  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Update failed" });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const updated = await prisma.expenseCategory.update({
      where: { id },
      data: { name }
    });

    res.json(updated);
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({ message: "Category update failed" });
  }
};