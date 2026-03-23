import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import RoleSidebar from '@/components/common/RoleSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, GraduationCap, BookOpen, Building2 } from 'lucide-react';

const studentData = [
  {
    id: 1,
    name: 'Aarav Sharma',
    rollNo: '22CSE001',
    department: 'CSE',
    semester: '5th Semester',
    section: 'A',
    cgpa: '8.7',
  },
  {
    id: 2,
    name: 'Saanvi Reddy',
    rollNo: '22ECE014',
    department: 'ECE',
    semester: '5th Semester',
    section: 'B',
    cgpa: '8.4',
  },
  {
    id: 3,
    name: 'Vihaan Patel',
    rollNo: '23MECH021',
    department: 'MECH',
    semester: '3rd Semester',
    section: 'A',
    cgpa: '7.9',
  },
  {
    id: 4,
    name: 'Ananya Rao',
    rollNo: '21MBA008',
    department: 'MBA',
    semester: '7th Semester',
    section: 'C',
    cgpa: '9.1',
  },
  {
    id: 5,
    name: 'Ishaan Kumar',
    rollNo: '22CIV009',
    department: 'CIVIL',
    semester: '5th Semester',
    section: 'A',
    cgpa: '8.0',
  },
  {
    id: 6,
    name: 'Diya Verma',
    rollNo: '23CSE031',
    department: 'CSE',
    semester: '3rd Semester',
    section: 'B',
    cgpa: '8.8',
  },
];

const PrincipalStudents = () => {
  return (
    <SidebarProvider>
      <RoleSidebar />
      <SidebarInset className="p-6 bg-background">
        <div className="max-w-[1400px] mx-auto space-y-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Students Management</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studentData.map((student) => (
              <Card key={student.id} className="border transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{student.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{student.rollNo}</p>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>{student.department}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span>{student.semester}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <GraduationCap className="h-4 w-4" />
                    <span>Section {student.section}</span>
                  </div>

                  <div className="pt-2">
                    <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-sm font-semibold">
                      CGPA: {student.cgpa}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default PrincipalStudents;
