"use client";

import { useState, useEffect } from "react";

type Props = {
  isPublic: boolean;
  publicSlug: string | null;
  onToggleAction: (isPublic: boolean) => Promise<void>;
};

export default function ShareToggle({ isPublic, publicSlug, onToggleAction }: Props) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const publicUrl = publicSlug && origin ? `${origin}/p/${publicSlug}` : null;

  async function handleCopy() {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <div
          role="switch"
          aria-checked={isPublic}
          onClick={() => void onToggleAction(!isPublic)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
            isPublic ? "bg-blue-600" : "bg-neutral-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              isPublic ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </div>
        <span className="text-neutral-600">
          {isPublic ? "Public" : "Private"}
        </span>
      </label>

      {isPublic && publicUrl && (
        <div className="flex items-center gap-2 pl-1">
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline truncate max-w-xs"
          >
            {publicUrl}
          </a>
          <button
            onClick={handleCopy}
            className="text-xs px-2 py-0.5 bg-neutral-100 hover:bg-neutral-200 rounded border border-neutral-300 shrink-0"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}
