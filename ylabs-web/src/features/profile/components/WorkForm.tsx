import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { workItemSchema, WorkItemFormData } from "../schemas/profileSchemas";
import { WorkItem, WorkType } from "../types";
import { Field } from "@/components/profile-ui/Field";
import { Input } from "@/components/profile-ui/Input";
import { Select } from "@/components/profile-ui/Select";
import { Textarea } from "@/components/profile-ui/Textarea";
import { Button } from "@/components/profile-ui/Button";
import { TextLink } from "@/components/profile-ui/TextLink";

interface WorkFormProps {
  initialData?: WorkItem;
  onSave: (data: Omit<WorkItem, "id">) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

const WORK_TYPES: WorkType[] = [
  "Internship",
  "Full-time",
  "Part-time",
  "Freelance",
  "Volunteer",
  "Research",
];

export const WorkForm: React.FC<WorkFormProps> = ({
  initialData,
  onSave,
  onCancel,
  submitting = false,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<WorkItemFormData>({
    resolver: zodResolver(workItemSchema),
    defaultValues: {
      type: initialData?.type || "Full-time",
      role: initialData?.role || "",
      company: initialData?.company || "",
      from: initialData?.from || "",
      to: initialData?.to || "",
      current: initialData?.current || false,
      responsibilitiesText: initialData?.responsibilities?.join("\n") || "",
      technologiesText: initialData?.technologies?.join(", ") || "",
    },
  });

  const isCurrent = watch("current");

  const submitHandler = async (data: WorkItemFormData) => {
    const responsibilities = (data.responsibilitiesText || "")
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean);

    const technologies = (data.technologiesText || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    await onSave({
      type: data.type,
      role: data.role.trim(),
      company: data.company.trim(),
      from: data.from,
      to: data.current ? undefined : data.to,
      current: !!data.current,
      responsibilities,
      technologies,
    });
  };

  return (
    <form
      onSubmit={handleSubmit(submitHandler)}
      className="rounded-[10px] border border-line bg-bg p-5 space-y-4 animate-fade-in"
      noValidate
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="work-role" label="Role" required error={errors.role?.message}>
          <Input
            id="work-role"
            placeholder="e.g. Senior Software Engineer"
            {...register("role")}
            error={!!errors.role}
            autoFocus
          />
        </Field>

        <Field id="work-company" label="Company" required error={errors.company?.message}>
          <Input
            id="work-company"
            placeholder="e.g. Acme Labs"
            {...register("company")}
            error={!!errors.company}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field id="work-type" label="Job Type" required error={errors.type?.message}>
          <Select id="work-type" {...register("type")}>
            {WORK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="work-from" label="From" required error={errors.from?.message}>
          <Input
            id="work-from"
            type="month"
            {...register("from")}
            error={!!errors.from}
          />
        </Field>

        <Field id="work-to" label="To" error={errors.to?.message}>
          <Input
            id="work-to"
            type="month"
            disabled={isCurrent}
            {...register("to")}
            error={!!errors.to}
          />
        </Field>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="work-current"
          type="checkbox"
          className="h-4 w-4 rounded border-line text-primary focus:ring-primary focus:ring-offset-1"
          {...register("current")}
        />
        <label htmlFor="work-current" className="text-sm font-medium text-sub select-none cursor-pointer">
          I currently work here
        </label>
      </div>

      <Field
        id="work-responsibilities"
        label="Responsibilities"
        hint="Enter each key responsibility or impact on a new line."
      >
        <Textarea
          id="work-responsibilities"
          rows={3}
          placeholder="Architected distributed caching layer&#10;Mentored 4 junior engineers&#10;Shipped real-time code runner"
          {...register("responsibilitiesText")}
        />
      </Field>

      <Field
        id="work-technologies"
        label="Technologies used"
        hint="Comma-separated list (e.g. React, TypeScript, Docker, Go)"
      >
        <Input
          id="work-technologies"
          placeholder="e.g. React, TypeScript, Node.js"
          {...register("technologiesText")}
        />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" size="sm" loading={submitting}>
          {initialData ? "Update experience" : "Save experience"}
        </Button>
        <TextLink variant="muted" size="sm" onClick={onCancel}>
          Cancel
        </TextLink>
      </div>
    </form>
  );
};
