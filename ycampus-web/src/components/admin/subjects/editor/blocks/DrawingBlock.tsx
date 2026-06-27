import React from 'react';
import { Block } from '../BlockRegistry';
import { Pencil } from 'lucide-react';

interface DrawingBlockProps {
  block: Block;
  onChange: (updates: Partial<Block>) => void;
}

export const DrawingBlock: React.FC<DrawingBlockProps> = ({ block }) => {
  return (
    <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center justify-center gap-3 min-h-[160px] text-center">
      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
        <Pencil className="w-6 h-6 text-slate-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-600">Drawing Block</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {block.metadata?.excalidrawElements?.length
            ? `${block.metadata.excalidrawElements.length} element(s) saved`
            : 'No drawing yet — Excalidraw integration pending package install'}
        </p>
      </div>
    </div>
  );
};
