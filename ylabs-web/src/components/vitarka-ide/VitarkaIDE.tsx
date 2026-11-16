import React, { useState, useEffect, useMemo } from "react";
import { TicketIDE } from "./TicketIDE";
import { VITARKA_PROJECT_TEMPLATES, type ProjectTemplate } from "./projectTemplates";
import {
  FolderPlus,
  Sparkles,
  ChevronDown,
  Flame,
  Boxes,
  Zap,
  Server,
  Atom,
  X,
  ArrowRight,
} from "lucide-react";

const STORAGE_KEY = "yuvro_vitarka_ide_active_template";
const STORAGE_FILES_KEY = "yuvro_vitarka_ide_saved_files";

export function VitarkaIDE({
  defaultTemplateId = "flask",
  headerActions,
}: {
  defaultTemplateId?: string;
  headerActions?: React.ReactNode;
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) || defaultTemplateId;
    }
    return defaultTemplateId;
  });

  const [projectFiles, setProjectFiles] = useState<Record<string, string>>(() => {
    const tpl =
      VITARKA_PROJECT_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
      VITARKA_PROJECT_TEMPLATES[0];

    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`${STORAGE_FILES_KEY}_${tpl.id}`);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load saved files", e);
      }
    }
    return { ...tpl.files };
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  const activeTemplate = useMemo(() => {
    return (
      VITARKA_PROJECT_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
      VITARKA_PROJECT_TEMPLATES[0]
    );
  }, [selectedTemplateId]);

  // Persist files when modified
  const handleCodeChange = (files: Record<string, string>) => {
    setProjectFiles(files);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          `${STORAGE_FILES_KEY}_${activeTemplate.id}`,
          JSON.stringify(files)
        );
      } catch (e) {
        console.error("Failed to persist files", e);
      }
    }
  };

  const handleSelectTemplate = (template: ProjectTemplate) => {
    setSelectedTemplateId(template.id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, template.id);
      try {
        const saved = localStorage.getItem(`${STORAGE_FILES_KEY}_${template.id}`);
        if (saved) {
          setProjectFiles(JSON.parse(saved));
          return;
        }
      } catch { }
    }
    setProjectFiles({ ...template.files });
  };

  // Build the ticket representation for the existing TicketIDE
  const ticket = useMemo(() => {
    return {
      id: `vitarka-${activeTemplate.id}`,
      title: activeTemplate.name,
      description: activeTemplate.description,
      tag: activeTemplate.tag,
      file: activeTemplate.file,
      starterPath: activeTemplate.file,
      startup_command: activeTemplate.startupCommand,
      tasks: [],
      status: "in_progress",
    };
  }, [activeTemplate]);

  const templateSelectorButton = (
    <button
      type="button"
      onClick={() => setIsModalOpen(true)}
      className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 flex items-center gap-1.5 transition-all shadow-xs"
      title="Create new project or switch framework"
    >
      <FolderPlus className="w-3.5 h-3.5" />
      <span>New Project / Stack</span>
      <ChevronDown className="w-3 h-3 text-muted-foreground" />
    </button>
  );

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative">
      <TicketIDE
        key={activeTemplate.id}
        slug={activeTemplate.tag}
        ticket={ticket}
        previewOverride={null}
        initialFiles={projectFiles}
        onCodeChange={handleCodeChange}
        newProjectButton={templateSelectorButton}
        headerActions={headerActions}
      />

      {/* New Project / Template Switcher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Yuvro Vitarka IDE · Projects
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Choose a project template or vibe code from scratch
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
              {VITARKA_PROJECT_TEMPLATES.map((tpl) => {
                const isSelected = tpl.id === selectedTemplateId;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => {
                      handleSelectTemplate(tpl);
                      setIsModalOpen(false);
                    }}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${isSelected
                      ? "border-primary bg-primary/10 shadow-xs"
                      : "border-border/70 bg-card/60 hover:bg-muted/40 hover:border-border"
                      }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-foreground">
                          {tpl.name}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {tpl.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {tpl.description}
                      </p>
                    </div>
                    <div className="pt-2 flex items-center text-[10px] text-primary font-medium">
                      <span>Launch Project</span>
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-3 border-t border-border bg-muted/10 flex justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium border border-border bg-background hover:bg-accent text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
