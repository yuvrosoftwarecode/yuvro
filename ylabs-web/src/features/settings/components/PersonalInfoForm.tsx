import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  personalInfoSchema,
  PersonalInfoFormData,
} from "../schemas/settingsSchemas";
import { useProfileStore } from "@/features/profile/store/profileStore";
import { Card } from "@/components/profile-ui/Card";

export const PersonalInfoForm: React.FC = () => {
  const { profile, saveProfile, updateProfileLive } = useProfileStore();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: profile?.firstName || "",
      lastName: profile?.lastName || "",
      username: profile?.username || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
      location: profile?.location || "",
      website: profile?.website || "",
      headline: profile?.headline || "",
      about: profile?.about || "",
    },
  });

  // Watch form fields to live-update the shared header and store
  const watchedValues = watch();

  useEffect(() => {
    if (isDirty) {
      updateProfileLive({
        firstName: watchedValues.firstName,
        lastName: watchedValues.lastName,
        username: watchedValues.username,
        email: watchedValues.email,
        phone: watchedValues.phone || "",
        location: watchedValues.location || "",
        website: watchedValues.website || "",
        headline: watchedValues.headline || "",
        about: watchedValues.about || "",
      });
    }
  }, [
    isDirty,
    watchedValues.firstName,
    watchedValues.lastName,
    watchedValues.username,
    watchedValues.email,
    watchedValues.phone,
    watchedValues.location,
    watchedValues.website,
    watchedValues.headline,
    watchedValues.about,
    updateProfileLive,
  ]);

  // Reset form when profile initializes
  useEffect(() => {
    if (profile && !isDirty) {
      reset({
        firstName: profile.firstName,
        lastName: profile.lastName,
        username: profile.username,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        website: profile.website,
        headline: profile.headline,
        about: profile.about,
      });
    }
  }, [profile, reset, isDirty]);

  const onSubmit = async (data: PersonalInfoFormData) => {
    const success = await saveProfile({
      firstName: data.firstName.trim(),
      lastName: data.lastName?.trim() || "",
      username: data.username.trim(),
      email: data.email.trim(),
      phone: data.phone?.trim() || "",
      location: data.location?.trim() || "",
      website: data.website?.trim() || "",
      headline: data.headline?.trim() || "",
      about: data.about?.trim() || "",
    });

    if (success) {
      reset(data);
    }
  };

  return (
    <Card className="p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-ink">Personal information</h2>
        <p className="text-xs text-muted mt-1">Fields marked * are required.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Row 1: First name & Last name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="settings-firstName" className="block text-xs font-medium text-sub">
              First name *
            </label>
            <input
              id="settings-firstName"
              type="text"
              {...register("firstName")}
              className={`w-full rounded-[8px] border bg-card px-3 py-2 text-sm text-ink placeholder:text-muted transition-colors ${
                errors.firstName ? "border-danger" : "border-line"
              }`}
            />
            {errors.firstName && (
              <p className="text-xs text-danger" role="alert">
                {errors.firstName.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="settings-lastName" className="block text-xs font-medium text-sub">
              Last name
            </label>
            <input
              id="settings-lastName"
              type="text"
              {...register("lastName")}
              className={`w-full rounded-[8px] border bg-card px-3 py-2 text-sm text-ink placeholder:text-muted transition-colors ${
                errors.lastName ? "border-danger" : "border-line"
              }`}
            />
            {errors.lastName && (
              <p className="text-xs text-danger" role="alert">
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>

        {/* Row 2: Username & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="settings-username" className="block text-xs font-medium text-sub">
              Username *
            </label>
            <input
              id="settings-username"
              type="text"
              {...register("username")}
              className={`w-full rounded-[8px] border bg-card px-3 py-2 text-sm text-ink placeholder:text-muted transition-colors ${
                errors.username ? "border-danger" : "border-line"
              }`}
            />
            {errors.username && (
              <p className="text-xs text-danger" role="alert">
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="settings-email" className="block text-xs font-medium text-sub">
              Email *
            </label>
            <input
              id="settings-email"
              type="email"
              {...register("email")}
              className={`w-full rounded-[8px] border bg-card px-3 py-2 text-sm text-ink placeholder:text-muted transition-colors ${
                errors.email ? "border-danger" : "border-line"
              }`}
            />
            {errors.email && (
              <p className="text-xs text-danger" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>
        </div>

        {/* Row 3: Phone & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="settings-phone" className="block text-xs font-medium text-sub">
                Phone
              </label>
              <span className="text-xs text-muted">Include country code (+...)</span>
            </div>
            <input
              id="settings-phone"
              type="tel"
              {...register("phone")}
              className={`w-full rounded-[8px] border bg-card px-3 py-2 text-sm text-ink placeholder:text-muted transition-colors ${
                errors.phone ? "border-danger" : "border-line"
              }`}
            />
            {errors.phone && (
              <p className="text-xs text-danger" role="alert">
                {errors.phone.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="settings-location" className="block text-xs font-medium text-sub">
              Location
            </label>
            <input
              id="settings-location"
              type="text"
              {...register("location")}
              className={`w-full rounded-[8px] border bg-card px-3 py-2 text-sm text-ink placeholder:text-muted transition-colors ${
                errors.location ? "border-danger" : "border-line"
              }`}
            />
            {errors.location && (
              <p className="text-xs text-danger" role="alert">
                {errors.location.message}
              </p>
            )}
          </div>
        </div>

        {/* Row 4: Website & Headline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="settings-website" className="block text-xs font-medium text-sub">
                Website
              </label>
              <span className="text-xs text-muted">https:// mandatory</span>
            </div>
            <input
              id="settings-website"
              type="url"
              {...register("website")}
              className={`w-full rounded-[8px] border bg-card px-3 py-2 text-sm text-ink placeholder:text-muted transition-colors ${
                errors.website ? "border-danger" : "border-line"
              }`}
            />
            {errors.website && (
              <p className="text-xs text-danger" role="alert">
                {errors.website.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="settings-headline" className="block text-xs font-medium text-sub">
              Headline
            </label>
            <input
              id="settings-headline"
              type="text"
              {...register("headline")}
              className={`w-full rounded-[8px] border bg-card px-3 py-2 text-sm text-ink placeholder:text-muted transition-colors ${
                errors.headline ? "border-danger" : "border-line"
              }`}
            />
            {errors.headline && (
              <p className="text-xs text-danger" role="alert">
                {errors.headline.message}
              </p>
            )}
          </div>
        </div>

        {/* Row 5: About you (full width) */}
        <div className="space-y-1.5">
          <label htmlFor="settings-about" className="block text-xs font-medium text-sub">
            About you
          </label>
          <textarea
            id="settings-about"
            rows={4}
            {...register("about")}
            className={`w-full rounded-[8px] border bg-card px-3 py-2 text-sm text-ink placeholder:text-muted transition-colors leading-[1.55] ${
              errors.about ? "border-danger" : "border-line"
            }`}
          />
          {errors.about && (
            <p className="text-xs text-danger" role="alert">
              {errors.about.message}
            </p>
          )}
        </div>

        {/* Bottom Save button */}
        <div className="pt-3 flex justify-end">
          <button
            type="submit"
            disabled={!isDirty || isSubmitting}
            className={`rounded-[8px] px-5 py-2 text-sm font-medium transition-colors cursor-pointer ${
              !isDirty || isSubmitting
                ? "bg-[#9eb3ee] text-white cursor-not-allowed opacity-80"
                : "bg-[#3558c8] hover:bg-[#2c4ab0] text-white"
            }`}
          >
            {isSubmitting ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </Card>
  );
};
