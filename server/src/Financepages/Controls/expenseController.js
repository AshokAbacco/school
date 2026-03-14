import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getExpenses = async (req, res) => {
  try {

    const categories = await prisma.expenseCategory.findMany({
      include: {
        expenses: {
          include: {
            expense: true
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    const formatted = categories.map(cat => {

      const items = cat.expenses.map(m => ({
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
    const { label, amount, icon, sectionKey, isNewSection, newSectionLabel } = req.body;

    let categoryId = sectionKey;

    // Create category if new
    if (isNewSection) {
      const newCategory = await prisma.expenseCategory.create({
        data: {
          name: newSectionLabel,
          icon: icon,
          color: "#3c5d74",
        },
      });

      categoryId = newCategory.id;
    }

    // Create expense
    const expense = await prisma.expense.create({
      data: {
        label,
        amount: Number(amount),
        icon,
      },
    });

    // Create mapping
    await prisma.expenseCategoryMap.create({
      data: {
        expenseId: expense.id,
        categoryId: categoryId,
      },
    });

    res.json({ success: true });

  } catch (error) {
    console.error("Add expense error:", error);
    res.status(500).json({ message: "Error adding expense" });
  }
};