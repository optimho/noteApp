"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateNoteButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const note = (await res.json()) as { id: string };
      router.push(`/notes/${note.id}`);
    } else {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCreate}
      disabled={loading}
      className="px-4 py-2 bg-neutral-900 text-white rounded-md hover:bg-neutral-700 disabled:opacity-50 transition-colors text-sm"
    >
      {loading ? "Creating…" : "+ New note"}
    </button>
  );
}
