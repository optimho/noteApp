export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { createNote, getNotesByUser } from "@/lib/notes";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notes = await getNotesByUser(session.user.id);
  return NextResponse.json(
    notes.map((n) => ({
      id: n.id,
      title: n.title,
      isPublic: n.isPublic,
      updatedAt: n.updatedAt,
    }))
  );
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    contentJson?: unknown;
  };

  const contentJson =
    body.contentJson != null
      ? JSON.stringify(body.contentJson)
      : undefined;

  const note = await createNote(session.user.id, {
    title: body.title,
    contentJson,
  });

  return NextResponse.json(note, { status: 201 });
}
