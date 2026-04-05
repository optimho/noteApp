"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Photo = { id: string; url: string };

type Props = {
  noteId: string;
  isOwner: boolean;
  refreshKey: number;
};

export default function NotePhotoGallery({ noteId, isOwner, refreshKey }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/notes/${noteId}/photos`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setPhotos(data); })
      .catch(() => {});
  }, [noteId, refreshKey]);

  async function handleDelete(photoId: string) {
    await fetch(`/api/notes/${noteId}/photos/${photoId}`, { method: "DELETE" });
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  if (photos.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group aspect-square">
            <img
              src={photo.url}
              alt=""
              className="w-full h-full object-cover rounded-lg border cursor-pointer"
              onClick={() => setLightbox(photo.url)}
            />
            {isOwner && (
              <button
                onClick={() => handleDelete(photo.id)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete photo"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {lightbox && (
        <dialog
          open
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center w-full h-full m-0 max-w-none max-h-none p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt=""
            className="max-w-full max-h-full rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </dialog>
      )}
    </>
  );
}