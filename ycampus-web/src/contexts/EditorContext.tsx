import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Editor } from '@tiptap/react';

interface EditorContextType {
  activeEditor: Editor | null;
  setActiveEditor: (editor: Editor | null) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const EditorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);

  return (
    <EditorContext.Provider value={{ activeEditor, setActiveEditor }}>
      {children}
    </EditorContext.Provider>
  );
};

export const useGlobalEditor = () => {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useGlobalEditor must be used within an EditorProvider');
  }
  return context;
};
