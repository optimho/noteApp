export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { getNotesByUser, getAllPublicNotes } from "@/lib/notes";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import NoteList from "@/components/NoteList";
import TemplateSelector from "@/components/TemplateSelector";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const notes = await getNotesByUser(session.user.id);
  const publicNotes = await getAllPublicNotes();

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Notes</h1>
          <TemplateSelector />
        </div>
        {notes.length === 0 ? (
          <p className="text-neutral-500">No notes yet. Create your first one!</p>
        ) : (
          <NoteList notes={notes} />
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Public Notes</h2>
        {publicNotes.length === 0 ? (
          <p className="text-neutral-500">No public notes yet.</p>
        ) : (
          <div className="space-y-2">
            {publicNotes.map((note) => (
              <Link
                key={note.id}
                href={`/p/${note.publicSlug}`}
                className="block p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-medium">{note.title}</h3>
                    <p className="text-sm text-neutral-500">
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {note.isCollaborative && (
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                      Collaborative
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
