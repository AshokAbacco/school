// server/scripts/reconcilePaidAmounts.js
//
// One-time fix for existing StudentList rows where `paidAmount` had drifted
// away from the sum of the per-category *FeePaid columns (this is what
// caused e.g. Anita Angadi to show ₹19,200 paid on the KPI cards but only
// ₹5,200 in the Category-wise Fee Details table).
//
// Safe to re-run — it's a no-op for any row that's already in sync.
//
// Usage:
//   node server/scripts/reconcilePaidAmounts.js
//   node server/scripts/reconcilePaidAmounts.js --dry-run   (report only, no writes)

import { prisma } from "../src/config/db.js";

const CATEGORY_FIELDS = [
  "schoolFeePaid",
  "tuitionFeePaid",
  "examFeePaid",
  "transportFeePaid",
  "booksFeePaid",
  "labFeePaid",
  "miscFeePaid",
];

const sumCategoryPaid = (s) =>
  CATEGORY_FIELDS.reduce((sum, k) => sum + Number(s[k] || 0), 0);

const isDryRun = process.argv.includes("--dry-run");

async function main() {
  const students = await prisma.studentList.findMany({ where: { deletedAt: null } });

  let fixed = 0;
  const driftReport = [];

  for (const s of students) {
    const categoryPaid = sumCategoryPaid(s);
    const currentPaid = Number(s.paidAmount || 0);

    if (currentPaid !== categoryPaid) {
      driftReport.push({
        id: s.id,
        name: s.name,
        oldPaidAmount: currentPaid,
        newPaidAmount: categoryPaid,
        drift: currentPaid - categoryPaid,
      });

      if (!isDryRun) {
        const newStatus =
          categoryPaid >= Number(s.fees || 0)
            ? "PAID"
            : categoryPaid > 0
            ? "PARTIAL"
            : "UNPAID";

        await prisma.studentList.update({
          where: { id: s.id },
          data: {
            paidAmount: categoryPaid,
            paymentStatus: newStatus,
          },
        });
        fixed++;
      }
    }
  }

  console.table(driftReport);

  if (isDryRun) {
    console.log(`[dry-run] ${driftReport.length} record(s) have drifted paidAmount. No writes made.`);
  } else {
    console.log(`Done. Reconciled ${fixed} record(s).`);
  }
}

main()
  .catch((err) => {
    console.error("Reconciliation failed:", err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());