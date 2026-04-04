import { betterAuth } from "better-auth";
import { Database } from "bun:sqlite";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "data", "app.db");

console.log("Creating auth instance...");
const auth = betterAuth({
  database: new Database(DB_PATH, { create: true }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: ["http://localhost:3000"],
  baseURL: "http://localhost:3000",
});

console.log("Auth instance created successfully!");
console.log("Auth handler:", typeof auth.handler);
console.log("Auth api:", typeof auth.api);

// Try to create a test request
const testRequest = new Request("http://localhost:3000/api/auth/get-session", {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
});

console.log("\nTesting get-session endpoint...");
auth.handler(testRequest)
  .then(async (response) => {
    console.log("Response status:", response.status);
    const text = await response.text();
    console.log("Response body:", text);
  })
  .catch((err) => {
    console.error("Error:", err);
  });
