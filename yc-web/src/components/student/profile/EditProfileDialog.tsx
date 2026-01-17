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
import { Github, Linkedin, Globe } from "lucide-react";

interface EditProfileData {
  first_name: string;
  last_name: string;
  title: string;
  location: string;
  about: string;
  // Social Links
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
  const { register, handleSubmit } = useForm({
    defaultValues: profileData,
  });

  const onSubmit = async (data: EditProfileData) => {
    try {
      // 1. Update Basic Profile
      const updatedProfile = await profileService.updateProfile(data);

      // 2. Update Social Links
      await profileService.updateSocialLinks({
        github: data.github,
        linkedin: data.linkedin,
        portfolio: data.portfolio,
      });

      // 3. Refresh Parent
      onSave(updatedProfile); // This will trigger reload in parent

      toast({ title: "Profile updated successfully!" });
      onOpenChange(false);
    } catch (error: any) {
      console.error("ERROR:", error);
      toast({
        title: "Update failed",
        description: error?.message || "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] rounded-2xl border-0 shadow-2xl bg-white/95 backdrop-blur-xl ring-1 ring-black/5 p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 border-b border-slate-100/50 bg-gradient-to-r from-slate-50/50 to-white flex-shrink-0">
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Edit Profile
          </DialogTitle>
          <DialogDescription className="text-slate-500 mt-1.5 text-sm">
            Make changes to your profile information here.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
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

            {/* Title & Location Row */}
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

            {/* Social Links Section */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="font-bold text-sm mb-4 text-slate-800 flex items-center gap-2">
                <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                Social Presence
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* GitHub */}
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

                {/* LinkedIn */}
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

                {/* Portfolio */}
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

            <DialogFooter className="gap-2 pt-2">
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
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/10 px-6"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileDialog;
