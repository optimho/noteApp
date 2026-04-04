"use client";

import type { Editor } from "@tiptap/react";

type Props = { editor: Editor | null };

type ToolbarButton = {
  label: string;
  action: () => void;
  isActive: () => boolean;
};

export default function Toolbar({ editor }: Props) {
  if (!editor) return null;

  const buttons: ToolbarButton[] = [
    {
      label: "B",
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive("bold"),
    },
    {
      label: "I",
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive("italic"),
    },
    {
      label: "H1",
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor.isActive("heading", { level: 1 }),
    },
    {
      label: "H2",
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive("heading", { level: 2 }),
    },
    {
      label: "H3",
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: () => editor.isActive("heading", { level: 3 }),
    },
    {
      label: "P",
      action: () => editor.chain().focus().setParagraph().run(),
      isActive: () => editor.isActive("paragraph"),
    },
    {
      label: "• List",
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive("bulletList"),
    },
    {
      label: "☑ Tasks",
      action: () => editor.chain().focus().toggleTaskList().run(),
      isActive: () => editor.isActive("taskList"),
    },
    {
      label: "`Code`",
      action: () => editor.chain().focus().toggleCode().run(),
      isActive: () => editor.isActive("code"),
    },
    {
      label: "```",
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: () => editor.isActive("codeBlock"),
    },
    {
      label: "─",
      action: () => editor.chain().focus().setHorizontalRule().run(),
      isActive: () => false,
    },
  ];

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b bg-neutral-50">
      {buttons.map((btn) => (
        <button
          key={btn.label}
          type="button"
          onClick={btn.action}
          className={`px-2 py-1 rounded text-sm font-mono transition-colors ${
            btn.isActive()
              ? "bg-neutral-900 text-white"
              : "hover:bg-neutral-200 text-neutral-700"
          }`}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
