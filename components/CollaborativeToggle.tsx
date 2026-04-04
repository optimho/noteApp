"use client";

import { useState } from "react";

type Props = {
  isCollaborative: boolean;
  onToggleAction: (newValue: boolean) => void;
};

export default function CollaborativeToggle({ isCollaborative, onToggleAction }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      await onToggleAction(!isCollaborative);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <div
          role="switch"
          aria-checked={isCollaborative}
          onClick={handleToggle}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
            isCollaborative ? "bg-blue-600" : "bg-neutral-300"
          } ${loading ? "opacity-50" : ""}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              isCollaborative ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </div>
        <span className="text-neutral-600">
          {isCollaborative ? "Collaborative" : "Private"}
        </span>
      </label>
    </div>
  );
}
