import { betterAuth } from "better-auth";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "data", "app.db");

let _auth: ReturnType<typeof betterAuth> | null = null;

function getAuth() {
  if (!_auth) {
    // Dynamic import - only runs in Bun runtime, not during Next.js build
    const { Database } = require("bun:sqlite");
    const Bun = require("bun");

    _auth = betterAuth({
      database: new Database(DB_PATH, { create: true }),
      emailAndPassword: {
        enabled: true,
        // Use Bun's native password hashing (much faster, runs in worker thread)
        password: {
          async hash(password: string) {
            const start = Date.now();
            const result = await Bun.password.hash(password, {
              algorithm: "bcrypt",
              cost: 8, // Lower cost = faster (default is 10)
            });
            console.log(`[AUTH] Hash took ${Date.now() - start}ms`);
            return result;
          },
          async verify(data: { password: string; hash: string }) {
            const start = Date.now();
            const result = await Bun.password.verify(data.password, data.hash);
            console.log(`[AUTH] Verify took ${Date.now() - start}ms`);
            return result;
          },
        },
      },
      session: {
        expiresIn: 60 * 60 * 24 * 30, // 30 days
        updateAge: 60 * 60 * 24,       // refresh expiry daily while active
      },
      advanced: {
        useSecureCookies: process.env.BETTER_AUTH_URL?.startsWith("https") ?? false,
        cookiePrefix: "better-auth",
        crossSubDomainCookies: {
          enabled: false,
        },
      },
      trustedOrigins: [
        "http://localhost:3000",
        "http://192.168.10.64:3000",
        ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",").map(o => o.trim()) ?? []),
      ],
      baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    } as any) as ReturnType<typeof betterAuth>;
  }
  return _auth;
}

// Export auth with all properties proxied
export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_target, prop) {
    const authInstance = getAuth();
    const value = authInstance[prop as keyof typeof authInstance];
    // Bind functions to maintain correct 'this' context
    return typeof value === 'function' ? value.bind(authInstance) : value;
  },
}) as ReturnType<typeof betterAuth>;

export type Session = ReturnType<typeof betterAuth>['$Infer']['Session'];
