export const dynamic = "force-dynamic";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ noteId: string; filename: string }> }
) {
  const { noteId, filename } = await params;

  // Sanitize to prevent path traversal
  const safeNoteId = path.basename(noteId);
  const safeFilename = path.basename(filename);

  const filePath = path.join(
    process.cwd(),
    "public",
    "uploads",
    "notes",
    safeNoteId,
    safeFilename
  );

  try {
    const buffer = await readFile(filePath);
    return new Response(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
