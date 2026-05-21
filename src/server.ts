import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(env.port, () => {
  console.log(`MatoStudio API running on port ${env.port}`);
});
