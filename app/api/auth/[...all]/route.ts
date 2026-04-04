export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";

// Handle auth requests manually to work with lazy-loaded auth instance
export async function GET(request: Request) {
  try {
    console.log("GET /api/auth - handler type:", typeof auth.handler);
    const response = await auth.handler(request);
    console.log("GET /api/auth - response status:", response.status);
    return response;
  } catch (error) {
    console.error("GET /api/auth - error:", error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const start = Date.now();
    console.log("POST /api/auth - handler type:", typeof auth.handler);
    const response = await auth.handler(request);
    const duration = Date.now() - start;
    console.log("POST /api/auth - response status:", response.status, `(${duration}ms)`);
    return response;
  } catch (error) {
    console.error("POST /api/auth - error:", error);
    throw error;
  }
}
