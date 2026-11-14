import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { educationItemSchema, EducationItemFormData } from "../schemas/profileSchemas";
import { EducationItem } from "../types";
import { Field } from "@/components/profile-ui/Field";
import { Input } from "@/components/profile-ui/Input";
import { Select } from "@/components/profile-ui/Select";
import { Button } from "@/components/profile-ui/Button";
import { TextLink } from "@/components/profile-ui/TextLink";

interface EducationFormProps {
  initialData?: EducationItem;
  onSave: (data: Omit<EducationItem, "id">) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 45 }, (_, i) => CURRENT_YEAR + 6 - i);

export const EducationForm: React.FC<EducationFormProps> = ({
  initialData,
  onSave,
  onCancel,
  submitting = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EducationItemFormData>({
    resolver: zodResolver(educationItemSchema),
    defaultValues: {
      school: initialData?.school || "",
      degree: initialData?.degree || "",
      field: initialData?.field || "",
      startYear: initialData?.startYear || CURRENT_YEAR - 4,
      endYear: initialData?.endYear || CURRENT_YEAR,
    },
  });

  const submitHandler = async (data: EducationItemFormData) => {
    await onSave({
      school: data.school.trim(),
      degree: data.degree?.trim() || undefined,
      field: data.field?.trim() || undefined,
      startYear: data.startYear,
      endYear: data.endYear,
    });
  };

  return (
    <form
      onSubmit={handleSubmit(submitHandler)}
      className="rounded-[10px] border border-line bg-bg p-5 space-y-4 animate-fade-in"
      noValidate
    >
      <Field id="edu-school" label="School or College" required error={errors.school?.message}>
        <Input
          id="edu-school"
          placeholder="e.g. Indian Institute of Technology / Stanford University"
          {...register("school")}
          error={!!errors.school}
          autoFocus
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="edu-degree" label="Degree" error={errors.degree?.message}>
          <Input
            id="edu-degree"
            placeholder="e.g. B.Tech, M.S., B.S."
            {...register("degree")}
            error={!!errors.degree}
          />
        </Field>

        <Field id="edu-field" label="Field of study" error={errors.field?.message}>
          <Input
            id="edu-field"
            placeholder="e.g. Computer Science & Engineering"
            {...register("field")}
            error={!!errors.field}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="edu-start-year" label="Start year" error={errors.startYear?.message}>
          <Select id="edu-start-year" {...register("startYear")}>
            <option value="">Select year</option>
            {YEARS.map((y) => (
              <option key={`start-${y}`} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="edu-end-year" label="End year (or expected)" error={errors.endYear?.message}>
          <Select id="edu-end-year" {...register("endYear")}>
            <option value="">Select year</option>
            {YEARS.map((y) => (
              <option key={`end-${y}`} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" size="sm" loading={submitting}>
          {initialData ? "Update education" : "Save education"}
        </Button>
        <TextLink variant="muted" size="sm" onClick={onCancel}>
          Cancel
        </TextLink>
      </div>
    </form>
  );
};
