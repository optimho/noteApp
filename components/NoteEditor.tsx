"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Code from "@tiptap/extension-code";
import CodeBlock from "@tiptap/extension-code-block";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Toolbar from "./Toolbar";
import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

export type NoteEditorHandle = {
  insertText: (text: string) => void;
};

type Props = {
  initialContent: string;
  onChangeAction: (json: unknown) => void;
};

const NoteEditor = forwardRef<NoteEditorHandle, Props>(function NoteEditor(
  { initialContent, onChangeAction },
  ref
) {
  const onChangeRef = useRef(onChangeAction);
  onChangeRef.current = onChangeAction;

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
        HTMLAttributes: {
          class: "task-item-flex",
        },
      }),
    ],
    content: initialContent ? JSON.parse(initialContent) : { type: "doc", content: [] },
    onUpdate: ({ editor }: { editor: any }) => {
      const json = editor.getJSON();
      onChangeRef.current(json);
    },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose-task-lists",
      },
    },
  } as any);

  useImperativeHandle(ref, () => ({
    insertText(text: string) {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .insertContentAt(editor.state.doc.content.size, {
          type: "paragraph",
          content: [{ type: "text", text }],
        })
        .run();
    },
  }));

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  return (
    <div>
      <Toolbar editor={editor} />
      <div
        className="overflow-y-auto max-h-[50vh] cursor-text"
        onClick={() => editor?.commands.focus()}
      >
        <EditorContent
          editor={editor}
          className="prose max-w-none p-4 min-h-[150px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:my-0 [&_.ProseMirror_p]:leading-normal [&_.ProseMirror_ul]:my-1 [&_.ProseMirror_ol]:my-1 [&_.ProseMirror_li]:my-0"
        />
      </div>
    </div>
  );
});

export default NoteEditor;
