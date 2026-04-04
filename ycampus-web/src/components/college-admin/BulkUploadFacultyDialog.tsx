import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useProfiles } from '@/hooks/useProfiles';
import { useDepartments } from '@/hooks/useDepartments';
import { supabase } from '@/integrations/supabase/client';

export function BulkUploadFacultyDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addProfile } = useProfiles();
  const { departments } = useDepartments();

  const downloadTemplate = () => {
    const headers = ['Full Name', 'Email', 'Department Code', 'Reporting Manager Email', 'Subject Code', 'Semester'];
    const exampleData = [
      'John Doe,john.doe@college.edu,CSE,hod@college.edu,CS101,1',
      'Jane Smith,jane.smith@college.edu,IT,principal@college.edu,IT201,2'
    ];

    const csv = [headers.join(','), ...exampleData].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'faculty_bulk_upload_template.csv';
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

      const requiredHeaders = ['Full Name', 'Email', 'Department Code', 'Reporting Manager Email', 'Subject Code', 'Semester'];
      const hasAllHeaders = requiredHeaders.every(h => headers.includes(h));

      if (!hasAllHeaders) {
        throw new Error('Invalid CSV format. Please use the provided template.');
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

          const department = departments?.find(d => d.code === row['Department Code']);
          if (!department) {
            throw new Error(`Department ${row['Department Code']} not found`);
          }

          // Create faculty profile
          const profile = await addProfile({
            email: row['Email'],
            full_name: row['Full Name'],
            role: 'faculty'
          });

          if (!profile || !profile.id) {
            throw new Error('Failed to create faculty profile');
          }

          // Get course by code
          const { data: courses } = await supabase
            .from('courses')
            .select('id')
            .eq('code', row['Subject Code'])
            .eq('department_id', department.id)
            .single();

          if (courses) {
            // Add assignment
            const currentYear = new Date().getFullYear();
            await supabase
              .from('faculty_subject_mapping')
              .insert({
                faculty_id: profile.id,
                course_id: courses.id,
                department_id: department.id,
                semester: parseInt(row['Semester']),
                academic_year: `${currentYear}-${currentYear + 1}`,
                is_active: true
              });
          }

          successCount++;
        } catch (error) {
          console.error(`Error processing row ${i}:`, error);
          errorCount++;
        }
      }

      toast.success(`Successfully added ${successCount} faculty members. ${errorCount} errors.`);
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
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Upload Faculty</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Button onClick={downloadTemplate} variant="outline" className="w-full">
            Download CSV Template
          </Button>
          
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={loading}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              variant="secondary"
            >
              <Upload className="mr-2 h-4 w-4" />
              {loading ? 'Processing...' : 'Upload CSV File'}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Upload a CSV file with faculty data
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}