import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { questionBankService } from "@/services/questionBankService";
import { toast } from "sonner";
import { WizardProvider } from "./wizard/WizardContext";
import { WizardShell } from "./wizard/WizardShell";
import { WizardState } from "./wizard/types";

export interface QuestionBuilderProps {
  initialCategory?: "LAB" | "SYSTEM_DESIGN" | "KNOWLEDGE";
  category?: "LAB" | "SYSTEM_DESIGN" | "KNOWLEDGE";
  onCategoryChange?: (category: "LAB" | "SYSTEM_DESIGN" | "KNOWLEDGE") => void;
  step?: number;
  onStepChange?: (step: number) => void;
  editingId?: string | null;
  initialData?: any;
  courses?: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function QuestionBuilder({
  initialCategory = "LAB",
  category = "LAB",
  onCategoryChange,
  step,
  onStepChange,
  editingId,
  initialData,
  onClose,
  onSuccess,
}: QuestionBuilderProps) {
  const queryClient = useQueryClient();

  // Lab Mutations
  const createLabMutation = useMutation({
    mutationFn: (data: any) => questionBankService.createLabQuestion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labQuestions"] });
      onSuccess("Engineering lab question created successfully");
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Failed to create lab question";
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
    },
  });

  const updateLabMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      questionBankService.updateLabQuestion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labQuestions"] });
      onSuccess("Engineering lab question updated successfully");
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Failed to update lab question";
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
    },
  });

  // System Design Mutations
  const createSystemDesignMutation = useMutation({
    mutationFn: (data: any) => questionBankService.createSystemDesignQuestion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemDesignQuestions"] });
      onSuccess("System design challenge created successfully");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create system design challenge");
    },
  });

  const updateSystemDesignMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      questionBankService.updateSystemDesignQuestion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemDesignQuestions"] });
      onSuccess("System design challenge updated successfully");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update system design challenge");
    },
  });

  // Knowledge Assessment Mutations
  const createKnowledgeMutation = useMutation({
    mutationFn: (data: any) => questionBankService.createKnowledgeQuestion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledgeQuestions"] });
      onSuccess("Knowledge assessment created successfully");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create knowledge question");
    },
  });

  const updateKnowledgeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      questionBankService.updateKnowledgeQuestion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledgeQuestions"] });
      onSuccess("Knowledge assessment updated successfully");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update knowledge question");
    },
  });

  const isPublishing =
    createLabMutation.isPending ||
    updateLabMutation.isPending ||
    createSystemDesignMutation.isPending ||
    updateSystemDesignMutation.isPending ||
    createKnowledgeMutation.isPending ||
    updateKnowledgeMutation.isPending;

  // Publish handler transforming WizardState to API payload
  const handlePublish = (state: WizardState) => {
    if (state.type === "LAB" || (state.type as any) === "lab") {
      // 1. Language mapping
      const langMap: Record<string, string> = {
        "C": "C",
        "C++": "CPP",
        "Python": "PYTHON",
        "Java": "JAVA",
        "SQL": "SQL",
        "Bash": "BASH",
        "JavaScript": "JAVASCRIPT",
        "TypeScript": "TYPESCRIPT",
      };
      const programming_languages = Array.from(state.stack.lang).map(
        (l) => langMap[l] || l.toUpperCase().replace(/[^A-Z0-9_]/g, "_")
      );

      // 2. Database mapping
      const dbMap: Record<string, string> = {
        "SQLite": "SQLITE",
        "PostgreSQL": "POSTGRESQL",
        "MySQL": "MYSQL",
        "MongoDB": "MONGODB",
        "Redis": "REDIS",
        "Elasticsearch": "ELASTICSEARCH",
      };
      const databases = Array.from(state.stack.db).map(
        (d) => dbMap[d] || d.toUpperCase().replace(/[^A-Z0-9_]/g, "_")
      );

      // 3. Backend framework mapping
      const beMap: Record<string, string> = {
        "Django": "DJANGO",
        "Django REST Framework": "DJANGO_REST_FRAMEWORK",
        "FastAPI": "FASTAPI",
        "Flask": "FLASK",
        "Spring Boot": "SPRING_BOOT",
        "NodeJS": "NODEJS",
        "Express": "EXPRESS",
        "NestJS": "NESTJS",
      };
      const backend_frameworks = Array.from(state.stack.be).map(
        (b) => beMap[b] || b.toUpperCase().replace(/[^A-Z0-9_]/g, "_")
      );

      // 4. Frontend framework mapping
      const feMap: Record<string, string> = {
        "React": "REACT",
        "NextJS": "NEXTJS",
        "Vue": "VUE",
        "Angular": "ANGULAR",
      };
      const frontend_frameworks = Array.from(state.stack.fe).map(
        (f) => feMap[f] || f.toUpperCase().replace(/[^A-Z0-9_]/g, "_")
      );

      // 5. Domain mapping: strict adherence to Django choices (ERP, FINANCE, PAYMENT, SUPPLY_CHAIN, RETAIL, HEALTHCARE, INSURANCE, EDTECH, OTHER)
      const domainMap: Record<string, string> = {
        "Enterprise resource planning (ERP)": "ERP",
        "Finance": "FINANCE",
        "Payment": "PAYMENT",
        "Supply chain": "SUPPLY_CHAIN",
        "Healthcare": "HEALTHCARE",
        "Retail": "RETAIL",
        "E-commerce": "RETAIL",
        "EdTech": "EDTECH",
        "Insurance": "INSURANCE",
        "ERP": "ERP",
      };
      const domain = domainMap[state.f.domain] || "ERP";

      // 6. Scenario mapping
      const scenarioMap: Record<string, string> = {
        "Feature development": "FEATURE_DEVELOPMENT",
        "Debugging": "DEBUGGING",
        "Performance optimization": "PERFORMANCE_OPTIMIZATION",
        "Architecture": "ARCHITECTURE",
        "Production incident": "PRODUCTION_INCIDENT",
      };
      const scenario = scenarioMap[state.f.scenario] || "FEATURE_DEVELOPMENT";

      // 7. Role to Lab Type mapping
      const roleMap: Record<string, string> = {
        "Backend": "BACKEND",
        "Frontend": "FRONTEND",
        "Full stack": "FULL_STACK",
        "DevOps": "DEVOPS",
        "Data": "DATABASE",
        "BACKEND": "BACKEND",
        "FRONTEND": "FRONTEND",
        "FULL_STACK": "FULL_STACK",
        "DEVOPS": "DEVOPS",
        "DATABASE": "DATABASE",
      };
      const labType = roleMap[state.f.role] || "BACKEND";

      // 8. Prepared tasks
      const preparedTasks = state.t.tasks.map((t, idx) => ({
        id: t.id,
        order_index: idx,
        title: t.title,
        description: t.desc,
        marks: Number(t.marks),
        duration_minutes: Number(t.min),
        difficulty: t.diff.toUpperCase(),
        solution: { code: t.ref },
        parent_task_id: t.dep || null,
        parent_task: t.dep || null,
        scoring_rules: {
          parent_task_id: t.dep || null,
        },
      }));

      // Combined solution files map
      const solutionFiles: Record<string, string> = {};
      state.t.tasks.forEach((t, idx) => {
        solutionFiles[`solution_task_${idx + 1}.py`] = t.ref;
      });

      const payload = {
        title: state.f.title,
        description: state.f.desc,
        difficulty: (state.f.difficulty || "Easy").toUpperCase(),
        domain,
        type: labType,
        scenario,
        marks: Number(state.f.marks),
        duration_minutes: Number(state.f.dur),
        git_repo_starter_url: state.f.url,
        git_repo_starter_branch: state.f.branch || "main",
        startup_command: state.sc.startup,
        test_command: state.sc.test,
        allow_task_selection: state.sc.allow,
        allow_individual_task_selection: state.sc.allow,
        programming_languages,
        databases,
        backend_frameworks,
        frontend_frameworks,
        tasks: preparedTasks,
        scoring_rules: state.sc.rules?.files || {},
        solution: solutionFiles,
        github_app_installation: state.f.github_installation_id || state.f.github_app_installation || null,
        github_repo_id: state.f.github_repo_id || state.f.repo || null,
      };

      if (editingId) {
        updateLabMutation.mutate({ id: editingId, data: payload });
      } else {
        createLabMutation.mutate(payload);
      }
    } else if (state.type === "SYSTEM_DESIGN" || (state.type as any) === "design") {
      const payload = {
        title: state.f.title,
        description: state.f.desc,
        difficulty: (state.f.difficulty || "Easy").toUpperCase(),
        domain: "BACKEND",
        marks: Number(state.f.marks) || 30,
        duration_minutes: Number(state.f.dur) || 45,
        system_slug: state.f.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        scenario_type: "Distributed System",
        tasks: state.t.tasks.map((t, idx) => ({
          id: t.id || `t${idx + 1}`,
          title: t.title,
          description: t.desc || "",
          marks: Number(t.marks) || 10,
        })),
        constraints: [],
      };

      if (editingId) {
        updateSystemDesignMutation.mutate({ id: editingId, data: payload });
      } else {
        createSystemDesignMutation.mutate(payload);
      }
    } else {
      // KNOWLEDGE
      const payload = {
        title: state.f.title,
        content: state.f.desc,
        difficulty: (state.f.difficulty || "Easy").toUpperCase(),
        marks: Number(state.f.marks) || 10,
        duration_minutes: Number(state.f.dur) || 20,
        type: "MULTIPLE_CHOICE",
        topic: "General",
        options: [],
      };

      if (editingId) {
        updateKnowledgeMutation.mutate({ id: editingId, data: payload });
      } else {
        createKnowledgeMutation.mutate(payload);
      }
    }
  };

  return (
    <WizardProvider
      initialCategory={category || initialCategory || "LAB"}
      onCategoryChange={onCategoryChange}
      editingId={editingId}
      initialData={initialData}
      initialStep={step}
      onStepChange={onStepChange}
    >
      <WizardShell
        onCancel={onClose}
        onPublish={handlePublish}
        isPublishing={isPublishing}
      />
    </WizardProvider>
  );
}
