import type { Note } from "@/lib/notes";
import Link from "next/link";

type Props = {
  notes: Pick<Note, "id" | "title" | "updatedAt" | "isPublic">[];
};

export default function NoteList({ notes }: Props) {
  return (
    <ul className="flex flex-col gap-2">
      {notes.map((note) => (
        <li key={note.id}>
          <Link
            href={`/notes/${note.id}`}
            className="flex items-center justify-between p-4 bg-white rounded-lg border hover:border-neutral-400 transition-colors"
          >
            <div>
              <span className="font-medium">{note.title}</span>
              {note.isPublic && (
                <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  Public
                </span>
              )}
            </div>
            <span className="text-xs text-neutral-400">
              {new Date(note.updatedAt).toLocaleDateString()}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
