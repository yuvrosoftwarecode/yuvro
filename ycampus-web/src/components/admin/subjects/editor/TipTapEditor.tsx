import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Link as LinkIcon
} from 'lucide-react';

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  const toggleLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    if (previousUrl) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    const url = window.prompt('URL');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-50 border-b border-slate-200 rounded-t-lg">
      <div className="flex gap-0.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded text-slate-600 hover:bg-slate-200 ${editor.isActive('bold') ? 'bg-slate-200 text-indigo-700' : ''}`}
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded text-slate-600 hover:bg-slate-200 ${editor.isActive('italic') ? 'bg-slate-200 text-indigo-700' : ''}`}
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded text-slate-600 hover:bg-slate-200 ${editor.isActive('underline') ? 'bg-slate-200 text-indigo-700' : ''}`}
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded text-slate-600 hover:bg-slate-200 ${editor.isActive('strike') ? 'bg-slate-200 text-indigo-700' : ''}`}
        >
          <Strikethrough className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-5 bg-slate-300 mx-1"></div>

      <div className="flex gap-0.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-1.5 rounded text-slate-600 hover:bg-slate-200 ${editor.isActive({ textAlign: 'left' }) ? 'bg-slate-200 text-indigo-700' : ''}`}
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-1.5 rounded text-slate-600 hover:bg-slate-200 ${editor.isActive({ textAlign: 'center' }) ? 'bg-slate-200 text-indigo-700' : ''}`}
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-1.5 rounded text-slate-600 hover:bg-slate-200 ${editor.isActive({ textAlign: 'right' }) ? 'bg-slate-200 text-indigo-700' : ''}`}
        >
          <AlignRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={`p-1.5 rounded text-slate-600 hover:bg-slate-200 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-slate-200 text-indigo-700' : ''}`}
        >
          <AlignJustify className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-5 bg-slate-300 mx-1"></div>

      <div className="flex gap-0.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded text-slate-600 hover:bg-slate-200 ${editor.isActive('bulletList') ? 'bg-slate-200 text-indigo-700' : ''}`}
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded text-slate-600 hover:bg-slate-200 ${editor.isActive('orderedList') ? 'bg-slate-200 text-indigo-700' : ''}`}
        >
          <ListOrdered className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-5 bg-slate-300 mx-1"></div>

      <div className="flex gap-0.5">
        <button
          type="button"
          onClick={toggleLink}
          className={`p-1.5 rounded text-slate-600 hover:bg-slate-200 ${editor.isActive('link') ? 'bg-slate-200 text-indigo-700' : ''}`}
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        
        <div className="flex items-center gap-1 px-1 border border-slate-300 rounded ml-1 bg-white">
          <input
            type="color"
            onInput={(event: any) => editor.chain().focus().setColor(event.target.value).run()}
            value={editor.getAttributes('textStyle').color || '#000000'}
            className="w-5 h-5 cursor-pointer border-0 p-0"
          />
        </div>
      </div>
    </div>
  );
};

export const TipTapEditor: React.FC<TipTapEditorProps> = ({ content, onChange, placeholder, className = '' }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      TextAlign.configure({
        types: ['paragraph'],
      }),
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-indigo-600 underline cursor-pointer',
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none min-h-[100px] p-3 ${className}`,
        placeholder: placeholder || 'Type something...',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-300 transition-all">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};
