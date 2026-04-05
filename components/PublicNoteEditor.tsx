"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Code from "@tiptap/extension-code";
import CodeBlock from "@tiptap/extension-code-block";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Toolbar from "./Toolbar";
import { useRef, useState, useEffect } from "react";

type Props = { contentJson: string; slug: string };

export default function PublicNoteEditor({ contentJson, slug }: Props) {
  const [saved, setSaved] = useState(true);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        code: false,
        codeBlock: false,
      }),
      Code,
      CodeBlock,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: JSON.parse(contentJson) as object,
    immediatelyRender: false,
    onUpdate: ({ editor }: { editor: any }) => {
      const json = editor.getJSON();
      setSaved(false);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(async () => {
        await fetch(`/api/public-notes/${slug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentJson: json }),
        });
        setSaved(true);
      }, 800);
    },
  } as any);

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-neutral-50">
        <Toolbar editor={editor} />
        <span className="text-xs text-neutral-400 shrink-0 ml-2">
          {saved ? "Saved" : "Saving…"}
        </span>
      </div>
      <EditorContent
        editor={editor}
        className="prose max-w-none p-4 min-h-[400px] [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:my-0 [&_.ProseMirror_p]:leading-normal"
      />
    </div>
  );
}