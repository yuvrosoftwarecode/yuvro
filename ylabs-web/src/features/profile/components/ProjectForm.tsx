import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { projectItemSchema, ProjectItemFormData } from "../schemas/profileSchemas";
import { ProjectItem } from "../types";
import { Field } from "@/components/profile-ui/Field";
import { Input } from "@/components/profile-ui/Input";
import { Textarea } from "@/components/profile-ui/Textarea";
import { Button } from "@/components/profile-ui/Button";
import { TextLink } from "@/components/profile-ui/TextLink";

interface ProjectFormProps {
  initialData?: ProjectItem;
  onSave: (data: Omit<ProjectItem, "id">) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
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
  } = useForm<ProjectItemFormData>({
    resolver: zodResolver(projectItemSchema),
    defaultValues: {
      name: initialData?.name || "",
      role: initialData?.role || "",
      from: initialData?.from || "",
      to: initialData?.to || "",
      ongoing: initialData?.ongoing || false,
      bulletsText: initialData?.bullets?.join("\n") || "",
      technologiesText: initialData?.technologies?.join(", ") || "",
      link: initialData?.link || "",
    },
  });

  const isOngoing = watch("ongoing");

  const submitHandler = async (data: ProjectItemFormData) => {
    const bullets = (data.bulletsText || "")
      .split("\n")
      .map((b) => b.trim())
      .filter(Boolean);

    const technologies = (data.technologiesText || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    await onSave({
      name: data.name.trim(),
      role: data.role?.trim() || undefined,
      from: data.from || undefined,
      to: data.ongoing ? undefined : data.to || undefined,
      ongoing: !!data.ongoing,
      bullets,
      technologies,
      link: data.link?.trim() || undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit(submitHandler)}
      className="rounded-[10px] border border-line bg-bg p-5 space-y-4 animate-fade-in"
      noValidate
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="proj-name" label="Project name" required error={errors.name?.message}>
          <Input
            id="proj-name"
            placeholder="e.g. Distributed Task Orchestrator"
            {...register("name")}
            error={!!errors.name}
            autoFocus
          />
        </Field>

        <Field id="proj-role" label="Your role" error={errors.role?.message}>
          <Input
            id="proj-role"
            placeholder="e.g. Lead Architect, Core Contributor"
            {...register("role")}
            error={!!errors.role}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="proj-from" label="From" error={errors.from?.message}>
          <Input
            id="proj-from"
            type="month"
            {...register("from")}
            error={!!errors.from}
          />
        </Field>

        <Field id="proj-to" label="To" error={errors.to?.message}>
          <Input
            id="proj-to"
            type="month"
            disabled={isOngoing}
            {...register("to")}
            error={!!errors.to}
          />
        </Field>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="proj-ongoing"
          type="checkbox"
          className="h-4 w-4 rounded border-line text-primary focus:ring-primary focus:ring-offset-1"
          {...register("ongoing")}
        />
        <label htmlFor="proj-ongoing" className="text-sm font-medium text-sub select-none cursor-pointer">
          Ongoing project
        </label>
      </div>

      <Field
        id="proj-bullets"
        label="What you built or solved"
        hint="Enter each bullet point or achievement on a new line."
      >
        <Textarea
          id="proj-bullets"
          rows={3}
          placeholder="Implemented consensus protocol in Go&#10;Benchmarked 50k requests/sec latency"
          {...register("bulletsText")}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          id="proj-technologies"
          label="Technologies"
          hint="Comma-separated (e.g. Go, Docker, gRPC)"
        >
          <Input
            id="proj-technologies"
            placeholder="e.g. Go, Docker, gRPC"
            {...register("technologiesText")}
          />
        </Field>

        <Field
          id="proj-link"
          label="Project URL"
          hint="Must start with https://"
          error={errors.link?.message}
        >
          <Input
            id="proj-link"
            type="url"
            placeholder="https://github.com/..."
            {...register("link")}
            error={!!errors.link}
          />
        </Field>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" size="sm" loading={submitting}>
          {initialData ? "Update project" : "Save project"}
        </Button>
        <TextLink variant="muted" size="sm" onClick={onCancel}>
          Cancel
        </TextLink>
      </div>
    </form>
  );
};
