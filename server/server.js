//server\server.js
import "dotenv/config"; // <-- ADD THIS FIRST

import "./src/utils/redis.js";
import app from "./src/app.js"; //login related
import staff from "./src/staff.js";
import finance from "./src/finance.js";

const PORT = process.env.PORT || 5000;

app.use(staff);
app.use(finance);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
