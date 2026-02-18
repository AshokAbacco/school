//server\server.js
import "./src/utils/redis.js";
import app from "./src/app.js"; //login related
import staff from "./src/staff.js"

const PORT = process.env.PORT || 5000;

app.use(staff); 

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
