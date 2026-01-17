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
import { useForm } from "react-hook-form";
import { toast } from "@/hooks/use-toast";
import { Award, Building, Calendar } from "lucide-react";

export interface CertificationForm {
  name: string;
  issuer: string;
  completion_date: string;
  certificate_file?: File | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // null = Add mode, object = Edit mode
  editingData: any | null;

  onSave: (form: CertificationForm) => void;
}

const AddCertificationDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  editingData,
  onSave,
}) => {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: editingData || {
      name: "",
      issuer: "",
      completion_date: "",
    },
  });

  const handleSubmitForm = (data: any) => {
    const payload: CertificationForm = {
      name: data.name,
      issuer: data.issuer,
      completion_date: data.completion_date,
    };

    onSave(payload);
    toast({ title: editingData ? "Certification updated!" : "Certification added!" });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] rounded-2xl border-0 shadow-2xl bg-white/95 backdrop-blur-xl ring-1 ring-black/5 p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 border-b border-slate-100/50 bg-gradient-to-r from-slate-50/50 to-white flex-shrink-0">
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            {editingData ? "Edit Certification" : "Add Certification"}
          </DialogTitle>
          <DialogDescription className="hidden">
            Add or edit your certifications and licenses.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6 p-6">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Certification Name</Label>
              <div className="relative group">
                <Award className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  {...register("name", { required: true })}
                  className="pl-9 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Issuer</Label>
                <div className="relative group">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    {...register("issuer", { required: true })}
                    className="pl-9 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Completion Date</Label>
                <div className="relative group">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    type="date"
                    {...register("completion_date", { required: true })}
                    className="pl-9 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl w-full"
                    style={{ display: 'block' }} // Fix for some date input styling issues
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
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
                {editingData ? "Save Changes" : "Add Certification"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddCertificationDialog;
