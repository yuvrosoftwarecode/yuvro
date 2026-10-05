import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FileCode2 } from 'lucide-react';
import { FileTreeNode } from '@/services/workspaceService';

export const FileTreeItem = ({ node, onSelect, selectedPath }: { 
    node: FileTreeNode; 
    onSelect: (path: string) => void;
    selectedPath: string | null;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const fullPath = node.path;

    if (node.type === 'directory') {
        return (
            <div>
                <div 
                    className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-accent text-foreground text-sm select-none"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <Folder className="w-3.5 h-3.5 text-blue-500" />
                    <span>{node.name}</span>
                </div>
                {isOpen && node.children && (
                    <div className="pl-4">
                        {node.children.map((child, i) => (
                            <FileTreeItem 
                                key={i} 
                                node={child} 
                                onSelect={onSelect} 
                                selectedPath={selectedPath}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div 
            className={`flex items-center gap-2 px-2 py-1 ml-4 cursor-pointer text-sm select-none
                ${selectedPath === fullPath ? 'bg-primary/20 text-primary' : 'hover:bg-accent text-muted-foreground hover:text-foreground'}`}
            onClick={() => onSelect(fullPath)}
        >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>{node.name}</span>
        </div>
    );
};
