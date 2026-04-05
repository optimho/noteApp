export const dynamic = "force-dynamic";

import { getNoteByPublicSlug } from "@/lib/notes";
import { run } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const note = await getNoteByPublicSlug(slug);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    title: note.title,
    contentJson: JSON.parse(note.contentJson) as unknown,
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const note = await getNoteByPublicSlug(slug);

  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!note.isCollaborative) return NextResponse.json({ error: "Not editable" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { contentJson?: unknown };
  if (!body.contentJson) return NextResponse.json({ error: "Missing content" }, { status: 400 });

  await run(
    "UPDATE notes SET content_json = ?, updated_at = datetime('now') WHERE public_slug = ?",
    [JSON.stringify(body.contentJson), slug]
  );

  return NextResponse.json({ ok: true });
}
