import React, { useState, useEffect, useRef } from "react";
import { Send, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { submitSupportFeedback } from "@/services/supportService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const SUCCESS_FEEDBACK_MESSAGE =
  "Thanks for your feedback, you're adding value to the journey";

export function SupportFeedbackButton() {
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");

  const [subjectError, setSubjectError] = useState<string | null>(null);
  const [descError, setDescError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const resetForm = () => {
    setSubject("");
    setDescription("");
    setEmail("");
    setSubjectError(null);
    setDescError(null);
    setSubmitError(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setIsSubmitted(false);
      resetForm();
    }, 200);
  };

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let hasError = false;
    const cleanSubject = subject.trim();
    const cleanDescription = description.trim();

    if (!cleanSubject) {
      setSubjectError("Subject is mandatory");
      hasError = true;
    } else {
      setSubjectError(null);
    }

    if (!cleanDescription) {
      setDescError("Description is mandatory");
      hasError = true;
    } else {
      setDescError(null);
    }

    if (hasError) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await submitSupportFeedback({
        subject: cleanSubject,
        description: cleanDescription,
        email: email.trim() || undefined,
        name: user ? ((user as any).full_name || (user as any).username) : undefined,
      });

      setIsSubmitted(true);
      toast.success(SUCCESS_FEEDBACK_MESSAGE);
      resetForm();

      // Automatically close popover after brief celebration
      setTimeout(() => {
        handleClose();
      }, 3500);
    } catch (err: any) {
      console.error("Failed to submit feedback:", err);
      const errorMsg =
        err?.message || "Failed to send feedback. You can email us directly at support@yuvrolabs.com.";
      setSubmitError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const mailtoFallbackUrl = `mailto:support@yuvrolabs.com?subject=${encodeURIComponent(
    subject.trim() || "Improvement Suggestion"
  )}&body=${encodeURIComponent(description.trim())}`;

  return (
    <>
      {/* Floating Bottom-Right Feedback Panel (opens above the button on the right bottom only) */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-labelledby="feedback-dialog-title"
          className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[400px] max-w-[420px] max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          {/* Close button in top-right of panel */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Close feedback panel"
          >
            <X className="h-4 w-4" />
          </button>

          {isSubmitted ? (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Feedback Received!</h3>
                <p className="text-sm font-medium text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  {SUCCESS_FEEDBACK_MESSAGE}
                </p>
              </div>
              <div className="pt-2">
                <Button
                  size="sm"
                  onClick={handleClose}
                  className="px-6 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1 pr-6">
                <h3 id="feedback-dialog-title" className="text-base font-bold text-foreground">
                  Feedback & Suggestions
                </h3>
                <p className="text-xs text-muted-foreground">
                  Help us improve Yuvro Labs. Share your ideas or suggestions.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                {/* Subject - Mandatory */}
                <div className="space-y-1.5">
                  <Label htmlFor="feedback-subject" className="text-xs font-medium">
                    Subject <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="feedback-subject"
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      if (subjectError) setSubjectError(null);
                    }}
                    placeholder="e.g. Suggestion for Mock Interviews or New Lab"
                    className={subjectError ? "border-red-500 focus-visible:ring-red-500" : ""}
                    disabled={isSubmitting}
                  />
                  {subjectError && (
                    <p className="text-[11px] font-medium text-red-500">{subjectError}</p>
                  )}
                </div>

                {/* Description - Mandatory */}
                <div className="space-y-1.5">
                  <Label htmlFor="feedback-description" className="text-xs font-medium">
                    Description <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="feedback-description"
                    rows={4}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (descError) setDescError(null);
                    }}
                    placeholder="Please describe your improvement suggestion or feedback in detail..."
                    className={descError ? "border-red-500 focus-visible:ring-red-500" : ""}
                    disabled={isSubmitting}
                  />
                  {descError && (
                    <p className="text-[11px] font-medium text-red-500">{descError}</p>
                  )}
                </div>

                {/* Sender Context or Optional Email */}
                {user ? (
                  <div className="rounded-md bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
                    Submitting as{" "}
                    <span className="font-medium text-foreground">
                      {(user as any).email || (user as any).username || "Logged-in User"}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="feedback-email" className="text-xs font-medium text-muted-foreground">
                      Your Email <span className="text-[11px] font-normal">(optional, for replies)</span>
                    </Label>
                    <Input
                      id="feedback-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      disabled={isSubmitting}
                    />
                  </div>
                )}

                {/* Error Banner with Mailto Fallback */}
                {submitError && (
                  <div className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p>{submitError}</p>
                      <a
                        href={mailtoFallbackUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block font-semibold underline hover:text-red-700"
                      >
                        Click here to mail support@yuvrolabs.com directly
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="border-0 hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting}
                    className="gap-1.5 bg-[#f7931e] hover:bg-[#f7931e]/90 text-white font-medium"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Send feedback</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      )}

      {/* Floating Support Button in Bottom Right */}
      <div className="fixed bottom-6 right-6 z-40 print:hidden">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => {
            if (isOpen) {
              handleClose();
            } else {
              setIsOpen(true);
              setIsSubmitted(false);
            }
          }}
          aria-label={isOpen ? "Close feedback" : "Give feedback or improvement suggestion"}
          className={`group flex items-center justify-center rounded-full px-4 py-2 text-xs font-medium tracking-tight shadow-md backdrop-blur-sm transition-all duration-200 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
            isOpen
              ? "border-0 border-transparent bg-orange-500/10 text-orange-600 dark:text-orange-400"
              : "border border-border/80 bg-background/95 text-foreground hover:border-orange-500/50 hover:scale-105"
          }`}
        >
          {isOpen ? "Close" : "Feedback"}
        </button>
      </div>
    </>
  );
}

export default SupportFeedbackButton;
