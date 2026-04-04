export const dynamic = "force-dynamic";

import { getNoteByPublicSlug } from "@/lib/notes";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import PublicNoteViewer from "@/components/PublicNoteViewer";
import Link from "next/link";

export default async function PublicNotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const note = await getNoteByPublicSlug(slug);
  if (!note) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const canEdit = session && (note.isCollaborative || note.userId === session.user.id);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-3xl font-bold">{note.title}</h1>
        {canEdit && (
          <Link
            href={`/notes/${note.id}`}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Edit Note
          </Link>
        )}
      </div>
      {note.isCollaborative && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            ✏️ This is a collaborative note. Anyone can edit it.
          </p>
        </div>
      )}
      <PublicNoteViewer contentJson={note.contentJson} />
    </div>
  );
}
