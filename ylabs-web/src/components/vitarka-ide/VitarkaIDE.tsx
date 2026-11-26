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
    label: "Python Framework",
    shortLabel: "Python Framework",
    icon: Layers,
    description: "Full-stack Python frameworks: Flask, FastAPI, and Django with base scaffolding and workspace runners",
  },
  {
    id: "dsa",
    label: "Data Structures",
    shortLabel: "DataStructures",
    icon: Cpu,
    description: "Algorithmic challenges and data structures with automated input/output test suites",
  },
  {
    id: "database",
    label: "SQL",
    shortLabel: "SQL",
    icon: Database,
    description: "Relational database querying & schema design against live SQL engines",
  },
];

export function VitarkaIDE({
  defaultTemplateId = "flask",
  headerActions,
}: {
  defaultTemplateId?: string;
  headerActions?: React.ReactNode;
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) || null;
    }
    return null;
  });

  const activeTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return (
      VITARKA_PROJECT_TEMPLATES.find((t) => t.id === selectedTemplateId) || null
    );
  }, [selectedTemplateId]);

  const [activeCategory, setActiveCategory] = useState<QuestionCategory>(
    activeTemplate?.category || "project"
  );

  const [projectFiles, setProjectFiles] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        try {
          const saved = localStorage.getItem(`${STORAGE_FILES_KEY}_${savedId}`);
          if (saved) return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to load saved files", e);
        }
      }
    }
    return {};
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [appName, setAppName] = useState("");
  const [selectedTemplateForCreation, setSelectedTemplateForCreation] = useState<ProjectTemplate | null>(() => {
    return VITARKA_PROJECT_TEMPLATES.find((t) => t.id === "flask") || VITARKA_PROJECT_TEMPLATES[0];
  });
  const [nameError, setNameError] = useState("");

  // Persist files when modified
  const handleCodeChange = (files: Record<string, string>) => {
    setProjectFiles(files);
    if (typeof window !== "undefined" && activeTemplate) {
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

  const handleSelectTemplate = (template: ProjectTemplate, customFiles?: Record<string, string>) => {
    setSelectedTemplateId(template.id);
    setActiveCategory(template.category);
    const filesToSet = customFiles || { ...template.files };
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, template.id);
      try {
        localStorage.setItem(`${STORAGE_FILES_KEY}_${template.id}`, JSON.stringify(filesToSet));
      } catch {}
    }
    setProjectFiles(filesToSet);
  };

  // Build the ticket representation for TicketIDE
  const ticket = useMemo(() => {
    if (!activeTemplate) {
      return {
        id: "vitarka-empty",
        title: "Vitarka IDE — Empty Project",
        description: "Click New Project to select a framework or category and initialize starter code and skills.",
        tag: "project",
        file: "",
        starterPath: "",
        starter_path: "",
        startup_command: "",
        test_command: "",
        tasks: [],
        status: "in_progress",
        ticket_type: "project",
        type: "project",
        domain: "FULL_STACK",
        category: "project",
        isVitarka: true,
      };
    }

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
      test_command: isProject ? (activeTemplate.testCommand || "pytest") : "",
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
    if (activeCategory === "project") {
      return VITARKA_PROJECT_TEMPLATES.filter((t) => ["flask", "fastapi", "django"].includes(t.id));
    }
    return VITARKA_PROJECT_TEMPLATES.filter((t) => t.category === activeCategory);
  }, [activeCategory]);

  const handleCreateNewProject = (templateToUse?: ProjectTemplate) => {
    const tpl = templateToUse || selectedTemplateForCreation || filteredTemplates[0];
    const trimmedName = appName.trim();
    if (!trimmedName) {
      setNameError("Application name is mandatory to generate project code.");
      return;
    }
    setNameError("");

    const appDir = trimmedName.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const sanitizedId = trimmedName.toLowerCase().replace(/[^a-z0-9_-]/g, "-");

    // Scope starter code inside application_name directory and add skills
    const scopedFiles: Record<string, string> = {};

    Object.entries(tpl.files).forEach(([filePath, content]) => {
      // Skills remain in project root .yuvro-developer/skills/ for AI Mentor discovery
      if (filePath.startsWith(".yuvro-developer/")) {
        scopedFiles[filePath] = content;
      } else {
        // Starter code scoped inside application_name/
        const targetPath = `${appDir}/${filePath}`;
        scopedFiles[targetPath] = content;
      }
    });

    // Ensure dedicated framework skill exists
    const skillPath = `.yuvro-developer/skills/${tpl.id}/SKILL.md`;
    if (!scopedFiles[skillPath]) {
      scopedFiles[skillPath] = `---
name: ${tpl.id}-development
description: Project architecture, skills, and coding standards for ${tpl.name} inside ${appDir}.
---

# ${tpl.name} Skill Guide

## Scaffolding & Directory Structure
- All application source code is generated in \`${appDir}/\`.
- Framework startup: \`cd ${appDir} && ${tpl.startupCommand || "python main.py"}\`
- Testing: \`cd ${appDir} && ${tpl.testCommand || "pytest"}\`

## Coding Standards
1. Modular Architecture: keep controllers/routes, models, and tests organized.
2. Direct diffs: AI Mentor provides clean, target-scoped diffs.
`;
    }

    // Add root README explaining setup
    scopedFiles["README.md"] = `# ${trimmedName} (${tpl.name})

Initialized in Yuvro Vitarka IDE.
- Application directory: \`${appDir}/\`
- Framework: ${tpl.name}
- Starter command: \`${tpl.startupCommand || "python app.py"}\`
- Testing command: \`${tpl.testCommand || "pytest"}\`

Use **AI Mentor** in Plan or Agent mode to generate features inside \`${appDir}/\`.
`;

    const primaryFile = Object.keys(scopedFiles).find(
      (f) => f.startsWith(`${appDir}/`) && !f.endsWith(".md") && !f.includes(".yuvro-developer/")
    ) || Object.keys(scopedFiles)[0] || "";

    const newTpl: ProjectTemplate = {
      ...tpl,
      id: `${tpl.id}-${sanitizedId}`,
      name: `${trimmedName} (${tpl.name})`,
      file: primaryFile,
      startupCommand: tpl.startupCommand ? `cd ${appDir} && ${tpl.startupCommand}` : "",
      testCommand: tpl.testCommand ? `cd ${appDir} && ${tpl.testCommand}` : "",
      files: scopedFiles,
    };

    handleSelectTemplate(newTpl, scopedFiles);
    setIsModalOpen(false);
    setAppName("");
    setNameError("");
  };

  const templateSelectorButton = (
    <button
      type="button"
      onClick={() => {
        setIsModalOpen(true);
        setNameError("");
      }}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#f7931e] hover:bg-[#e5820f] active:bg-[#d6750d] text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
      title="Create New Project (DataStructures, SQL, Python Framework: Flask, FastAPI, Django)"
    >
      <FolderPlus className="w-3.5 h-3.5" />
      <span>New Project</span>
    </button>
  );

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative">
      <TicketIDE
        key={activeTemplate?.id || "empty"}
        slug={activeTemplate?.tag || activeTemplate?.id || "empty"}
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
                <div className="w-8 h-8 rounded-lg bg-[#f7931e]/15 text-[#f7931e] flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    New Project
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Choose category and framework command to set up base application
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

            {/* Application Name Input (Mandatory) */}
            <div className="px-6 py-3 border-b border-border bg-card/40 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span>Application Name</span>
                  <span className="text-red-500 font-bold">*</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  All source code will be generated inside this folder
                </span>
              </label>
              <input
                type="text"
                value={appName}
                onChange={(e) => {
                  setAppName(e.target.value);
                  if (e.target.value.trim()) setNameError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateNewProject();
                  }
                }}
                placeholder="e.g. my_ecommerce_app, order_management..."
                className={`w-full px-3 py-1.5 text-xs bg-muted/50 border rounded-lg focus:outline-none focus:ring-1 text-foreground placeholder:text-muted-foreground/60 transition-all ${
                  nameError
                    ? "border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-500/5"
                    : "border-border focus:ring-[#f7931e] focus:border-[#f7931e]"
                }`}
                autoFocus
              />
              {nameError && (
                <span className="text-[11px] text-red-500 font-medium">
                  {nameError}
                </span>
              )}
            </div>

            {/* Category Switcher Tabs */}
            <div className="px-6 pt-3 pb-2 border-b border-border bg-muted/10 flex items-center gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isCatActive = activeCategory === cat.id;
                const count = (cat.id === "project" ? ["flask", "fastapi", "django"] : VITARKA_PROJECT_TEMPLATES.filter((t) => t.category === cat.id)).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      const matching = VITARKA_PROJECT_TEMPLATES.filter((t) => (cat.id === "project" ? ["flask", "fastapi", "django"].includes(t.id) : t.category === cat.id));
                      if (matching.length > 0) setSelectedTemplateForCreation(matching[0]);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                      isCatActive
                        ? "bg-[#f7931e] text-white border-[#f7931e] shadow-xs"
                        : "bg-card/70 text-muted-foreground hover:text-foreground border-border hover:bg-accent/60"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isCatActive
                          ? "bg-white/20 text-white"
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
            <div className="p-6 grid grid-cols-2 gap-3 max-h-[46vh] overflow-y-auto">
              {filteredTemplates.map((tpl) => {
                const isSelected = selectedTemplateForCreation?.id === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => {
                      setSelectedTemplateForCreation(tpl);
                      setNameError("");
                    }}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? "border-[#f7931e] bg-[#f7931e]/10 shadow-xs ring-1 ring-[#f7931e]/50"
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
                          : tpl.startupCommand || "python app.py"}
                      </span>
                      <div className="flex items-center text-[#f7931e] font-semibold">
                        <span>{isSelected ? "Selected ✓" : "Select"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer with Create Project button */}
            <div className="px-6 py-3 border-t border-border bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
              <span className="truncate max-w-[280px]">
                {selectedTemplateForCreation ? (
                  <span className="font-medium text-foreground">
                    Selected: <span className="text-[#f7931e]">{selectedTemplateForCreation.name}</span>
                  </span>
                ) : (
                  "Select a framework / template"
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateNewProject()}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#f7931e] hover:bg-[#e5820f] active:bg-[#d6750d] text-white flex items-center gap-1.5 shadow-sm cursor-pointer transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Create Project</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
