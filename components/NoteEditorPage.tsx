"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Note } from "@/lib/notes";
import NoteEditor, { type NoteEditorHandle } from "./NoteEditor";
import ShareToggle from "./ShareToggle";
import DeleteNoteButton from "./DeleteNoteButton";
import CollaborativeToggle from "./CollaborativeToggle";
import CameraCapture from "./CameraCapture";
import NotePhotoGallery from "./NotePhotoGallery";
import NoteScanList from "./NoteScanList";
import BarcodeScanner from "./BarcodeScanner";

type Props = { note: Note; isOwner: boolean };

export default function NoteEditorPage({ note, isOwner }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [isPublic, setIsPublic] = useState(note.isPublic);
  const [isCollaborative, setIsCollaborative] = useState(note.isCollaborative);
  const [publicSlug, setPublicSlug] = useState(note.publicSlug);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContentRef = useRef<unknown>(null);
  const [photoRefreshKey, setPhotoRefreshKey] = useState(0);
  const [scanRefreshKey, setScanRefreshKey] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const editorRef = useRef<NoteEditorHandle>(null);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const saveNote = useCallback(
    async (data: { title?: string; contentJson?: unknown }) => {
      setSaving(true);
      setSaved(false);
      await fetch(`/api/notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setSaving(false);
      setSaved(true);
    },
    [note.id]
  );

  async function handleTitleBlur() {
    await saveNote({ title });
  }

  function handleContentChange(json: unknown) {
    pendingContentRef.current = json;
    setSaved(false);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      pendingContentRef.current = null;
      saveNote({ contentJson: json });
    }, 800);
  }

  async function handleBackToDashboard() {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    if (pendingContentRef.current !== null) {
      await saveNote({ contentJson: pendingContentRef.current });
      pendingContentRef.current = null;
    }
    window.location.href = "/dashboard";
  }

  async function handleShareToggle(newIsPublic: boolean) {
    const res = await fetch(`/api/notes/${note.id}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: newIsPublic }),
    });
    if (res.ok) {
      const data = (await res.json()) as { isPublic: boolean; publicSlug: string | null };
      setIsPublic(data.isPublic);
      setPublicSlug(data.publicSlug);
    }
  }

  async function handleCollaborativeToggle(newIsCollaborative: boolean) {
    const res = await fetch(`/api/notes/${note.id}/collaborative`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCollaborative: newIsCollaborative }),
    });
    if (res.ok) {
      const data = (await res.json()) as { isCollaborative: boolean };
      setIsCollaborative(data.isCollaborative);
    }
  }

  async function handleScanResult(rawValue: string, format: string) {
    setScannerOpen(false);
    // Insert into editor
    editorRef.current?.insertText(rawValue);
    // Persist to DB
    await fetch(`/api/notes/${note.id}/scans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawValue, format }),
    });
    setScanRefreshKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="text-2xl font-bold bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-neutral-500 focus:outline-none w-full py-1"
        />
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-neutral-400">
            {saving ? "Saving…" : saved ? "Saved" : ""}
          </span>
          <button
            onClick={handleBackToDashboard}
            className="px-3 py-1.5 text-sm bg-neutral-900 text-white rounded-md hover:bg-neutral-700 transition-colors"
          >
            Back to Dashboard
          </button>
          {isOwner && (
            <DeleteNoteButton
              noteId={note.id}
              onDeletedAction={() => router.push("/dashboard")}
            />
          )}
        </div>
      </div>

      {!isOwner && note.isCollaborative && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            ✏️ You are editing a collaborative note. Your changes will be visible to everyone.
          </p>
        </div>
      )}

      {isOwner && (
        <ShareToggle
          isPublic={isPublic}
          publicSlug={publicSlug}
          onToggleAction={handleShareToggle}
        />
      )}
      {isOwner && isPublic && (
        <CollaborativeToggle
          isCollaborative={isCollaborative}
          onToggleAction={handleCollaborativeToggle}
        />
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        <NoteEditor
          ref={editorRef}
          initialContent={note.contentJson}
          onChangeAction={handleContentChange}
        />
      </div>

      <NotePhotoGallery noteId={note.id} isOwner={isOwner} refreshKey={photoRefreshKey} />
      <NoteScanList noteId={note.id} isOwner={isOwner} refreshKey={scanRefreshKey} />

      {isOwner && (
        <div className="flex gap-2 flex-wrap">
          <CameraCapture
            noteId={note.id}
            onPhotoAdded={() => setPhotoRefreshKey((k) => k + 1)}
          />
          <button
            onClick={() => setScannerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-100 border rounded-md hover:bg-neutral-200 transition-colors text-sm"
          >
            <span>⬛</span> Scan Code
          </button>
        </div>
      )}

      {scannerOpen && (
        <BarcodeScanner
          onScanAction={handleScanResult}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  );
}
