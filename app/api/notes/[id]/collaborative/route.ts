import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setNoteCollaborative } from "@/lib/notes";
import { headers } from "next/headers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as { isCollaborative: boolean };

  const note = await setNoteCollaborative(session.user.id, id, body.isCollaborative);

  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: note.id,
    isCollaborative: note.isCollaborative,
  });
}
