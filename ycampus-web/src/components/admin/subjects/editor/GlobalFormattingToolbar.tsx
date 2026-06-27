import React from 'react';
import { useGlobalEditor } from '@/contexts/EditorContext';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered,
  Undo, Redo, Palette, FunctionSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Common symbols to insert
const MATH_SYMBOLS = ['±', '×', '÷', '√', '∑', '∫', '∞', 'π', 'θ', '≤', '≥', '≠', '≈'];
const SCIENCE_SYMBOLS = ['°C', '°F', 'µ', 'Ω', 'α', 'β', 'λ'];
const GENERAL_SYMBOLS = ['✓', '✔', '✗', '★', '☆', '→', '←', '↑', '↓'];

export const GlobalFormattingToolbar: React.FC = () => {
  const { activeEditor } = useGlobalEditor();

  // If no editor is focused, we still render the toolbar but disable the buttons
  // or we could dim it out. Let's dim it out and disable interactions.
  const isDisabled = !activeEditor;

  const insertSymbol = (symbol: string) => {
    if (activeEditor) {
      activeEditor.chain().focus().insertContent(symbol).run();
    }
  };

  const colors = ['#000000', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'];
  const highlightColors = ['transparent', '#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa'];

  return (
    <div className={`flex items-center bg-white/80 backdrop-blur-lg border border-slate-200 shadow-sm rounded-lg px-2 py-1 gap-1 transition-all duration-300 ${isDisabled ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
      
      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-md" onClick={() => activeEditor?.chain().focus().undo().run()} disabled={!activeEditor?.can().undo()}>
          <Undo className="w-4 h-4 text-slate-600" />
        </Button>
        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-md" onClick={() => activeEditor?.chain().focus().redo().run()} disabled={!activeEditor?.can().redo()}>
          <Redo className="w-4 h-4 text-slate-600" />
        </Button>
      </div>

      <div className="w-px h-5 bg-slate-200 mx-1" />

      {/* Basic Formatting */}
      <div className="flex items-center gap-0.5">
        <Button variant={activeEditor?.isActive('bold') ? 'secondary' : 'ghost'} size="icon" className="w-8 h-8 rounded-md" onClick={() => activeEditor?.chain().focus().toggleBold().run()}>
          <Bold className="w-4 h-4 text-slate-700" />
        </Button>
        <Button variant={activeEditor?.isActive('italic') ? 'secondary' : 'ghost'} size="icon" className="w-8 h-8 rounded-md" onClick={() => activeEditor?.chain().focus().toggleItalic().run()}>
          <Italic className="w-4 h-4 text-slate-700" />
        </Button>
        <Button variant={activeEditor?.isActive('underline') ? 'secondary' : 'ghost'} size="icon" className="w-8 h-8 rounded-md" onClick={() => activeEditor?.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="w-4 h-4 text-slate-700" />
        </Button>
        <Button variant={activeEditor?.isActive('strike') ? 'secondary' : 'ghost'} size="icon" className="w-8 h-8 rounded-md" onClick={() => activeEditor?.chain().focus().toggleStrike().run()}>
          <Strikethrough className="w-4 h-4 text-slate-700" />
        </Button>
      </div>

      <div className="w-px h-5 bg-slate-200 mx-1" />

      {/* Colors */}
      <div className="flex items-center gap-0.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-md relative">
              <Palette className="w-4 h-4 text-slate-700" />
              <div className="absolute bottom-1.5 w-3 h-0.5 rounded-full" style={{ backgroundColor: activeEditor?.getAttributes('textStyle').color || '#000' }} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48 p-2 grid grid-cols-5 gap-1">
            {colors.map(c => (
              <div key={c} onClick={() => activeEditor?.chain().focus().setColor(c).run()} className="w-7 h-7 rounded-md cursor-pointer border border-slate-200 hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="w-px h-5 bg-slate-200 mx-1" />

      {/* Alignment */}
      <div className="flex items-center gap-0.5">
        <Button variant={activeEditor?.isActive({ textAlign: 'left' }) ? 'secondary' : 'ghost'} size="icon" className="w-8 h-8 rounded-md" onClick={() => activeEditor?.chain().focus().setTextAlign('left').run()}>
          <AlignLeft className="w-4 h-4 text-slate-700" />
        </Button>
        <Button variant={activeEditor?.isActive({ textAlign: 'center' }) ? 'secondary' : 'ghost'} size="icon" className="w-8 h-8 rounded-md" onClick={() => activeEditor?.chain().focus().setTextAlign('center').run()}>
          <AlignCenter className="w-4 h-4 text-slate-700" />
        </Button>
        <Button variant={activeEditor?.isActive({ textAlign: 'right' }) ? 'secondary' : 'ghost'} size="icon" className="w-8 h-8 rounded-md" onClick={() => activeEditor?.chain().focus().setTextAlign('right').run()}>
          <AlignRight className="w-4 h-4 text-slate-700" />
        </Button>
        <Button variant={activeEditor?.isActive({ textAlign: 'justify' }) ? 'secondary' : 'ghost'} size="icon" className="w-8 h-8 rounded-md" onClick={() => activeEditor?.chain().focus().setTextAlign('justify').run()}>
          <AlignJustify className="w-4 h-4 text-slate-700" />
        </Button>
      </div>

      <div className="w-px h-5 bg-slate-200 mx-1" />

      {/* Lists */}
      <div className="flex items-center gap-0.5">
        <Button variant={activeEditor?.isActive('bulletList') ? 'secondary' : 'ghost'} size="icon" className="w-8 h-8 rounded-md" onClick={() => activeEditor?.chain().focus().toggleBulletList().run()}>
          <List className="w-4 h-4 text-slate-700" />
        </Button>
        <Button variant={activeEditor?.isActive('orderedList') ? 'secondary' : 'ghost'} size="icon" className="w-8 h-8 rounded-md" onClick={() => activeEditor?.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-4 h-4 text-slate-700" />
        </Button>
      </div>

      <div className="w-px h-5 bg-slate-200 mx-1" />

      {/* Symbols */}
      <div className="flex items-center gap-0.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-md" title="Insert Symbol">
              <FunctionSquare className="w-4 h-4 text-slate-700" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 p-3">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Math</p>
                <div className="grid grid-cols-6 gap-1">
                  {MATH_SYMBOLS.map(sym => (
                    <button key={sym} onClick={() => insertSymbol(sym)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-sm font-medium transition-colors">
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Science</p>
                <div className="grid grid-cols-6 gap-1">
                  {SCIENCE_SYMBOLS.map(sym => (
                    <button key={sym} onClick={() => insertSymbol(sym)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-sm font-medium transition-colors">
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">General</p>
                <div className="grid grid-cols-6 gap-1">
                  {GENERAL_SYMBOLS.map(sym => (
                    <button key={sym} onClick={() => insertSymbol(sym)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-sm font-medium transition-colors">
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

    </div>
  );
};
