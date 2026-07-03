import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ArrowRight } from "lucide-react";

interface ProcessFlowBlockProps {
  block: any;
  onChange: (updates: any) => void;
}

export const ProcessFlowBlock: React.FC<ProcessFlowBlockProps> = ({
  block,
  onChange,
}) => {
  const steps: string[] = block.metadata?.steps || [
    "Step 1",
    "Step 2",
    "Step 3",
  ];

  const updateStep = (idx: number, value: string) => {
    const newSteps = steps.map((s, i) => (i === idx ? value : s));
    onChange({ metadata: { ...block.metadata, steps: newSteps } });
  };

  const addStep = () => {
    onChange({
      metadata: {
        ...block.metadata,
        steps: [...steps, `Step ${steps.length + 1}`],
      },
    });
  };

  const removeStep = (idx: number) => {
    if (steps.length <= 2) return;
    onChange({
      metadata: { ...block.metadata, steps: steps.filter((_, i) => i !== idx) },
    });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Preview */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <p className="text-xs font-semibold text-slate-500 uppercase mb-3">
          Preview
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {steps.map((step, idx) => (
            <React.Fragment key={idx}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold shrink-0">
                  {idx + 1}
                </div>
                <span className="text-sm font-medium text-slate-800 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
                  {step || `Step ${idx + 1}`}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="space-y-2">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold shrink-0">
              {idx + 1}
            </div>
            <Input
              value={step}
              onChange={(e) => updateStep(idx, e.target.value)}
              placeholder={`Step ${idx + 1}`}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeStep(idx)}
              disabled={steps.length <= 2}
              className="h-8 w-8 text-slate-400 hover:text-red-500"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={addStep}
        className="gap-1 text-xs"
      >
        <Plus className="w-3 h-3" /> Add Step
      </Button>
    </div>
  );
};

interface StepperBlockProps {
  block: any;
  onChange: (updates: any) => void;
}

export const StepperBlock: React.FC<StepperBlockProps> = ({
  block,
  onChange,
}) => {
  const steps: { title: string; description?: string }[] = block.metadata
    ?.steps || [
    { title: "Step 1", description: "" },
    { title: "Step 2", description: "" },
  ];

  const updateStep = (
    idx: number,
    field: "title" | "description",
    value: string,
  ) => {
    const newSteps = steps.map((s, i) =>
      i === idx ? { ...s, [field]: value } : s,
    );
    onChange({ metadata: { ...block.metadata, steps: newSteps } });
  };

  const addStep = () => {
    onChange({
      metadata: {
        ...block.metadata,
        steps: [
          ...steps,
          { title: `Step ${steps.length + 1}`, description: "" },
        ],
      },
    });
  };

  const removeStep = (idx: number) => {
    if (steps.length <= 2) return;
    onChange({
      metadata: { ...block.metadata, steps: steps.filter((_, i) => i !== idx) },
    });
  };

  return (
    <div className="p-4 space-y-3">
      {steps.map((step, idx) => (
        <div key={idx} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-sm flex items-center justify-center font-bold shrink-0">
              {idx + 1}
            </div>
            {idx < steps.length - 1 && (
              <div className="w-0.5 h-6 bg-indigo-200 mt-1" />
            )}
          </div>
          <div className="flex-1 space-y-1 pb-4">
            <Input
              value={step.title}
              onChange={(e) => updateStep(idx, "title", e.target.value)}
              placeholder="Step title..."
              className="font-semibold"
            />
            <Input
              value={step.description || ""}
              onChange={(e) => updateStep(idx, "description", e.target.value)}
              placeholder="Optional description..."
              className="text-sm text-slate-600"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeStep(idx)}
            disabled={steps.length <= 2}
            className="h-8 w-8 text-slate-400 hover:text-red-500 self-start mt-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={addStep}
        className="gap-1 text-xs ml-11"
      >
        <Plus className="w-3 h-3" /> Add Step
      </Button>
    </div>
  );
};
