import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useProfiles } from '@/hooks/useProfiles';
import { useDepartments } from '@/hooks/useDepartments';

import subjectService from '@/services/subjectService';
import semesterService from '@/services/semesterService';
import sectionService from '@/services/sectionService';
import { facultyService } from '@/services/facultyService';

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

          // 1. Create or Find Faculty Profile
          // We use the addProfile from useProfiles which handles user creation via userService
          const profile = await addProfile({
            email: row['Email'],
            full_name: row['Full Name'],
            role: 'faculty',
            department_id: department.id
          });

          if (!profile || !profile.id) {
            throw new Error('Failed to create faculty profile');
          }

          // 2. Find Subject by Code
          const subjects = await subjectService.getSubjects({ short_code: row['Subject Code'] } as any);
          const subject = subjects.find(s => s.short_code === row['Subject Code']);

          if (subject) {
            // 3. Find Semester for the department and number
            const semesters = await semesterService.getSemesters();
            const semester = semesters.find(s => 
              s.number === parseInt(row['Semester']) && 
              (s as any).batch_details?.department === department.id
            );

            if (semester) {
              // 4. Ensure SemesterSubject mapping exists
              const semesterSubjects = await subjectService.getSubjectsForSemester(semester.id);
              let semSub = semesterSubjects.find(ss => ss.subject === subject.id);
              
              if (!semSub) {
                semSub = await subjectService.addSubjectToSemester(semester.id, subject.id);
              }

              // 5. Assign to all sections of this semester
              const sections = await sectionService.getSections(semester.id);
              
              for (const section of sections) {
                try {
                  await subjectService.assignFacultyToSectionSubject({
                    semester_subject: semSub!.id,
                    section: section.id,
                    faculty: profile.id // This should be the FacultyProfile ID
                  });
                } catch (assignErr) {
                  console.warn(`Already assigned or error for section ${section.name}:`, assignErr);
                }
              }
            }
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