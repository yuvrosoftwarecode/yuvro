import React, { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Globe, Github, LayoutGrid, Code, Link as LinkIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "@/hooks/use-toast";

// Data used when adding/updating
export interface ProjectForm {
  title: string;
  description: string;
  role: string;
  tech_stack: string[];
  github_link?: string | null;
  live_link?: string | null;
}

interface AddProjectDialogProps {
  open: boolean;
  editingData?: any | null; // Project data for edit mode
  onOpenChange: (open: boolean) => void;
  onSave: (project: ProjectForm) => void;
}

const AddProjectDialog: React.FC<AddProjectDialogProps> = ({
  open,
  onOpenChange,
  editingData,
  onSave,
}) => {
  const { register, handleSubmit, reset, setValue } = useForm<ProjectForm>();
  const [techStack, setTechStack] = useState<string[]>([]);
  const [techInput, setTechInput] = useState("");

  const isEditMode = Boolean(editingData);

  /* ---------------------------------------------- *
   * PREFILL FIELDS IN EDIT MODE
   * ---------------------------------------------- */
  useEffect(() => {
    if (editingData) {
      setValue("title", editingData.title);
      setValue("description", editingData.description);
      setValue("role", editingData.role);
      setValue("github_link", editingData.github_link || "");
      setValue("live_link", editingData.live_link || "");
      setTechStack(editingData.tech_stack || []);
    } else {
      reset();
      setTechStack([]);
    }
  }, [editingData, setValue, reset]);

  /* ---------------------------------------------- *
   * TECH STACK HANDLING
   * ---------------------------------------------- */
  const addTech = () => {
    if (techInput.trim() && !techStack.includes(techInput.trim())) {
      setTechStack([...techStack, techInput.trim()]);
      setTechInput("");
    }
  };

  const removeTech = (tech: string) => {
    setTechStack(techStack.filter((t) => t !== tech));
  };

  /* ---------------------------------------------- *
   * SUBMIT HANDLER (ADD or EDIT)
   * ---------------------------------------------- */
  const onSubmit = (data: ProjectForm) => {
    if (techStack.length === 0) {
      toast({
        title: "Tech Stack Required",
        description: "Please add at least one technology.",
        variant: "destructive",
      });
      return;
    }

    const payload: ProjectForm = {
      title: data.title,
      description: data.description,
      role: data.role,
      tech_stack: techStack,
      github_link: data.github_link || null,
      live_link: data.live_link || null,
    };

    onSave(payload);

    toast({
      title: isEditMode ? "Project updated!" : "Project added!",
    });

    reset();
    setTechStack([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] rounded-2xl border-0 shadow-2xl bg-white/95 backdrop-blur-xl ring-1 ring-black/5 p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 border-b border-slate-100/50 bg-gradient-to-r from-slate-50/50 to-white flex-shrink-0">
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            {isEditMode ? "Edit Project" : "Add Project"}
          </DialogTitle>
          <DialogDescription className="text-slate-500 mt-1.5 text-sm">
            Add or edit details about your project.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
            {/* Top Row: Title & Role */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project Title</Label>
                <div className="relative group">
                  <LayoutGrid className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    id="title"
                    {...register("title", { required: true })}
                    placeholder="e.g., RideWise App"
                    className="pl-9 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Role</Label>
                <div className="relative group">
                  <Code className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    id="role"
                    {...register("role", { required: true })}
                    placeholder="e.g., Backend Developer"
                    className="pl-9 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</Label>
              <Textarea
                id="description"
                {...register("description", { required: true })}
                rows={3}
                placeholder="Describe the problem you solved, usage of the project, etc."
                className="bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl resize-none leading-relaxed"
              />
            </div>

            {/* Tech Stack */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tech Stack</Label>
              <div className="flex gap-2">
                <Input
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addTech())
                  }
                  placeholder="e.g., React, Django, PostgreSQL"
                  className="bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
                />
                <Button
                  type="button"
                  onClick={addTech}
                  className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl px-4"
                >
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 mt-2 min-h-[30px]">
                {techStack.map((tech, index) => (
                  <Badge key={`${tech}-${index}`} variant="secondary" className="px-3 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100 rounded-lg transition-colors">
                    {tech}
                    <button
                      type="button"
                      onClick={() => removeTech(tech)}
                      className="ml-2 hover:text-purple-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Links */}
            <div className="grid grid-cols-2 gap-6 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              {/* GitHub */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">GitHub Link</Label>
                <div className="group flex items-center gap-2 bg-white rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-slate-200 transition-all px-3 h-10">
                  <Github className="w-4 h-4 text-slate-400 group-focus-within:text-black" />
                  <Input
                    {...register("github_link")}
                    placeholder="https://github.com/..."
                    className="border-none bg-transparent shadow-none focus-visible:ring-0 p-0 h-full text-sm"
                  />
                </div>
              </div>

              {/* Live Link */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Demo Link</Label>
                <div className="group flex items-center gap-2 bg-white rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-blue-200 transition-all px-3 h-10">
                  <LinkIcon className="w-4 h-4 text-slate-400 group-focus-within:text-blue-500" />
                  <Input
                    {...register("live_link")}
                    placeholder="https://..."
                    className="border-none bg-transparent shadow-none focus-visible:ring-0 p-0 h-full text-sm"
                  />
                </div>
              </div>
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
                {isEditMode ? "Save Changes" : "Add Project"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddProjectDialog;
