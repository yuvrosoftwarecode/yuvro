import React, { useState, useMemo } from "react";
import { TicketIDE } from "./TicketIDE";
import {
  VITARKA_PROJECT_TEMPLATES,
  type ProjectTemplate,
  type QuestionCategory,
} from "./projectTemplates";
import {
  FolderPlus,
  Sparkles,
  ChevronDown,
  Layers,
  Cpu,
  Database,
  X,
  ArrowRight,
  Code2,
} from "lucide-react";

const STORAGE_KEY = "yuvro_vitarka_ide_active_template";
const STORAGE_FILES_KEY = "yuvro_vitarka_ide_saved_files";

const CATEGORIES: Array<{
  id: QuestionCategory;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  {
    id: "project",
    label: "Projects & Full-Stack",
    shortLabel: "Projects",
    icon: Layers,
    description: "Multi-file apps (Flask, Django, FastAPI, Express, React) with workspace test runners",
  },
  {
    id: "dsa",
    label: "Data Structures & Algo",
    shortLabel: "DSA",
    icon: Cpu,
    description: "Algorithmic challenges with automated input/output test case suites",
  },
  {
    id: "database",
    label: "Databases & SQL",
    shortLabel: "Databases",
    icon: Database,
    description: "Relational and analytical SQL querying against live databases",
  },
];

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

  const activeTemplate = useMemo(() => {
    return (
      VITARKA_PROJECT_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
      VITARKA_PROJECT_TEMPLATES[0]
    );
  }, [selectedTemplateId]);

  const [activeCategory, setActiveCategory] = useState<QuestionCategory>(
    activeTemplate.category || "project"
  );

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
    setActiveCategory(template.category);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, template.id);
      try {
        const saved = localStorage.getItem(`${STORAGE_FILES_KEY}_${template.id}`);
        if (saved) {
          setProjectFiles(JSON.parse(saved));
          return;
        }
      } catch {}
    }
    setProjectFiles({ ...template.files });
  };

  // Build the ticket representation for TicketIDE
  const ticket = useMemo(() => {
    const isDsa = activeTemplate.category === "dsa";
    const isDatabase = activeTemplate.category === "database";
    const isProject = activeTemplate.category === "project";

    return {
      id: `vitarka-${activeTemplate.id}`,
      title: activeTemplate.name,
      description: activeTemplate.description,
      tag: activeTemplate.tag,
      file: activeTemplate.file,
      starterPath: activeTemplate.file,
      starter_path: activeTemplate.file,
      startup_command: activeTemplate.startupCommand || "",
      test_command: isProject ? (activeTemplate.testCommand || "pytest test_app.py") : "",
      tasks: isDsa ? (activeTemplate.tasks || []) : [],
      status: "in_progress",
      ticket_type: isDsa ? "algo" : isDatabase ? "database" : "project",
      type: isDsa ? "algo" : isDatabase ? "database" : "project",
      domain: isDatabase ? "DATABASE" : isDsa ? "ALGO" : "FULL_STACK",
      category: activeTemplate.category,
      isVitarka: true,
    };
  }, [activeTemplate]);

  const filteredTemplates = useMemo(() => {
    return VITARKA_PROJECT_TEMPLATES.filter((t) => t.category === activeCategory);
  }, [activeCategory]);

  const templateSelectorButton = (
    <button
      type="button"
      onClick={() => {
        setActiveCategory(activeTemplate.category);
        setIsModalOpen(true);
      }}
      className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
      title="Choose question type: Projects, Data Structures & Algo, or Databases"
    >
      <FolderPlus className="w-3.5 h-3.5" />
      <span className="font-semibold text-foreground/80">
        {activeTemplate.category === "dsa"
          ? "DSA"
          : activeTemplate.category === "database"
          ? "Database"
          : "Project"}
        :
      </span>
      <span className="max-w-[140px] truncate text-foreground">{activeTemplate.name}</span>
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

      {/* Question Type & Template Switcher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Vitarka Practice Lab Studio
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Select a question category and template to practice
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Switcher Tabs */}
            <div className="px-6 pt-3 pb-2 border-b border-border bg-muted/10 flex items-center gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isCatActive = activeCategory === cat.id;
                const count = VITARKA_PROJECT_TEMPLATES.filter((t) => t.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                      isCatActive
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-card/70 text-muted-foreground hover:text-foreground border-border hover:bg-accent/60"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isCatActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Questions / Templates List */}
            <div className="p-6 grid grid-cols-2 gap-3 max-h-[58vh] overflow-y-auto">
              {filteredTemplates.map((tpl) => {
                const isSelected = tpl.id === selectedTemplateId;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => {
                      handleSelectTemplate(tpl);
                      setIsModalOpen(false);
                    }}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40"
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

                    <div className="pt-3 border-t border-border/40 mt-3 flex items-center justify-between text-[10.5px]">
                      <span className="text-muted-foreground font-mono">
                        {tpl.category === "dsa"
                          ? `${tpl.tasks?.length || 0} Test Cases`
                          : tpl.category === "database"
                          ? "SQL · SQLite"
                          : tpl.testCommand || "pytest"}
                      </span>
                      <div className="flex items-center text-primary font-medium">
                        <span>Launch</span>
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-border bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {activeCategory === "project" && "Runs via workspace run_test_command (http://localhost:8009/workspace/run_test_command)"}
                {activeCategory === "dsa" && "Runs via execute-with-tests (http://localhost:8009/execute-with-tests)"}
                {activeCategory === "database" && "Runs via database_run (http://localhost:8009/workspace/database_run)"}
              </span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium border border-border bg-background hover:bg-accent text-foreground cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
