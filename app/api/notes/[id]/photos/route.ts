export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { addNotePhoto, getPhotosByNoteId, getNoteById } from "@/lib/notes";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { mkdirSync } from "node:fs";
import path from "node:path";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const photos = await getPhotosByNoteId(id);
  return NextResponse.json(
    photos.map((p) => ({ id: p.id, url: `/api/uploads/${p.noteId}/${p.filename}` }))
  );
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

  const formData = await req.formData();
  const file = formData.get("photo");
  if (!(file instanceof File)) return NextResponse.json({ error: "No photo" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large" }, { status: 413 });

  const filename = `${nanoid()}.jpg`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "notes", noteId);
  mkdirSync(uploadDir, { recursive: true });

  const buffer = await file.arrayBuffer();
  await Bun.write(path.join(uploadDir, filename), buffer);

  const photo = await addNotePhoto(noteId, filename);
  return NextResponse.json(
    { id: photo.id, url: `/api/uploads/${noteId}/${filename}` },
    { status: 201 }
  );
}