export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { deleteNoteScan, getNoteById } from "@/lib/notes";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; scanId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: noteId, scanId } = await params;
  const note = await getNoteById(session.user.id, noteId);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const deleted = await deleteNoteScan(scanId, noteId);
  if (!deleted) return NextResponse.json({ error: "Scan not found" }, { status: 404 });

  return new NextResponse(null, { status: 204 });
}
