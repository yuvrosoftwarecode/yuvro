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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { toast } from "@/hooks/use-toast";

export interface SkillForm {
  name: string;
  level: string;
  percentage: number;
}

interface AddSkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // For editing mode
  editingData?: any | null;

  // Callback for Add / Update
  onSave: (skill: SkillForm) => void;
}

const AddSkillDialog: React.FC<AddSkillDialogProps> = ({
  open,
  onOpenChange,
  editingData,
  onSave,
}) => {
  const { register, handleSubmit, control, reset, setValue } =
    useForm<SkillForm>({
      defaultValues: {
        name: "",
        level: "Beginner",
        percentage: 30,
      },
    });

  const LEVEL_PERCENTAGE = {
    Beginner: 30,
    Intermediate: 65,
    Advanced: 85,
  };

  const isEditMode = Boolean(editingData);

  /* ---------------------------------------------- *
   * PREFILL DATA IN EDIT MODE
   * ---------------------------------------------- */
  useEffect(() => {
    if (editingData) {
      setValue("name", editingData.name);
      setValue("level", editingData.level);
      setValue("percentage", editingData.percentage);
    } else {
      reset({
        name: "",
        level: "Beginner",
        percentage: 30,
      });
    }
  }, [editingData, reset, setValue]);

  /* ---------------------------------------------- *
   * SUBMIT HANDLER
   * ---------------------------------------------- */
  const onSubmit = (data: SkillForm) => {
    const percentage = LEVEL_PERCENTAGE[data.level as keyof typeof LEVEL_PERCENTAGE];

    const formattedData = {
      name: data.name,
      level: data.level,
      percentage: percentage,
    };

    onSave(formattedData);

    toast({
      title: isEditMode ? "Skill updated!" : "Skill added!",
    });

    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-0 shadow-2xl bg-white/95 backdrop-blur-xl ring-1 ring-black/5 p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 border-b border-slate-100/50 bg-gradient-to-r from-slate-50/50 to-white flex-shrink-0">
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            {isEditMode ? "Edit Skill" : "Add Skill"}
          </DialogTitle>
          <DialogDescription className="text-slate-500 mt-1.5 text-sm">
            Add or edit your skills and proficiency levels.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
            {/* Skill Name */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skill Name</Label>
              <Input
                {...register("name", { required: true })}
                placeholder="e.g., React, Python"
                className="bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
              />
            </div>

            {/* Skill Level */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Proficiency Level</Label>
              <Controller
                name="level"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setValue(
                        "percentage",
                        LEVEL_PERCENTAGE[value as keyof typeof LEVEL_PERCENTAGE]
                      );
                    }}
                    defaultValue={field.value}
                  >
                    <SelectTrigger className="bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-0 shadow-xl">
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

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
                {isEditMode ? "Save Changes" : "Add Skill"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddSkillDialog;
