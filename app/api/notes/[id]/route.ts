export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { getNoteById, updateNote, deleteNote, updateCollaborativeNote } from "@/lib/notes";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { get } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Check if user owns the note
  let note = await getNoteById(session.user.id, id);

  // If not owned, check if it's collaborative
  if (!note) {
    const collabNote = await get<{
      id: string;
      user_id: string;
      title: string;
      content_json: string;
      is_public: number;
      is_collaborative: number;
      public_slug: string | null;
      created_at: string;
      updated_at: string;
    }>("SELECT * FROM notes WHERE id = ? AND is_collaborative = 1", [id]);

    if (collabNote) {
      note = {
        id: collabNote.id,
        userId: collabNote.user_id,
        title: collabNote.title,
        contentJson: collabNote.content_json,
        isPublic: collabNote.is_public === 1,
        isCollaborative: collabNote.is_collaborative === 1,
        publicSlug: collabNote.public_slug,
        createdAt: collabNote.created_at,
        updatedAt: collabNote.updated_at,
      };
    }
  }

  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(note);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    contentJson?: unknown;
  };

  const data: { title?: string; contentJson?: string } = {};
  if (body.title != null) data.title = body.title;
  if (body.contentJson != null) data.contentJson = JSON.stringify(body.contentJson);

  // Try updating as owner first
  let note = await updateNote(session.user.id, id, data);

  // If not owned, try updating as collaborative note
  if (!note) {
    note = await updateCollaborativeNote(id, session.user.id, data);
  }

  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(note);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await getNoteById(session.user.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteNote(session.user.id, id);
  return new NextResponse(null, { status: 204 });
}
