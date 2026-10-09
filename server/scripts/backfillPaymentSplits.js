// server/scripts/backfillPaymentSplits.js
// ─────────────────────────────────────────────────────────────────────────────
// One-time repair for payment logs whose category split doesn't add up to the
// amount received (student_payment_log.amount ≠ sum of *FeePaid + custom fees).
//
// Usually caused by the old "Full Fee" flow, which saved the total but split it
// only over the 6 standard fees — custom fees (Admission, Uniform, Transport…)
// got nothing, and students with only custom fees got no split at all.
//
// For every affected student, logs are replayed OLDEST FIRST and the missing
// amount is applied to categories that still had a balance at that time, in
// fee order (School, Tuition, Exam, Transport, Books, Lab, Misc, then custom
// fees in the order they were added). This is the same rule the
// /paymentHistory route uses on screen, so after --apply the "*" notes on
// receipts disappear and every screen shows the same numbers.
//
// It ALSO reports (but never changes) logs where money is saved under a custom
// fee name that's no longer in the student's fee list. Fix those by hand with
// "Edit Payment Record".
//
// USAGE (from the server folder):
//   node scripts/backfillPaymentSplits.js                 → dry run, all schools
//   node scripts/backfillPaymentSplits.js --student=155   → dry run, one student
//   node scripts/backfillPaymentSplits.js --school=<id>   → dry run, one school
//   node scripts/backfillPaymentSplits.js --apply         → write changes
//
// Take a DB backup before --apply:
//   pg_dump "$DATABASE_URL" -t student_payment_log -t student_list -t student_fee_categories > backup.sql
// ─────────────────────────────────────────────────────────────────────────────
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const APPLY = !!args.apply;

const STD = [
  { name: "School Fee", key: "collegeFee", field: "schoolFeePaid" },
  { name: "Tuition Fee", key: "tuitionFee", field: "tuitionFeePaid" },
  { name: "Exam Fee", key: "examFee", field: "examFeePaid" },
  { name: "Transport Fee", key: "transportFee", field: "transportFeePaid" },
  { name: "Books Fee", key: "booksFee", field: "booksFeePaid" },
  { name: "Lab Fee", key: "labFee", field: "labFeePaid" },
  { name: "Miscellaneous", key: "miscFee", field: "miscFeePaid" },
];
const STD_FIELDS = STD.map((s) => s.field);

const r2 = (n) => Math.round(Number(n || 0) * 100) / 100;
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .trim();
const money = (n) => "Rs." + r2(n).toLocaleString("en-IN");

