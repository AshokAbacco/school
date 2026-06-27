import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function backfill() {
  console.log("Starting backfill...\n");

  const students = await prisma.studentList.findMany({
    where: {
      deletedAt: null,
      paidAmount: { gt: 0 },
    },
    select: {
      id:               true,
      name:             true,
      paidAmount:       true,
      paymentDate:      true,
      paymentMode:      true,
      createdAt:        true,
      schoolFeePaid:    true,
      tuitionFeePaid:   true,
      examFeePaid:      true,
      transportFeePaid: true,
      booksFeePaid:     true,
      labFeePaid:       true,
      miscFeePaid:      true,
      paymentLogs:      { select: { id: true }, take: 1 },
    },
  });

  console.log(`Found ${students.length} students with paidAmount > 0\n`);

  let created = 0;
  let skipped = 0;
  let errors  = 0;

  for (const student of students) {
    try {
      if (student.paymentLogs.length > 0) {
        console.log(`⏭  [${student.id}] ${student.name} — already has log, skipping`);
        skipped++;
        continue;
      }

      const paidAt = student.paymentDate
        ? new Date(student.paymentDate)
        : new Date(student.createdAt);

      await prisma.studentPaymentLog.create({
        data: {
          studentListId:    student.id,
          amount:           Number(student.paidAmount),
          paymentMode:      student.paymentMode || "Cash",
          paidAt,
          schoolFeePaid:    Number(student.schoolFeePaid    || 0),
          tuitionFeePaid:   Number(student.tuitionFeePaid   || 0),
          examFeePaid:      Number(student.examFeePaid      || 0),
          transportFeePaid: Number(student.transportFeePaid || 0),
          booksFeePaid:     Number(student.booksFeePaid     || 0),
          labFeePaid:       Number(student.labFeePaid       || 0),
          miscFeePaid:      Number(student.miscFeePaid      || 0),
          createdBy:        "backfill_script",
        },
      });

      created++;
      console.log(`✅ [${student.id}] ${student.name} → ₹${student.paidAmount} on ${paidAt.toLocaleDateString("en-IN")}`);

    } catch (err) {
      errors++;
      console.error(`❌ [${student.id}] ${student.name} → ${err.message}`);
    }
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`✅ Created : ${created}`);
  console.log(`⏭  Skipped : ${skipped}`);
  console.log(`❌ Errors  : ${errors}`);
  console.log(`─────────────────────────────────`);

  await prisma.$disconnect();
}

backfill().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
