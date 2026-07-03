import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import { useGlobalEditor } from "@/contexts/EditorContext";

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minimal?: boolean;
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content,
  onChange,
  placeholder,
  className = "",
  minimal = false,
}) => {
  const { setActiveEditor, activeEditor } = useGlobalEditor();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        underline: false,
        link: false,
      }),
      Underline,
      TextAlign.configure({
        types: ["paragraph"],
      }),
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-indigo-600 underline cursor-pointer",
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none ${minimal ? "p-0 min-h-0" : "min-h-[100px] p-3"} ${className}`,
        placeholder: placeholder || "Type something...",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onFocus: ({ editor }) => {
      setActiveEditor(editor);
    },
  });

  // Ensure if this editor unmounts while active, we clear it
  useEffect(() => {
    return () => {
      if (activeEditor === editor) {
        setActiveEditor(null);
      }
    };
  }, [activeEditor, editor, setActiveEditor]);

  return (
    <div
      className={`${minimal ? "w-full" : "border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-300 transition-all"}`}
    >
      <EditorContent editor={editor} />
    </div>
  );
};
