import React, { useState } from 'react';
import { Library, Settings2, ChevronRight, ChevronLeft } from 'lucide-react';
import { BlockLibraryPanel } from './BlockLibraryPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { Block } from './BlockRegistry';

interface EditorSidebarProps {
  onAdd: (type: string) => void;
  selectedBlock: Block | null;
  onUpdateBlock: (id: string, updates: Partial<Block>) => void;
}

export const EditorSidebar: React.FC<EditorSidebarProps> = ({ onAdd, selectedBlock, onUpdateBlock }) => {
  const [activeTab, setActiveTab] = useState<'library' | 'properties'>('library');
  const [isCollapsed, setIsCollapsed] = useState(false);

  React.useEffect(() => {
    if (selectedBlock) {
      setActiveTab('properties');
      setIsCollapsed(false); 
    } else {
      setActiveTab('library');
    }
  }, [selectedBlock?.id]);

  if (isCollapsed) {
    return (
      <div className="w-12 shrink-0 bg-white border-l border-slate-200 flex flex-col h-full shadow-[0_0_15px_rgba(0,0,0,0.02)] z-10 relative items-center py-4">
        <button onClick={() => setIsCollapsed(false)} className="h-8 w-8 text-slate-500 hover:text-indigo-600 flex justify-center items-center">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="mt-8">
          <Library className="w-5 h-5 text-slate-400" />
        </div>
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-6" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
          Block Editor
        </span>
      </div>
    );
  }

  return (
    <div className="w-72 shrink-0 bg-white border-l border-slate-200 flex flex-col h-full shadow-[0_0_15px_rgba(0,0,0,0.02)] z-10 relative">
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('library')}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'library'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-700 bg-slate-50/50'
          }`}
        >
          <Library className="w-4 h-4" />
          Library
        </button>
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors border-r border-slate-100 ${
            activeTab === 'properties'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-700 bg-slate-50/50'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          Properties
        </button>
        <button
          onClick={() => setIsCollapsed(true)}
          className="w-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          title="Collapse Sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'library' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <BlockLibraryPanel onAdd={onAdd} />
        </div>
        
        <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'properties' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          {selectedBlock ? (
            <PropertiesPanel 
              block={selectedBlock} 
              onChange={(updates) => onUpdateBlock(selectedBlock.id, updates)} 
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500">
              <Settings2 className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-sm font-medium">No block selected</p>
              <p className="text-xs mt-1">Select a block in the editor to view and edit its properties.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
