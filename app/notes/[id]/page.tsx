export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { getNoteById } from "@/lib/notes";
import { get } from "@/lib/db";
import type { Note } from "@/lib/notes";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import NoteEditorPage from "@/components/NoteEditorPage";

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { id } = await params;

  // First try to get the note if user owns it
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

  if (!note) notFound();

  const isOwner = note.userId === session.user.id;

  return <NoteEditorPage note={note} isOwner={isOwner} />;
}
