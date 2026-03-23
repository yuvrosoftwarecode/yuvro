import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import RoleSidebar from '@/components/common/RoleSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDepartments } from '@/hooks/useDepartments';
import { Building2, Users, BookOpen, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const cardGradients = [
  'from-[hsl(25,100%,50%)] to-[hsl(45,93%,55%)]',   // Saffron
  'from-[hsl(220,70%,25%)] to-[hsl(220,70%,45%)]',   // Navy/Chakra
  'from-[hsl(142,76%,30%)] to-[hsl(142,76%,46%)]',   // Green
  'from-[hsl(280,60%,45%)] to-[hsl(280,60%,60%)]',   // Purple
  'from-[hsl(200,80%,40%)] to-[hsl(200,80%,55%)]',   // Blue
  'from-[hsl(340,75%,50%)] to-[hsl(340,75%,65%)]',   // Rose
];

const cardIcons = [Building2, GraduationCap, BookOpen, Users, Building2, GraduationCap];

// Assuming DepartmentCard is defined elsewhere or will be created.
// For the purpose of this change, we'll use the provided structure.
const DepartmentCard = ({ id, name, code, description, semesters, index }) => {
  const navigate = useNavigate();
  const Icon = cardIcons[index % cardIcons.length];
  const gradient = cardGradients[index % cardGradients.length];

  return (
    <Card
      key={id}
      onClick={() => navigate(`/principal/departments/${id}`)}
      className={`bg-gradient-to-br ${gradient} text-white border-0 hover:-translate-y-1 transition-all duration-300 cursor-pointer shadow-none`}
    >
      <CardContent className="p-6 flex flex-col items-center gap-3">
        <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
          <Icon className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-semibold text-center">{name}</h3>
        <span className="text-sm bg-white/20 px-3 py-1 rounded-full">{code}</span>
        {description && (
          <p className="text-sm text-white/80 text-center mt-1">{description}</p>
        )}
        <p className="text-xs text-white/60 mt-2">
          {semesters?.length || 0} Semesters
        </p>
      </CardContent>
    </Card>
  );
};


const PrincipalDepartments = () => {
  const { departments, isLoading } = useDepartments();
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <RoleSidebar />
      <SidebarInset className="p-4 md:p-6 bg-background">
        <div className="max-w-[1400px] mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold">Departments</h1>
          </div>
            {isLoading ? (
              <p className="text-muted-foreground">Loading departments...</p>
            ) : departments && departments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {departments.map((dept, index) => {
                  const Icon = cardIcons[index % cardIcons.length];
                  const gradient = cardGradients[index % cardGradients.length];
                  const hodName = dept.hod_details
                    ? `${dept.hod_details.user_details.first_name} ${dept.hod_details.user_details.last_name}`.trim()
                    : null;
                  return (
                    <Card
                      key={dept.id}
                      onClick={() => navigate(`/principal/departments/${dept.id}`)}
                      className={`bg-gradient-to-br ${gradient} text-white border-0 hover:-translate-y-1 transition-all duration-300 cursor-pointer shadow-none`}
                    >
                      <CardContent className="p-6 flex flex-col items-center gap-3">
                        <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                          <Icon className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-semibold text-center">{dept.name}</h3>
                        {dept.short_form && (
                          <span className="text-sm bg-white/20 px-3 py-1 rounded-full">{dept.short_form}</span>
                        )}
                        <p className="text-xs text-white/60 mt-2">
                          {dept.semesterCount} Semester{dept.semesterCount !== 1 ? 's' : ''}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground">No departments found.</p>
            )}
          </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default PrincipalDepartments;
