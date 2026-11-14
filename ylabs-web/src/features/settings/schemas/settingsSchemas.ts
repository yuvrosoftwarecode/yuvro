import { z } from "zod";
import { isValidPhone, isValidWebsite, isValidUsername } from "@/lib/validators";

export const personalInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be 30 characters or fewer")
    .refine(isValidUsername, {
      message: "Username can only contain letters, numbers, '.', '_', and '-'",
    }),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || isValidPhone(val), {
      message: "Phone number must start with + and country code (e.g. +919876543210)",
    }),
  location: z.string().optional(),
  website: z
    .string()
    .optional()
    .refine((val) => !val || isValidWebsite(val), {
      message: "Website must start with https://",
    }),
  headline: z.string().optional(),
  about: z.string().optional(),
});

export type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Must be at least 8 characters long")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must differ from current password",
    path: ["newPassword"],
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;
