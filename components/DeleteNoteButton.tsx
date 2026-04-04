"use client";

import { useState } from "react";

type Props = {
  noteId: string;
  onDeletedAction: () => void;
};

export default function DeleteNoteButton({ noteId, onDeletedAction }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setLoading(true);
    await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
    onDeletedAction();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className={`text-sm px-3 py-1 rounded-md transition-colors ${
        confirming
          ? "bg-red-600 text-white hover:bg-red-700"
          : "text-red-500 hover:bg-red-50"
      } disabled:opacity-50`}
      onBlur={() => setConfirming(false)}
    >
      {loading ? "Deleting…" : confirming ? "Confirm delete" : "Delete"}
    </button>
  );
}
