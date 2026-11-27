// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QuestionBuilder } from "@/components/recruiter/QuestionBuilder";
import { fetchCourses, fetchQuestionDetails } from "@/lib/recruiter";
import { questionBankService } from "@/services/questionBankService";
import LoadingSkeleton from "@/components/common/LoadingSkeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/recruiter/questions/new")({
  validateSearch: (search: Record<string, unknown>) => {
    const raw = typeof search.category === "string" ? search.category.toUpperCase() : "LAB";
    const category: "LAB" | "SYSTEM_DESIGN" | "KNOWLEDGE" =
      raw === "SYSTEM_DESIGN" || raw === "KNOWLEDGE" ? raw : "LAB";
    const rawStep =
      typeof search.step === "number"
        ? search.step
        : typeof search.step === "string" && !isNaN(Number(search.step))
        ? parseInt(search.step, 10)
        : undefined;
    const step = rawStep && rawStep >= 1 && rawStep <= 4 ? rawStep : undefined;
    return {
      category,
      edit: typeof search.edit === "string" ? search.edit : undefined,
      step,
    };
  },
  head: () => ({
    meta: [
      { title: "New Question — Yuvro Recruiter" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RecruiterNewQuestionPage,
});

function RecruiterNewQuestionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const rawCat = (search?.category || urlParams?.get("category") || "LAB").toUpperCase();
  const category: "LAB" | "SYSTEM_DESIGN" | "KNOWLEDGE" =
    rawCat === "SYSTEM_DESIGN" || rawCat === "KNOWLEDGE" ? rawCat : "LAB";
  const edit = search?.edit || urlParams?.get("edit") || undefined;
  const rawStep =
    search?.step ||
    (urlParams?.get("step") && !isNaN(Number(urlParams.get("step")))
      ? parseInt(urlParams.get("step")!, 10)
      : undefined);
  const step = rawStep && rawStep >= 1 && rawStep <= 4 ? rawStep : undefined;

  const handleCategoryChange = (newCat: "LAB" | "SYSTEM_DESIGN" | "KNOWLEDGE") => {
    navigate({
      to: "/recruiter/questions/new",
      search: (prev: any) => ({
        ...prev,
        category: newCat,
        step: 1,
      }),
      replace: true,
    });
  };

  const handleStepChange = (newStep: number) => {
    navigate({
      to: "/recruiter/questions/new",
      search: (prev: any) => ({
        ...prev,
        step: newStep,
      }),
      replace: true,
    });
  };

  const { data: courses = [], isLoading: isLoadingCourses } = useQuery({
    queryKey: ["courses"],
    queryFn: fetchCourses,
    staleTime: 5 * 60 * 1000,
  });

  const [initialData, setInitialData] = useState<any>(null);
  const [loadingInitialData, setLoadingInitialData] = useState<boolean>(Boolean(edit));
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!edit) {
      setInitialData(null);
      setLoadingInitialData(false);
      return;
    }

    let isMounted = true;
    setLoadingInitialData(true);
    setLoadError(null);

    const loadData = async () => {
      try {
        let data: any = null;
        if (category === "LAB") {
          data = await questionBankService.getLabQuestion(edit);
        } else if (category === "SYSTEM_DESIGN") {
          data = await questionBankService.getSystemDesignQuestion(edit);
        } else {
          data = await fetchQuestionDetails(edit);
        }
        if (isMounted) {
          setInitialData(data);
        }
      } catch (err: any) {
        console.error("Failed to load question details for edit:", err);
        if (isMounted) {
          setLoadError(err?.message || "Failed to load question details");
        }
      } finally {
        if (isMounted) {
          setLoadingInitialData(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [edit, category]);

  const handleClose = () => {
    navigate({ to: "/recruiter/questions" });
  };

  const handleSuccess = (msg: string) => {
    toast.success(msg || "Question saved successfully");
    queryClient.invalidateQueries({ queryKey: ["labQuestions"] });
    queryClient.invalidateQueries({ queryKey: ["knowledgeQuestions"] });
    queryClient.invalidateQueries({ queryKey: ["systemDesignQuestions"] });
    navigate({ to: "/recruiter/questions" });
  };

  if (loadingInitialData || isLoadingCourses) {
    return (
      <div className="qb-theme min-w-0 px-5 py-8 lg:px-10 bg-background text-foreground min-h-screen">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <button
              type="button"
              onClick={handleClose}
              className="qb-action text-sm text-muted-foreground hover:text-foreground transition cursor-pointer mb-2"
            >
              ← Back to Question bank
            </button>
            <h1 className="text-2xl font-semibold leading-8 text-foreground">
              {edit ? "Loading question..." : "New question"}
            </h1>
          </div>
        </header>
        <div className="space-y-4 max-w-4xl">
          <LoadingSkeleton rows={6} />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="qb-theme min-w-0 px-5 py-8 lg:px-10 bg-background text-foreground min-h-screen">
        <header className="mb-6">
          <button
            type="button"
            onClick={handleClose}
            className="qb-action text-sm text-muted-foreground hover:text-foreground transition cursor-pointer mb-2"
          >
            ← Back to Question bank
          </button>
          <h1 className="text-2xl font-semibold leading-8 text-destructive">Error loading question</h1>
          <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
        </header>
      </div>
    );
  }

  return (
    <QuestionBuilder
      key={`${category}-${edit || "new"}`}
      category={category}
      initialCategory={category}
      onCategoryChange={handleCategoryChange}
      step={step}
      onStepChange={handleStepChange}
      editingId={edit || null}
      initialData={initialData}
      courses={courses}
      onClose={handleClose}
      onSuccess={handleSuccess}
    />
  );
}
