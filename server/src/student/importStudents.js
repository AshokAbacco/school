const { parseExcel } = require("../utils/excelParser");

exports.importStudents = async (req, res) => {
  try {
    const data = parseExcel(req.file.buffer);

    // validation
    const validData = data.filter(
      (s) => s.name && s.class && s.rollNumber
    );

    // TODO: save to DB (Prisma)
    // await prisma.student.createMany({ data: validData });

    res.json({
      message: "Students imported",
      count: validData.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};