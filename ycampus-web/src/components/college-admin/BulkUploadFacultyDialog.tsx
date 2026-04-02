import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Download, X, CheckCircle2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useDepartments } from '@/hooks/useDepartments';
import { supabase } from '@/integrations/supabase/client';
import { facultyService } from '@/services/facultyService';
import { useAuth } from '@/contexts/AuthContext';

export function BulkUploadFacultyDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { departments } = useDepartments();
  const { user } = useAuth();

  const downloadTemplate = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Username', 'Designation', 'Primary Department Code'];
    const exampleData = [
      'John,Doe,john.doe@college.edu,jdoe,Senior Professor,CSE',
      'Jane,Smith,jane.smith@college.edu,jsmith,Lecturer,IT'
    ];

    const csv = [headers.join(','), ...exampleData].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'faculty_onboarding_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());

      const requiredHeaders = ['First Name', 'Last Name', 'Email', 'Primary Department Code'];
      const hasAllHeaders = requiredHeaders.every(h => headers.includes(h));

      if (!hasAllHeaders) {
        throw new Error(`Invalid CSV format. Missing one of: ${requiredHeaders.join(', ')}`);
      }

      let successCount = 0;
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',').map(v => v.trim());
          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });

          const department = departments?.find(d => d.code === row['Primary Department Code'] || d.name === row['Primary Department Code']);
          if (!department) {
            throw new Error(`Department ${row['Primary Department Code']} not found`);
          }

          // Create faculty profile via REST Service
          await facultyService.createFaculty({
            user: {
              first_name: row['First Name'],
              last_name: row['Last Name'],
              email: row['Email'],
              username: row['Username'] || row['Email'],
              password: 'ChangeMe@123'
            },
            college: user?.college_id || '1',
            department: department.id.toString(),
            linked_departments: [],
            designation: row['Designation'] || 'Academic Faculty'
          });

          successCount++;
        } catch (error) {
          console.error(`Error processing row ${i}:`, error);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        toast.success(`Successfully onboarded ${successCount} faculty members.`);
      } else {
        toast.info(`Onboarded ${successCount} members. ${errorCount} records failed.`);
      }
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to process file');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-12 border-zinc-200 rounded-2xl font-bold text-xs uppercase tracking-widest px-6 shadow-sm hover:bg-zinc-50">
          <Upload className="mr-2 h-4 w-4" />
          Bulk Action
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0 border-none rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="flex">
            {/* Left Sidebar */}
            <div className="w-56 bg-zinc-900 p-8 flex flex-col justify-between text-white shrink-0">
                <div>
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center mb-6">
                        <FileText className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-black leading-tight tracking-tight">Bulk Import</h3>
                    <p className="mt-3 text-zinc-500 text-[11px] font-medium leading-relaxed uppercase tracking-wider">Sync Academic Records</p>
                </div>
                
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-3.5 w-3.5 text-zinc-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Auto-Pass</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 bg-white p-10">
                <div className="space-y-8">
                    <div>
                        <h4 className="text-lg font-black text-zinc-900 tracking-tight">Onboard Academic Staff</h4>
                        <p className="text-zinc-500 text-sm font-medium mt-1">Upload a structured CSV to register multiple faculty members at once.</p>
                    </div>

                    <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100/50 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Step 1: Get Template</span>
                            <Download className="h-3.5 w-3.5 text-zinc-300" />
                        </div>
                        <Button onClick={downloadTemplate} variant="ghost" className="h-12 bg-white border border-zinc-100 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all">
                            Download Template Structure
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Step 2: Upload Files</span>
                        <div className="border-2 border-dashed border-zinc-100 rounded-3xl p-12 text-center group hover:border-zinc-300 transition-all cursor-pointer relative overflow-hidden bg-zinc-50/20"
                             onClick={() => !loading && fileInputRef.current?.click()}>
                            <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            className="hidden"
                            disabled={loading}
                            />
                            
                            <div className="relative z-10 flex flex-col items-center gap-4">
                                <div className="h-16 w-16 rounded-[2rem] bg-white shadow-xl shadow-zinc-200 border border-zinc-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                    <Upload className={`h-6 w-6 text-zinc-900 ${loading ? 'animate-bounce' : ''}`} />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-zinc-900">
                                        {loading ? 'Processing Records...' : 'Drop CSV File Here'}
                                    </p>
                                    <p className="text-[11px] text-zinc-400 font-medium mt-1">Click to browse your locale storage</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 px-4 py-3 bg-red-50/50 rounded-xl border border-red-50 shrink-0">
                        <ShieldAlert className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        <p className="text-[10px] font-bold text-red-700/80 leading-relaxed italic">
                            Ensure Department Codes in CSV match existing system records exactly.
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}