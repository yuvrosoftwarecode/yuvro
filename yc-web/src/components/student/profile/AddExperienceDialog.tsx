import React, { useState, useEffect } from "react";
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
import { Plus, X, Building2, Calendar, Briefcase } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface ExperienceForm {
  company: string;
  role: string;
  duration: string;
  description_list: string[];
  technologies: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onSave: (exp: ExperienceForm) => void;
  editingData: ExperienceForm | null; // null = add mode, not null = edit mode
}

const AddExperienceDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSave,
  editingData,
}) => {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [duration, setDuration] = useState("");

  const [responsibilities, setResponsibilities] = useState<string[]>([""]);
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [techInput, setTechInput] = useState("");

  // Load edit mode data
  useEffect(() => {
    if (editingData) {
      setCompany(editingData.company);
      setRole(editingData.role);
      setDuration(editingData.duration);
      setResponsibilities(editingData.description_list);
      setTechnologies(editingData.technologies);
    } else {
      setCompany("");
      setRole("");
      setDuration("");
      setResponsibilities([""]);
      setTechnologies([]);
    }
  }, [editingData]);

  const addResponsibility = () => {
    if (responsibilities.length < 5) {
      setResponsibilities([...responsibilities, ""]);
    }
  };

  const updateResponsibility = (index: number, value: string) => {
    const updated = [...responsibilities];
    updated[index] = value;
    setResponsibilities(updated);
  };

  const removeResponsibility = (index: number) => {
    setResponsibilities(responsibilities.filter((_, i) => i !== index));
  };

  const addTechnology = () => {
    if (techInput.trim() && !technologies.includes(techInput.trim())) {
      setTechnologies([...technologies, techInput.trim()]);
      setTechInput("");
    }
  };

  const removeTechnology = (tech: string) => {
    setTechnologies(technologies.filter((t) => t !== tech));
  };

  const handleSubmit = () => {
    const filtered = responsibilities.filter((r) => r.trim() !== "");
    if (filtered.length === 0) {
      toast({
        title: "Add at least one responsibility",
        variant: "destructive",
      });
      return;
    }

    const payload: ExperienceForm = {
      company,
      role,
      duration,
      description_list: filtered,
      technologies,
    };

    onSave(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] rounded-2xl border-0 shadow-2xl bg-white/95 backdrop-blur-xl ring-1 ring-black/5 p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 border-b border-slate-100/50 bg-gradient-to-r from-slate-50/50 to-white flex-shrink-0">
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            {editingData ? "Edit Experience" : "Add Experience"}
          </DialogTitle>
          <DialogDescription className="text-slate-500 mt-1.5 text-sm">
            Add or edit your professional experience details.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          <div className="space-y-6 p-6">
            {/* Top Row: Company & Role */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</Label>
                <div className="relative group">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Google, Microsoft..."
                    className="pl-9 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</Label>
                <div className="relative group">
                  <Briefcase className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Frontend Developer..."
                    className="pl-9 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration</Label>
              <div className="relative group">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Jun 2023 - Aug 2023..."
                  className="pl-9 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
                />
              </div>
            </div>

            {/* TECHNOLOGIES */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Technologies Used</Label>
              <div className="flex gap-2">
                <Input
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTechnology();
                    }
                  }}
                  placeholder="Add tech stack (e.g., React, Node.js)..."
                  className="bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
                />
                <Button
                  type="button"
                  onClick={addTechnology}
                  className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl px-4"
                >
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 mt-2 min-h-[30px]">
                {technologies.map((tech, index) => (
                  <Badge key={`${tech}-${index}`} variant="secondary" className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 rounded-lg transition-colors">
                    {tech}
                    <button
                      type="button"
                      className="ml-2 hover:text-blue-900"
                      onClick={() => removeTechnology(tech)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* RESPONSIBILITIES */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Key Responsibilities</Label>
                <span className="text-xs text-muted-foreground">{responsibilities.length}/5</span>
              </div>

              {responsibilities.map((resp, index) => (
                <div key={index} className="flex gap-2 group">
                  <Textarea
                    value={resp}
                    onChange={(e) =>
                      updateResponsibility(index, e.target.value)
                    }
                    rows={2}
                    placeholder="Describe a key achievement or responsibility..."
                    className="bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl resize-none"
                  />
                  {responsibilities.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeResponsibility(index)}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              {responsibilities.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addResponsibility}
                  className="w-full border-dashed border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 rounded-xl h-10"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Another Responsibility
                </Button>
              )}
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="rounded-xl hover:bg-slate-100 text-slate-500"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/10 px-8"
              >
                {editingData ? "Save Changes" : "Add Experience"}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddExperienceDialog;
