export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { addNoteScan, getScansByNoteId, getNoteById } from "@/lib/notes";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const scans = await getScansByNoteId(id);
  return NextResponse.json(scans);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: noteId } = await params;
  const note = await getNoteById(session.user.id, noteId);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { rawValue?: string; format?: string };
  if (!body.rawValue || !body.format) {
    return NextResponse.json({ error: "Missing rawValue or format" }, { status: 400 });
  }

  const scan = await addNoteScan(noteId, body.rawValue, body.format);
  return NextResponse.json(scan, { status: 201 });
}
