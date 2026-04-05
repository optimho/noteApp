export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { deleteNotePhoto, getNoteById } from "@/lib/notes";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { unlinkSync } from "node:fs";
import path from "node:path";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: noteId, photoId } = await params;
  const note = await getNoteById(session.user.id, noteId);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filename = await deleteNotePhoto(photoId, noteId);
  if (!filename) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  try {
    unlinkSync(path.join(process.cwd(), "public", "uploads", "notes", noteId, filename));
  } catch { /* ok if already missing */ }

  return new NextResponse(null, { status: 204 });
}