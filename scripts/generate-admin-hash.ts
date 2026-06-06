import bcrypt from "bcryptjs";
import { createInterface } from "readline";

const rl = createInterface({ input: process.stdin, output: process.stdout });

rl.question("Enter admin password: ", (password) => {
  const hash = bcrypt.hashSync(password.trim(), 12);
  console.log("\nAdd to your .env:");
  console.log(`ADMIN_PASS_HASH=${hash}`);
  rl.close();
});
