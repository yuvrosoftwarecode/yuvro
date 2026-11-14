import { z } from "zod";

export const workItemSchema = z
  .object({
    type: z.enum([
      "Internship",
      "Full-time",
      "Part-time",
      "Freelance",
      "Volunteer",
      "Research",
    ]),
    role: z.string().min(1, "Role is required"),
    company: z.string().min(1, "Company is required"),
    from: z.string().min(1, "Start month is required"),
    to: z.string().optional(),
    current: z.boolean().default(false),
    responsibilitiesText: z.string().optional(),
    technologiesText: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.current) return true;
      if (!data.to) return true;
      return data.from <= data.to;
    },
    {
      message: "End date cannot be before start date",
      path: ["to"],
    }
  );

export type WorkItemFormData = z.infer<typeof workItemSchema>;

export const projectItemSchema = z
  .object({
    name: z.string().min(1, "Project name is required"),
    role: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    ongoing: z.boolean().default(false),
    bulletsText: z.string().optional(),
    technologiesText: z.string().optional(),
    link: z
      .string()
      .optional()
      .refine((val) => !val || val.trim() === "" || val.startsWith("https://"), {
        message: "Link must start with https://",
      }),
  })
  .refine(
    (data) => {
      if (data.ongoing) return true;
      if (!data.from || !data.to) return true;
      return data.from <= data.to;
    },
    {
      message: "End date cannot be before start date",
      path: ["to"],
    }
  );

export type ProjectItemFormData = z.infer<typeof projectItemSchema>;

export const educationItemSchema = z
  .object({
    school: z.string().min(1, "School or college is required"),
    degree: z.string().optional(),
    field: z.string().optional(),
    startYear: z.coerce.number().optional(),
    endYear: z.coerce.number().optional(),
  })
  .refine(
    (data) => {
      if (!data.startYear || !data.endYear) return true;
      return data.endYear >= data.startYear;
    },
    {
      message: "End year cannot be before start year",
      path: ["endYear"],
    }
  );

export type EducationItemFormData = z.infer<typeof educationItemSchema>;
