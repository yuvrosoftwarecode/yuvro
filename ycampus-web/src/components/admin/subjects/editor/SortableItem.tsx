import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export const SortableItem: React.FC<SortableItemProps> = ({ 
  id, 
  children, 
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group flex gap-2 w-full">
      <div 
        className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700"
        {...attributes} 
        {...listeners}
      >
        <GripVertical className="w-5 h-5" />
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-300">
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded-md shadow-sm border border-slate-100 px-1 py-0.5 z-10">
          <Button variant="ghost" size="icon" onClick={onMoveUp} disabled={isFirst} className="h-6 w-6 text-slate-400 hover:text-slate-800">
            <ArrowUp className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onMoveDown} disabled={isLast} className="h-6 w-6 text-slate-400 hover:text-slate-800">
            <ArrowDown className="w-3 h-3" />
          </Button>
          <div className="w-px h-3 bg-slate-300 mx-0.5"></div>
          <Button variant="ghost" size="icon" onClick={onRemove} className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
        
        {children}
      </div>
    </div>
  );
};
