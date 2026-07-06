import React from "react";
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
import { useForm } from "react-hook-form";
import { toast } from "@/hooks/use-toast";
import profileService from "@/services/profileService";
import { Github, Linkedin, Globe, Upload, ChevronDown } from "lucide-react";
import { collegeService, College, Department } from "@/services/collegeService";

interface EditProfileData {
  first_name: string;
  last_name: string;
  title: string;
  location: string;
  about: string;
  college?: string | 'other' | null;
  college_other?: string | null;
  department?: string | 'other' | null;
  department_other?: string | null;
  student_id?: string;
  id_card_image?: string | File | null;
  github?: string;
  linkedin?: string;
  portfolio?: string;
}

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileData: EditProfileData;
  onSave: (data: EditProfileData) => void;
}

const EditProfileDialog: React.FC<EditProfileDialogProps> = ({
  open,
  onOpenChange,
  profileData,
  onSave,
}) => {
  const { register, handleSubmit, setValue, watch, reset } = useForm<EditProfileData>({
    defaultValues: profileData,
  });

  const [colleges, setColleges] = React.useState<College[]>([]);
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);

  // Custom dropdown states (replacing Radix Select to avoid Dialog focus-trap conflicts)
  const [collegeDropdownOpen, setCollegeDropdownOpen] = React.useState(false);
  const [deptDropdownOpen, setDeptDropdownOpen] = React.useState(false);
  const collegeDropdownRef = React.useRef<HTMLDivElement>(null);
  const deptDropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedCollege = watch("college");
  const selectedDepartment = watch("department");

  // Reset form data when dialog opens or profileData changes
  React.useEffect(() => {
    if (open) {
      reset(profileData);
    }
  }, [open, profileData, reset]);

  // Load colleges
  React.useEffect(() => {
    if (open) {
      collegeService.getColleges('approved').then(setColleges).catch(console.error);
    }
  }, [open]);

  // Load departments (standalone global list)
  React.useEffect(() => {
    if (open) {
      collegeService.getDepartments('approved').then(setDepartments).catch(console.error);
    }
  }, [open]);

  // Close dropdowns on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (collegeDropdownRef.current && !collegeDropdownRef.current.contains(e.target as Node)) {
        setCollegeDropdownOpen(false);
      }
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(e.target as Node)) {
        setDeptDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleIdCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setValue("id_card_image", file);
    }
  };

  // Get display name for selected college
  const getCollegeDisplayName = () => {
    if (selectedCollege === 'other') return "Other (My College is not listed)";
    if (selectedCollege && typeof selectedCollege === 'string' && selectedCollege !== 'other') {
      const found = colleges.find(c => String(c.id) === selectedCollege);
      return found?.name || "Select your college";
    }
    return "Select your college";
  };

  // Get display name for selected department
  const getDeptDisplayName = () => {
    if (selectedDepartment === 'other') return "Other (My Department is not listed)";
    if (selectedDepartment && typeof selectedDepartment === 'string' && selectedDepartment !== 'other') {
      const found = departments.find(d => String(d.id) === selectedDepartment);
      return found?.name || "Select your department";
    }
    return "Select your department";
  };

  const onSubmit = async (data: EditProfileData) => {
    setIsSaving(true);
    try {
      // If 'other' department is selected, create a pending department record
      if (data.department === 'other' && data.department_other?.trim()) {
        try {
          const newDept = await collegeService.createDepartment({ name: data.department_other.trim() });
          data.department = String(newDept.id);
        } catch (err: any) {
          // If department already exists, ignore the error — admin will handle
          console.warn('Department creation note:', err);
        }
      }

      // Clear department_other if a real department is selected
      if (data.department && data.department !== 'other') {
        data.department_other = null;
      }

      await profileService.updateProfile(data);

      // Update social links separately
      await profileService.updateSocialLinks({
        github: data.github,
        linkedin: data.linkedin,
        portfolio: data.portfolio,
      });

      onSave(data);
      toast({ title: "Profile updated successfully!" });
      onOpenChange(false);
    } catch (error: any) {
      console.error("ERROR:", error);
      toast({
        title: "Update failed",
        description: error?.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] rounded-2xl border-0 shadow-2xl bg-white/95 backdrop-blur-xl ring-1 ring-black/5 p-0 flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100/50 bg-gradient-to-r from-slate-50/50 to-white flex-shrink-0">
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Edit Profile
          </DialogTitle>
          <DialogDescription className="text-slate-500 mt-1.5 text-sm">
            Make changes to your profile information here.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
            {/* Name Section */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">First Name</Label>
                <Input
                  id="first_name"
                  {...register("first_name")}
                  className="bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Name</Label>
                <Input
                  id="last_name"
                  {...register("last_name")}
                  className="bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
                />
              </div>
            </div>

            {/* Title & Location */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Professional Title</Label>
                <Input
                  id="title"
                  {...register("title")}
                  placeholder="e.g., Full Stack Developer"
                  className="bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</Label>
                <Input
                  id="location"
                  {...register("location")}
                  placeholder="e.g., San Francisco, CA"
                  className="bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
                />
              </div>
            </div>

            {/* About */}
            <div className="space-y-2">
              <Label htmlFor="about" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">About Me</Label>
              <Textarea
                id="about"
                {...register("about")}
                placeholder="Tell your story..."
                className="min-h-[100px] bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl resize-none leading-relaxed"
              />
            </div>

            {/* Academic Profile */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="font-bold text-sm mb-4 text-slate-800 flex items-center gap-2">
                <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                Academic Profile
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                {/* College - Custom Dropdown */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">College</Label>
                  <div className="relative" ref={collegeDropdownRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setCollegeDropdownOpen(!collegeDropdownOpen);
                        setDeptDropdownOpen(false);
                      }}
                      className="flex h-9 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    >
                      <span className={selectedCollege ? "text-slate-900" : "text-slate-400"}>
                        {getCollegeDisplayName()}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${collegeDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {collegeDropdownOpen && (
                      <div className="absolute z-[99999] mt-1 w-full max-h-[200px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                        {colleges.map((c: { id: any; name: any; }) => (
                          <button
                            key={c.id}
                            type="button"
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${String(selectedCollege) === String(c.id) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                              }`}
                            onClick={() => {
                              setValue('college', String(c.id));
                              setCollegeDropdownOpen(false);
                            }}
                          >
                            {c.name}
                          </button>
                        ))}
                        <button
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-t border-slate-100 transition-colors ${selectedCollege === 'other' ? 'bg-amber-50 text-amber-700 font-medium' : 'text-slate-500 italic'
                            }`}
                          onClick={() => {
                            setValue('college', 'other');
                            setCollegeDropdownOpen(false);
                          }}
                        >
                          Other (My College is not listed)
                        </button>
                      </div>
                    )}
                  </div>
                  {selectedCollege === 'other' && (
                    <div className="mt-2">
                      <Input
                        {...register('college_other')}
                        placeholder="e.g. ABC Institute of Technology"
                        className="bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                      />
                      <p className="text-xs text-amber-600 mt-1">This will be shown on your profile. Verified colleges are added by our team for contest eligibility.</p>
                    </div>
                  )}
                </div>
                {/* Department - Custom Dropdown (standalone, not tied to college) */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department</Label>
                  <div className="relative" ref={deptDropdownRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setDeptDropdownOpen(!deptDropdownOpen);
                        setCollegeDropdownOpen(false);
                      }}
                      className="flex h-9 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    >
                      <span className={selectedDepartment ? "text-slate-900" : "text-slate-400"}>
                        {getDeptDisplayName()}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${deptDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {deptDropdownOpen && (
                      <div className="absolute z-[99999] mt-1 w-full max-h-[200px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-slate-400 italic"
                          onClick={() => {
                            setValue('department', null);
                            setValue('department_other', null);
                            setDeptDropdownOpen(false);
                          }}
                        >
                          No Department
                        </button>
                        {departments.map(d => (
                          <button
                            key={d.id}
                            type="button"
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${String(selectedDepartment) === String(d.id) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                              }`}
                            onClick={() => {
                              setValue('department', String(d.id));
                              setValue('department_other', null);
                              setDeptDropdownOpen(false);
                            }}
                          >
                            {d.name}
                          </button>
                        ))}
                        <button
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-t border-slate-100 transition-colors ${selectedDepartment === 'other' ? 'bg-amber-50 text-amber-700 font-medium' : 'text-slate-500 italic'
                            }`}
                          onClick={() => {
                            setValue('department', 'other');
                            setDeptDropdownOpen(false);
                          }}
                        >
                          Other (My Department is not listed)
                        </button>
                      </div>
                    )}
                  </div>
                  {selectedDepartment === 'other' && (
                    <div className="mt-2">
                      <Input
                        {...register('department_other')}
                        placeholder="e.g. Biomedical Engineering"
                        className="bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                      />
                      <p className="text-xs text-amber-600 mt-1">This department will be submitted for admin verification and will be available for all students once approved.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student ID (Roll Number)</Label>
                  <Input
                    {...register('student_id')}
                    placeholder="e.g. 21CS001"
                    className="bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID Card Scan</Label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer">
                      <div className="h-10 px-3 bg-slate-50/50 border border-slate-200 rounded-xl flex items-center gap-2 hover:bg-slate-100 transition-colors justify-center text-sm font-medium text-slate-700">
                        <Upload className="h-4 w-4" />
                        {watch('id_card_image') ? "Update ID Card" : "Upload ID Card"}
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={handleIdCardUpload}
                      />
                    </label>
                    {watch('id_card_image') && typeof watch('id_card_image') === 'string' && (
                      <a href={watch('id_card_image') as string} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-600 hover:text-blue-700">
                        View
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="font-bold text-sm mb-4 text-slate-800 flex items-center gap-2">
                <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                Social Presence
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="group flex items-center gap-3 p-1 rounded-xl focus-within:ring-2 focus-within:ring-slate-200 transition-all bg-slate-50/50 border border-slate-200/50">
                  <div className="p-2 bg-white rounded-lg shadow-sm group-focus-within:text-black text-slate-400 transition-colors">
                    <Github size={18} />
                  </div>
                  <Input
                    id="github"
                    {...register("github")}
                    placeholder="GitHub URL"
                    className="border-none bg-transparent shadow-none focus-visible:ring-0 h-9 p-0 text-sm"
                  />
                </div>

                <div className="group flex items-center gap-3 p-1 rounded-xl focus-within:ring-2 focus-within:ring-blue-200 transition-all bg-slate-50/50 border border-slate-200/50">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-blue-400 group-focus-within:text-blue-600 transition-colors">
                    <Linkedin size={18} />
                  </div>
                  <Input
                    id="linkedin"
                    {...register("linkedin")}
                    placeholder="LinkedIn URL"
                    className="border-none bg-transparent shadow-none focus-visible:ring-0 h-9 p-0 text-sm"
                  />
                </div>

                <div className="group flex items-center gap-3 p-1 rounded-xl focus-within:ring-2 focus-within:ring-purple-200 transition-all bg-slate-50/50 border border-slate-200/50">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-purple-400 group-focus-within:text-purple-600 transition-colors">
                    <Globe size={18} />
                  </div>
                  <Input
                    id="portfolio"
                    {...register("portfolio")}
                    placeholder="Website URL"
                    className="border-none bg-transparent shadow-none focus-visible:ring-0 h-9 p-0 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sticky footer */}
          <DialogFooter className="gap-2 p-4 border-t border-slate-100 bg-white flex-shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-xl hover:bg-slate-100 text-slate-500"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/10 px-6"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileDialog;
