//server\server.js
import "dotenv/config"; // <-- ADD THIS FIRST

import "./src/utils/redis.js";
import app from "./src/app.js"; //login related
import staff from "./src/staff.js";
import finance from "./src/finance.js";
import teacherSalaryRoutes from "./src/Financepages/Routes/teacherRoutes.js";
import student from "./src/student.js";
const PORT = process.env.PORT || 5000;

app.use(staff);
app.use(student);
app.use("/api/finance", finance);
app.use("/api/teachers", teacherSalaryRoutes);
app.listen(PORT, () => {
  console.log(`Server
     running at http://localhost:${PORT}`);
});
