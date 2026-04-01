import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useProfiles } from '@/hooks/useProfiles';
import { useDepartments } from '@/hooks/useDepartments';

export function BulkUploadDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addProfile } = useProfiles();
  const { departments } = useDepartments();

  const downloadTemplate = () => {
    const template = `Full Name,Email,Department Code,Semester,Section
John Doe,john@example.com,CSE,1,A
Jane Smith,jane@example.com,ECE,2,B`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      if (lines.length < 2) {
        throw new Error('File is empty or contains only headers');
      }

      let successCount = 0;
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });

        try {
          const department = departments?.find(d => d.code === row['Department Code']);
          
          addProfile({
            full_name: row['Full Name'],
            email: row['Email'],
            role: 'student',
            department_id: department?.id || '',
            semester: row['Semester'],
            section: row['Section']
          });
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Error processing row ${i}:`, error);
        }
      }

      toast.success(`Successfully added ${successCount} students${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      setOpen(false);
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
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
          <DialogTitle>Bulk Upload Students</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Upload a CSV file with student data. Make sure your file follows the template format.
          </div>
          <Button variant="outline" onClick={downloadTemplate} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm font-medium">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground mt-2">CSV, XLS, or XLSX (MAX. 5MB)</p>
            </label>
          </div>
          {loading && (
            <div className="text-center text-sm text-muted-foreground">
              Processing upload...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
