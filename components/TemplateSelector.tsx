"use client";

import { useState } from "react";
import { templates } from "@/lib/templates";
import { useRouter } from "next/navigation";

export default function TemplateSelector() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  async function createFromTemplate(templateId: string) {
    setCreating(true);
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: template.name,
        contentJson: template.content,
      }),
    });

    if (res.ok) {
      const note = await res.json();
      router.push(`/notes/${note.id}`);
    }
    setCreating(false);
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-neutral-900 text-white rounded-md hover:bg-neutral-700 transition-colors"
        disabled={creating}
      >
        {creating ? "Creating..." : "New Note"}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-20">
            <div className="p-2">
              <p className="text-xs text-neutral-500 px-2 py-1 font-medium">
                Choose a template
              </p>
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => createFromTemplate(template.id)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-neutral-100 transition-colors flex items-center gap-3"
                >
                  <span className="text-2xl">{template.icon}</span>
                  <span className="text-sm font-medium">{template.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
