export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { setNotePublic } from "@/lib/notes";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { isPublic?: boolean };
  const isPublic = body.isPublic === true;

  const note = await setNotePublic(session.user.id, id, isPublic);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: note.id,
    isPublic: note.isPublic,
    publicSlug: note.publicSlug,
  });
}
