"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Code from "@tiptap/extension-code";
import CodeBlock from "@tiptap/extension-code-block";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";

type Props = { contentJson: string };

export default function PublicNoteViewer({ contentJson }: Props) {
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
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: JSON.parse(contentJson) as object,
    editable: false,
    immediatelyRender: false,
  });

  return (
    <EditorContent
      editor={editor}
      className="prose max-w-none [&_.ProseMirror]:outline-none"
    />
  );
}
