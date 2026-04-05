"use client";

import { useEffect, useState } from "react";
import type { NoteScan } from "@/lib/notes";

type Props = {
  noteId: string;
  isOwner: boolean;
  refreshKey: number;
};

function formatLabel(format: string): string {
  return format.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function NoteScanList({ noteId, isOwner, refreshKey }: Props) {
  const [scans, setScans] = useState<NoteScan[]>([]);

  useEffect(() => {
    fetch(`/api/notes/${noteId}/scans`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setScans(data); })
      .catch(() => {});
  }, [noteId, refreshKey]);

  async function handleDelete(scanId: string) {
    await fetch(`/api/notes/${noteId}/scans/${scanId}`, { method: "DELETE" });
    setScans((prev) => prev.filter((s) => s.id !== scanId));
  }

  async function handleCopy(value: string) {
    await navigator.clipboard.writeText(value).catch(() => {});
  }

  if (scans.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-neutral-500">Scanned Codes</h3>
      {scans.map((scan) => {
        const isUrl = scan.rawValue.startsWith("http://") || scan.rawValue.startsWith("https://");
        return (
          <div key={scan.id} className="flex items-center gap-3 p-3 bg-white border rounded-lg">
            <div className="flex-1 min-w-0">
              {isUrl ? (
                <a
                  href={scan.rawValue}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-blue-600 underline truncate block"
                >
                  {scan.rawValue}
                </a>
              ) : (
                <span className="font-mono text-sm truncate block">{scan.rawValue}</span>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-600">
                  {formatLabel(scan.format)}
                </span>
                <span className="text-xs text-neutral-400">
                  {new Date(scan.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
            <button
              onClick={() => handleCopy(scan.rawValue)}
              className="text-xs px-2 py-1 border rounded hover:bg-neutral-100 transition-colors shrink-0"
              title="Copy to clipboard"
            >
              Copy
            </button>
            {isOwner && (
              <button
                onClick={() => handleDelete(scan.id)}
                className="text-xs text-red-500 hover:text-red-700 shrink-0"
                aria-label="Delete scan"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
