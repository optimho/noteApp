export const dynamic = "force-dynamic";

import { getNoteByPublicSlug } from "@/lib/notes";
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
