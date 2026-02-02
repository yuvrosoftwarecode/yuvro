import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { toast } from "@/hooks/use-toast";
import { GraduationCap, Calendar, BookOpen, Award } from "lucide-react";

export interface EducationForm {
  institution: string;
  degree: string;
  field: string;
  duration: string;
  cgpa?: string | null;
}

interface AddEducationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // For editing mode
  editingData?: any | null;

  // Callback for add/update
  onSave: (education: EducationForm) => void;
}

const AddEducationDialog: React.FC<AddEducationDialogProps> = ({
  open,
  onOpenChange,
  editingData,
  onSave,
}) => {
  const { register, handleSubmit, reset, setValue } = useForm<EducationForm>();

  const isEditMode = Boolean(editingData);

  /* ---------------------------------------------- *
   * PREFILL IN EDIT MODE
   * ---------------------------------------------- */
  useEffect(() => {
    if (editingData) {
      setValue("institution", editingData.institution);
      setValue("degree", editingData.degree);
      setValue("field", editingData.field);
      setValue("duration", editingData.duration);
      setValue("cgpa", editingData.cgpa || "");
    } else {
      reset();
    }
  }, [editingData, setValue, reset]);

  /* ---------------------------------------------- *
   * SUBMIT ADD/UPDATE
   * ---------------------------------------------- */
  const onSubmit = (data: EducationForm) => {
    onSave({
      institution: data.institution,
      degree: data.degree,
      field: data.field,
      duration: data.duration,
      cgpa: data.cgpa || null,
    });

    toast({
      title: isEditMode ? "Education updated!" : "Education added!",
    });

    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] rounded-2xl border-0 shadow-2xl bg-white/95 backdrop-blur-xl ring-1 ring-black/5 p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 border-b border-slate-100/50 bg-gradient-to-r from-slate-50/50 to-white flex-shrink-0">
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            {isEditMode ? "Edit Education" : "Add Education"}
          </DialogTitle>
          <DialogDescription className="text-slate-500 mt-1.5 text-sm">
            Add or edit your educational background.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
            {/* Institution */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Institution / College</Label>
              <div className="relative group">
                <GraduationCap className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  {...register("institution", { required: true })}
                  placeholder="e.g., ABC Institute of Technology"
                  className="pl-9 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
                />
              </div>
            </div>

            {/* Degree + Field */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Degree</Label>
                <div className="relative group">
                  <Award className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    {...register("degree", { required: true })}
                    placeholder="e.g., B.Tech"
                    className="pl-9 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Field of Study</Label>
                <div className="relative group">
                  <BookOpen className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    {...register("field", { required: true })}
                    placeholder="e.g., Computer Science"
                    className="pl-9 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Duration + CGPA */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration</Label>
                <div className="relative group">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    {...register("duration", { required: true })}
                    placeholder="2021 - 2025"
                    className="pl-9 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CGPA / Percentage</Label>
                <Input
                  {...register("cgpa")}
                  placeholder="e.g., 8.7"
                  className="bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
                />
              </div>
            </div>

            {/* Footer */}
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="rounded-xl hover:bg-slate-100 text-slate-500"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/10 px-8"
              >
                {isEditMode ? "Save Changes" : "Add Education"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddEducationDialog;
