import React, { useState, useEffect } from "react";
import { Plus, X, Trash2, Save, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { ycodeApiAuthUtil } from "@/utils/RestApiAuthUtil";
import { fetchTopics, checkDuplicateQuestion, PROGRAMMING_LANGUAGES } from "@/lib/recruiter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CreateQuestionForm({
  courses,
  onClose,
  onSuccess,
  initialData,
}: {
  courses: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: (question: any) => void;
  initialData?: any;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<"mcq_single" | "mcq_multiple" | "descriptive" | "coding">(
    initialData?.type || "mcq_single"
  );
  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [course, setCourse] = useState(initialData?.course || "");
  const [topic, setTopic] = useState(initialData?.topic || "");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    initialData?.difficulty || "medium"
  );
  const [marks, setMarks] = useState(initialData?.marks || 1);
  const [duration, setDuration] = useState(initialData?.duration_minutes || initialData?.duration || 5);

  const [options, setOptions] = useState<{ text: string; is_correct: boolean }[]>(
    initialData?.mcq_options && initialData.mcq_options.length > 0
      ? initialData.mcq_options
      : [
          { text: "", is_correct: false },
          { text: "", is_correct: false },
        ]
  );

  const [testCases, setTestCases] = useState<{ input: string; expected_output: string }[]>(
    initialData?.test_cases_basic && initialData.test_cases_basic.length > 0
      ? initialData.test_cases_basic
      : [{ input: "", expected_output: "" }]
  );

  const [hints, setHints] = useState<string[]>(
    initialData?.hints || []
  );

  const [solutions, setSolutions] = useState<any[]>(
    initialData?.solutions || []
  );

  const handleHintChange = (index: number, value: string) => {
    const newHints = [...hints];
    newHints[index] = value;
    setHints(newHints);
  };
  const addHint = () => setHints([...hints, '']);
  const removeHint = (index: number) => setHints(hints.filter((_, i) => i !== index));

  const handleSolutionChange = (index: number, field: string, value: any) => {
    const newSolutions = [...solutions];
    newSolutions[index] = { ...newSolutions[index], [field]: value };
    setSolutions(newSolutions);
  };
  const addSolution = () => setSolutions([...solutions, { title: 'Optimal Solution', language: 'python', code: '', is_recommended: true }]);
  const removeSolution = (index: number) => setSolutions(solutions.filter((_, i) => i !== index));

  const [availableTopics, setAvailableTopics] = useState<any[]>([]);
  
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [duplicateMeta, setDuplicateMeta] = useState<any>(null);

  useEffect(() => {
    if (course) {
      fetchTopics(course).then(setAvailableTopics);
    } else {
      setAvailableTopics([]);
    }
    // Only reset topic if it's changing *away* from initialData's course, or if there's no initialData
    if (initialData && course === initialData.course) {
      setTopic(initialData.topic || "no_topic");
    } else {
      setTopic("no_topic");
    }
  }, [course, initialData]);

  useEffect(() => {
    if (!content.trim() || content.trim().length < 10 || !course) {
      setDuplicateMeta(null);
      setIsCheckingDuplicate(false);
      return;
    }
    
    // Skip checking if content is unchanged from initialData
    if (initialData && initialData.content) {
      const currentNorm = content.trim().toLowerCase().replace(/\s+/g, ' ');
      const initialNorm = initialData.content.trim().toLowerCase().replace(/\s+/g, ' ');
      if (currentNorm === initialNorm && course === initialData.course) {
        setDuplicateMeta(null);
        setIsCheckingDuplicate(false);
        return;
      }
    }

    setIsCheckingDuplicate(true);
    setDuplicateMeta(null);

    const handler = setTimeout(async () => {
      const res = await checkDuplicateQuestion(content, course);
      setDuplicateMeta(res);
      setIsCheckingDuplicate(false);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [content, course]);

  const validate = () => {
    if (!title.trim()) return "Title is required.";
    if (!content.trim()) return "Question content is required.";
    if (!course) return "Course (Subject) is required.";
    if (marks <= 0) return "Marks must be greater than 0.";
    if (duration <= 0) return "Duration must be greater than 0.";

    if (type === "mcq_single" || type === "mcq_multiple") {
      if (options.length < 2) return "MCQ questions must have at least 2 options.";
      for (let i = 0; i < options.length; i++) {
        if (!options[i].text.trim()) return `Option ${i + 1} text cannot be empty.`;
      }
      const correctCount = options.filter((o) => o.is_correct).length;
      if (correctCount === 0) return "MCQ questions must have at least one correct answer.";
      if (type === "mcq_single" && correctCount > 1) {
        return "Single answer MCQ questions can only have one correct answer.";
      }
    } else if (type === "coding") {
      if (testCases.length === 0) return "Coding questions must have at least 1 test case.";
      for (let i = 0; i < testCases.length; i++) {
        if (!testCases[i].input.trim() || !testCases[i].expected_output.trim()) {
          return `Test Case ${i + 1} must have both input and expected output.`;
        }
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        type,
        title,
        content,
        level: topic ? "topic" : "course",
        course,
        difficulty: difficulty.toLowerCase(),
        marks,
        duration,
        categories: ["ylabs_evaluation"],
      };

      if (topic) {
        payload.topic = topic;
      }

      if (type === "mcq_single" || type === "mcq_multiple") {
        payload.mcq_options = options.map((opt) => ({
          text: opt.text.trim(),
          is_correct: opt.is_correct,
        }));
      } else if (type === "coding") {
        payload.test_cases_basic = testCases.map((tc) => ({
          input: tc.input.trim(),
          expected_output: tc.expected_output.trim(),
        }));
        payload.hints = hints.filter(h => h.trim() !== "");
        const usedTitles = new Set();
        payload.solutions = solutions.filter(s => s.code.trim() !== "").map((s, idx) => {
          let baseTitle = s.title.trim() || "Optimal Solution";
          let finalTitle = baseTitle;
          let counter = 1;
          while (usedTitles.has(finalTitle.toLowerCase())) {
            counter++;
            finalTitle = `${baseTitle} ${counter}`;
          }
          usedTitles.add(finalTitle.toLowerCase());

          return {
            title: finalTitle,
            language: s.language.trim() || "python",
            code: s.code,
            is_primary: s.is_primary ?? s.is_recommended ?? true
          };
        });
      }

      let res;
      if (initialData && initialData.id) {
        res = await ycodeApiAuthUtil.put<any>(`/course/questions/${initialData.id}/`, payload);
      } else {
        res = await ycodeApiAuthUtil.post<any>("/course/questions/", payload);
      }
      onSuccess(res);
    } catch (err: any) {
      console.error("Create Question Error:", err);
      // Attempt to extract validation error messages from Django Rest Framework response
      if (err.response && err.response.data) {
        const data = err.response.data;
        if (typeof data === "object") {
          const messages = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`);
          setError(messages.join(" | "));
        } else {
          setError(err.message || "Failed to create question.");
        }
      } else {
        setError(err.message || "Failed to create question.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (index: number, field: "text" | "is_correct", value: any) => {
    const newOptions = [...options];
    if (field === "is_correct" && type === "mcq_single" && value === true) {
      newOptions.forEach((o) => (o.is_correct = false));
    }
    newOptions[index] = { ...newOptions[index], [field]: value };
    setOptions(newOptions);
  };

  const addOption = () => setOptions([...options, { text: "", is_correct: false }]);
  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleTestCaseChange = (index: number, field: "input" | "expected_output", value: string) => {
    const newTestCases = [...testCases];
    newTestCases[index] = { ...newTestCases[index], [field]: value };
    setTestCases(newTestCases);
  };

  const addTestCase = () => setTestCases([...testCases, { input: "", expected_output: "" }]);
  const removeTestCase = (index: number) => {
    if (testCases.length <= 1) return;
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-200">
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/5 p-6 shrink-0">
        <div>
          <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-white">
            {initialData ? "Edit Question" : "Create New Question"}
          </h2>
          <p className="mt-1 text-[12px] text-neutral-400">
            {initialData ? "Modify your question details below." : "Add a new question to the shared bank."}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar p-6">
        <form id="create-q-form" onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-500/10 p-3 text-[13px] text-red-400 border border-red-500/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-neutral-500">
                Format <span className="text-red-400">*</span>
              </label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger className="w-full h-9 rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none focus:border-violet-400/60 focus:ring-0">
                  <SelectValue placeholder="Select Format" />
                </SelectTrigger>
                <SelectContent className="border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-200">
                  <SelectItem value="mcq_single" className="text-[13px] focus:bg-neutral-100 dark:focus:bg-white/10 focus:text-neutral-900 dark:focus:text-white">Multiple Choice (Single Answer)</SelectItem>
                  <SelectItem value="mcq_multiple" className="text-[13px] focus:bg-neutral-100 dark:focus:bg-white/10 focus:text-neutral-900 dark:focus:text-white">Multiple Choice (Multiple Answers)</SelectItem>
                  <SelectItem value="descriptive" className="text-[13px] focus:bg-neutral-100 dark:focus:bg-white/10 focus:text-neutral-900 dark:focus:text-white">Descriptive (Text)</SelectItem>
                  <SelectItem value="coding" className="text-[13px] focus:bg-neutral-100 dark:focus:bg-white/10 focus:text-neutral-900 dark:focus:text-white">Coding Question</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-neutral-500">
                Difficulty <span className="text-red-400">*</span>
              </label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
                <SelectTrigger className="w-full h-9 rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none focus:border-violet-400/60 focus:ring-0">
                  <SelectValue placeholder="Select Difficulty" />
                </SelectTrigger>
                <SelectContent className="border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-200">
                  <SelectItem value="easy" className="text-[13px] focus:bg-neutral-100 dark:focus:bg-white/10 focus:text-neutral-900 dark:focus:text-white">Easy</SelectItem>
                  <SelectItem value="medium" className="text-[13px] focus:bg-neutral-100 dark:focus:bg-white/10 focus:text-neutral-900 dark:focus:text-white">Medium</SelectItem>
                  <SelectItem value="hard" className="text-[13px] focus:bg-neutral-100 dark:focus:bg-white/10 focus:text-neutral-900 dark:focus:text-white">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-widest text-neutral-500">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., CSS Specificity, React Hooks Lifecycle"
              className="w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 p-2 text-[13px] outline-none focus:border-violet-400/60"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-widest text-neutral-500">
              Content (Markdown supported) <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What is the output of..."
              className="w-full resize-none rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 p-2 text-[13px] outline-none focus:border-violet-400/60"
            />
            {isCheckingDuplicate && (
              <div className="mt-2 flex items-center gap-2 text-[12px] text-neutral-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Checking for duplicate questions...
              </div>
            )}
            {!isCheckingDuplicate && duplicateMeta?.is_duplicate && (
              <div className="mt-2 flex items-start gap-2 rounded-md bg-yellow-500/10 p-3 text-[12px] text-yellow-500 border border-yellow-500/20">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">This question already exists.</div>
                  <div className="mt-0.5 text-yellow-500/80">
                    "{duplicateMeta.duplicate_title}"
                  </div>
                </div>
              </div>
            )}
            {!isCheckingDuplicate && duplicateMeta && !duplicateMeta.is_duplicate && (
              <div className="mt-2 flex items-center gap-2 text-[12px] text-emerald-400">
                <CheckCircle className="h-3.5 w-3.5" />
                No duplicate question found
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-neutral-500">
                Course / Subject <span className="text-red-400">*</span>
              </label>
              <Select value={course} onValueChange={(v) => setCourse(v)}>
                <SelectTrigger className="w-full h-9 rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none focus:border-violet-400/60 focus:ring-0">
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent className="border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-200">
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-[13px] focus:bg-neutral-100 dark:focus:bg-white/10 focus:text-neutral-900 dark:focus:text-white">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-neutral-500">
                Topic (Optional)
              </label>
              <Select value={topic || "none"} onValueChange={(v) => setTopic(v === "none" ? "" : v)} disabled={!course || availableTopics.length === 0}>
                <SelectTrigger className="w-full h-9 rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none focus:border-violet-400/60 focus:ring-0 disabled:opacity-50">
                  <SelectValue placeholder="No specific topic" />
                </SelectTrigger>
                <SelectContent className="border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-200">
                  <SelectItem value="none" className="text-[13px] focus:bg-neutral-100 dark:focus:bg-white/10 focus:text-neutral-900 dark:focus:text-white">No specific topic</SelectItem>
                  {availableTopics.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-[13px] focus:bg-neutral-100 dark:focus:bg-white/10 focus:text-neutral-900 dark:focus:text-white">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-neutral-500">
                Marks <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={marks}
                onChange={(e) => setMarks(Number(e.target.value))}
                className="w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 p-2 text-[13px] outline-none focus:border-violet-400/60"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-neutral-500">
                Duration (minutes) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 p-2 text-[13px] outline-none focus:border-violet-400/60"
              />
            </div>
          </div>

          {(type === "mcq_single" || type === "mcq_multiple") && (
            <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-white/5">
              <label className="block text-[11px] uppercase tracking-widest text-neutral-500">
                Options <span className="text-red-400">*</span>
              </label>
              
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="pt-2">
                      <input
                        type={type === "mcq_single" ? "radio" : "checkbox"}
                        name="is_correct"
                        checked={opt.is_correct}
                        onChange={(e) => handleOptionChange(i, "is_correct", e.target.checked)}
                        className="h-4 w-4 cursor-pointer accent-emerald-400"
                        title="Mark as correct answer"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        required
                        value={opt.text}
                        onChange={(e) => handleOptionChange(i, "text", e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        className={`w-full rounded-md border ${opt.is_correct ? "border-emerald-400/50 bg-emerald-400/10" : "border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30"} p-2 text-[13px] outline-none focus:border-violet-400/60`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      disabled={options.length <= 2}
                      className="mt-2 text-neutral-500 hover:text-red-400 transition disabled:opacity-30 disabled:hover:text-neutral-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addOption}
                className="inline-flex items-center gap-1 text-[12px] text-emerald-400 hover:text-emerald-300 transition"
              >
                <Plus className="h-3 w-3" /> Add Option
              </button>
            </div>
          )}

          {type === "coding" && (
            <div>
              <label className="mb-2 block text-[11px] uppercase tracking-widest text-neutral-500">
                Test Cases (Basic) <span className="text-red-400">*</span>
              </label>
              <div className="space-y-4">
                {testCases.map((tc, i) => (
                  <div key={i} className="rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/20 p-4 relative">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[11px] font-bold tracking-widest text-neutral-500 uppercase">Case #{i + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeTestCase(i)}
                        disabled={testCases.length <= 1}
                        className="text-neutral-500 hover:text-red-400 transition disabled:opacity-30 disabled:hover:text-neutral-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-[11px] uppercase tracking-widest text-neutral-500">Input</label>
                        <textarea
                          required
                          rows={2}
                          value={tc.input}
                          onChange={(e) => handleTestCaseChange(i, "input", e.target.value)}
                          placeholder="E.g., 5"
                          className="w-full resize-none font-mono rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 p-2 text-[12px] outline-none focus:border-violet-400/60"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] uppercase tracking-widest text-neutral-500">Expected Output</label>
                        <textarea
                          required
                          rows={2}
                          value={tc.expected_output}
                          onChange={(e) => handleTestCaseChange(i, "expected_output", e.target.value)}
                          placeholder="E.g., 120"
                          className="w-full resize-none font-mono rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 p-2 text-[12px] outline-none focus:border-violet-400/60"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addTestCase}
                className="mt-3 inline-flex items-center gap-1 text-[12px] text-emerald-400 hover:text-emerald-300 transition"
              >
                <Plus className="h-3 w-3" /> Add Test Case
              </button>

              {/* Hints Section */}
              <div className="mt-6 border-t border-neutral-200 dark:border-white/5 pt-6">
                <label className="mb-2 block text-[11px] uppercase tracking-widest text-neutral-500">
                  Hints (Optional)
                </label>
                <div className="space-y-3">
                  {hints.map((hint, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex-1">
                        <textarea
                          rows={2}
                          value={hint}
                          onChange={(e) => handleHintChange(i, e.target.value)}
                          placeholder="E.g., Try using a hash map to reduce time complexity..."
                          className="w-full resize-none rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 p-2 text-[12px] text-neutral-900 dark:text-neutral-200 outline-none focus:border-violet-400/60 focus:bg-white dark:focus:bg-black/30"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeHint(i)}
                        className="mt-2 text-neutral-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addHint}
                  className="mt-3 inline-flex items-center gap-1 text-[12px] text-emerald-400 hover:text-emerald-300 transition"
                >
                  <Plus className="h-3 w-3" /> Add Hint
                </button>
              </div>

              {/* Solutions Section */}
              <div className="mt-6 border-t border-neutral-200 dark:border-white/5 pt-6">
                <label className="mb-2 block text-[11px] uppercase tracking-widest text-neutral-500">
                  Solutions (Optional)
                </label>
                <div className="space-y-4">
                  {solutions.map((sol, i) => (
                    <div key={i} className="rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/20 p-4 relative">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[11px] font-bold tracking-widest text-neutral-500 uppercase">Solution #{i + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeSolution(i)}
                          className="text-neutral-500 hover:text-red-400 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <label className="mb-1 block text-[11px] uppercase tracking-widest text-neutral-500">Title</label>
                          <input
                            value={sol.title}
                            onChange={(e) => handleSolutionChange(i, 'title', e.target.value)}
                            placeholder="E.g., Optimal Approach"
                            className="w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 p-2 text-[12px] text-neutral-900 dark:text-neutral-200 outline-none focus:border-violet-400/60 focus:bg-white dark:focus:bg-black/30"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] uppercase tracking-widest text-neutral-500">Language</label>
                          <Select
                            value={sol.language}
                            onValueChange={(val) => handleSolutionChange(i, 'language', val)}
                          >
                            <SelectTrigger className="w-full h-[38px] rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[12px] text-neutral-900 dark:text-neutral-200 outline-none focus:border-violet-400/60 focus:ring-0">
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                            <SelectContent className="border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-200">
                              {PROGRAMMING_LANGUAGES.map((lang) => (
                                <SelectItem key={lang} value={lang.toLowerCase()} className="text-[12px] focus:bg-neutral-100 dark:focus:bg-white/10 focus:text-neutral-900 dark:focus:text-white">
                                  {lang}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] uppercase tracking-widest text-neutral-500">Code</label>
                        <textarea
                          required
                          rows={5}
                          value={sol.code}
                          onChange={(e) => handleSolutionChange(i, 'code', e.target.value)}
                          placeholder="def solve(nums):&#10;    return sum(nums)"
                          className="w-full resize-y font-mono rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 p-2 text-[12px] text-neutral-900 dark:text-neutral-200 outline-none focus:border-violet-400/60 focus:bg-white dark:focus:bg-black/30"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addSolution}
                  className="mt-3 inline-flex items-center gap-1 text-[12px] text-emerald-400 hover:text-emerald-300 transition"
                >
                  <Plus className="h-3 w-3" /> Add Solution
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      <div className="border-t border-neutral-200 dark:border-white/5 p-5 flex justify-end gap-3 shrink-0 bg-white dark:bg-neutral-900/50">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="rounded-md px-5 py-2.5 text-[13px] font-medium text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 transition disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          form="create-q-form"
          type="submit"
          disabled={loading || isCheckingDuplicate || duplicateMeta?.is_duplicate}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-400 px-5 py-2.5 text-[13px] font-medium text-black transition hover:bg-emerald-300 disabled:opacity-50"
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {loading 
            ? (initialData ? "Saving..." : "Creating...") 
            : (initialData ? "Save Changes" : "Create Question")}
        </button>
      </div>
    </div>
  );
}