function parseBd(raw) {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function bdTotal(bd, key) {
  const e = bd[key];
  if (!e) return 0;
  return Number(typeof e === "object" ? (e.total ?? e.amount ?? 0) : e) || 0;
}
function categoryDefs(bd) {
  const defs = [];
  for (const s of STD) {
    const total = bdTotal(bd, s.key);
    if (total > 0) defs.push({ ...s, total, isCustom: false });
  }
  for (const cf of Array.isArray(bd.customFees) ? bd.customFees : []) {
    const label = cf.label || cf.name;
    const total = Number(cf.total ?? cf.amount ?? 0);
    if (label && total > 0)
      defs.push({
        name: label,
        label,
        key: norm(label),
        total,
        isCustom: true,
      });
  }
  return defs;
}

async function main() {
  const where = { deletedAt: null };
  if (args.student) where.id = parseInt(args.student);
  if (args.school) where.schoolId = String(args.school);

  const students = await prisma.studentList.findMany({
    where,
    select: { id: true, name: true, schoolId: true, feeBreakdown: true },
    orderBy: { id: "asc" },
  });

  const report = { fixed: [], orphan: [], excess: [], noCategories: [] };
  let logsChanged = 0;

  for (const st of students) {
    const defs = categoryDefs(parseBd(st.feeBreakdown));
    const logs = await prisma.studentPaymentLog.findMany({
      where: { studentListId: st.id },
      orderBy: [{ paidAt: "asc" }, { id: "asc" }],
    });
    if (logs.length === 0) continue;

    const knownCustom = new Set(
      defs.filter((d) => d.isCustom).map((d) => d.key),
    );
    const running = {}; // category name → paid so far (after fixes)
    const updates = [];

    for (const log of logs) {
      const amount = r2(log.amount);
      const custom = { ...(log.customFeeBreakdown || {}) };

      // what this log already records, per current category
      const recorded = defs.map((d) => {
        if (!d.isCustom) return r2(log[d.field]);
        return r2(
          Object.entries(custom)
            .filter(([k]) => norm(k) === d.key)
            .reduce((a, [, v]) => a + Number(v || 0), 0),
        );
      });
      const stdSum = STD_FIELDS.reduce((a, f) => a + r2(log[f]), 0);
      const customSum = Object.values(custom).reduce(
        (a, v) => a + Number(v || 0),
        0,
      );
      const fullSplit = r2(stdSum + customSum); // what the SQL check compares

      // money saved under a custom name the student no longer has
      const orphans = Object.entries(custom).filter(
        ([k, v]) => Number(v) > 0 && !knownCustom.has(norm(k)),
      );
      if (orphans.length) {
        report.orphan.push({
          student: `${st.name} (#${st.id})`,
          log: log.id,
          amount,
          labels: orphans.map(([k, v]) => `"${k}" ${money(v)}`).join(", "),
        });
      }

      let gap = r2(amount - fullSplit);
      const add = new Array(defs.length).fill(0);

      if (gap > 0.009) {
        if (defs.length === 0) {
          report.noCategories.push({
            student: `${st.name} (#${st.id})`,
            log: log.id,
            amount,
          });
        } else {
          defs.forEach((d, i) => {
            if (gap <= 0.009) return;
            const capacity = r2(d.total - (running[d.name] || 0) - recorded[i]);
            if (capacity <= 0) return;
            const chunk = r2(Math.min(capacity, gap));
            add[i] = chunk;
            gap = r2(gap - chunk);
          });
          if (gap > 0.009) {
            report.excess.push({
              student: `${st.name} (#${st.id})`,
              log: log.id,
              amount,
              excess: gap,
            });
          }
        }
      }

      // advance running totals with recorded + added
      defs.forEach((d, i) => {
        running[d.name] = r2((running[d.name] || 0) + recorded[i] + add[i]);
      });

      if (add.some((a) => a > 0)) {
        const data = {};
        const lines = [];
        const newCustom = { ...custom };
        defs.forEach((d, i) => {
          if (!add[i]) return;
          lines.push(`${d.name} +${money(add[i])}`);
          if (d.isCustom) {
            // reuse an existing key for this category if it has one (any case)
            const existingKey =
              Object.keys(newCustom).find((k) => norm(k) === d.key) || d.label;
            newCustom[existingKey] = r2(
              Number(newCustom[existingKey] || 0) + add[i],
            );
          } else {
            data[d.field] = r2(r2(log[d.field]) + add[i]);
          }
        });
        if (Object.keys(newCustom).length) data.customFeeBreakdown = newCustom;
        updates.push({ id: log.id, data });
        report.fixed.push({
          student: `${st.name} (#${st.id})`,
          log: log.id,
          date: new Date(log.paidAt).toISOString().slice(0, 10),
          amount,
          before: fullSplit,
          change: lines.join(", "),
        });
      }
    }

    if (APPLY && updates.length) {
      await prisma.$transaction(
        updates.map((u) =>
          prisma.studentPaymentLog.update({
            where: { id: u.id },
            data: u.data,
          }),
        ),
      );
      logsChanged += updates.length;

      // Keep StudentList's flat per-category columns in step with the logs.
      // Only ever raises a value, never lowers it.
      const cur = await prisma.studentList.findUnique({ where: { id: st.id } });
      const flat = {};
      for (const s of STD) {
        const fromLogs = running[s.name];
        if (fromLogs !== undefined && fromLogs > r2(cur[s.field]))
          flat[s.field] = fromLogs;
      }
      if (Object.keys(flat).length) {
        await prisma.studentList.update({ where: { id: st.id }, data: flat });
      }

      // Same for StudentFeeCategory.paidAmount (if that table is in use):
      // recordCategoryPayment uses it to cap payments per category.
      try {
        const sfcs = await prisma.studentFeeCategory.findMany({
          where: { studentListId: st.id },
          include: { category: true },
        });
        for (const sfc of sfcs) {
          const def = defs.find(
            (d) => norm(d.name) === norm(sfc.category?.name),
          );
          if (!def) continue;
          const fromLogs = Math.min(
            running[def.name] || 0,
            Number(sfc.totalAmount),
          );
          if (fromLogs > Number(sfc.paidAmount)) {
            await prisma.studentFeeCategory.update({
              where: { id: sfc.id },
              data: { paidAmount: fromLogs },
            });
          }
        }
      } catch {
        /* fee category tables not migrated — nothing to sync */
      }
    }
  }

  // ── Report ────────────────────────────────────────────────────────────────
  console.log(
    `\n${APPLY ? "APPLIED" : "DRY RUN — nothing written. Re-run with --apply to save."}`,
  );
  console.log(`Students checked: ${students.length}\n`);

  console.log(
    `1) Payments whose missing split ${APPLY ? "WAS" : "WILL BE"} filled in: ${report.fixed.length}`,
  );
  if (report.fixed.length) console.table(report.fixed);

  console.log(
    `\n2) Money saved under a fee name the student no longer has (NOT changed — fix with Edit Payment Record): ${report.orphan.length}`,
  );
  if (report.orphan.length) console.table(report.orphan);

  console.log(
    `\n3) Paid more than all pending fees (left as advance): ${report.excess.length}`,
  );
  if (report.excess.length) console.table(report.excess);

  console.log(
    `\n4) Students with no fee categories set (nothing to split against — add fees in Edit Student Fees): ${report.noCategories.length}`,
  );
  if (report.noCategories.length) console.table(report.noCategories);

  if (APPLY) console.log(`\nPayment logs updated: ${logsChanged}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
