"use client";

import { useRef, useState } from "react";

type Props = {
  noteId: string;
  onPhotoAdded: (url: string) => void;
};

export default function CameraCapture({ noteId, onPhotoAdded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    // Resize to max 800px before uploading
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (blob) {
        const form = new FormData();
        form.append("photo", blob, "photo.jpg");
        const res = await fetch(`/api/notes/${noteId}/photos`, { method: "POST", body: form });
        if (res.ok) {
          const data = (await res.json()) as { url: string };
          onPhotoAdded(data.url);
        }
      }
      setUploading(false);
      e.target.value = "";
    }, "image/jpeg", 0.6);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-4 py-2 bg-neutral-100 border rounded-md hover:bg-neutral-200 transition-colors text-sm disabled:opacity-50"
      >
        <span>📷</span> {uploading ? "Uploading…" : "Add Photo"}
      </button>
    </div>
  );
}