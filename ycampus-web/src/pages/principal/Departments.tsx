import { SidebarProvider } from '@/components/ui/sidebar';
import { PrincipalSidebar } from '@/components/principal/PrincipalSidebar';
import { Card, CardContent } from '@/components/ui/card';
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

const PrincipalDepartments = () => {
  const { departments, isLoading } = useDepartments();
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden">
        <PrincipalSidebar />
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-end px-4 py-2 border-b shrink-0">
          </div>
<main className="flex-1 p-6 bg-background overflow-y-auto">
            <h1 className="text-2xl font-bold mb-6">Departments</h1>
            {isLoading ? (
              <p className="text-muted-foreground">Loading departments...</p>
            ) : departments && departments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {departments.map((dept, index) => {
                  const Icon = cardIcons[index % cardIcons.length];
                  const gradient = cardGradients[index % cardGradients.length];
                  return (
                    <Card
                      key={dept.id}
                      onClick={() => navigate(`/principal/departments/${dept.id}`)}
                      className={`bg-gradient-to-br ${gradient} text-white border-0 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer`}
                    >
                      <CardContent className="p-6 flex flex-col items-center gap-3">
                        <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                          <Icon className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold text-center">{dept.name}</h3>
                        <span className="text-sm bg-white/20 px-3 py-1 rounded-full">{dept.code}</span>
                        {dept.description && (
                          <p className="text-sm text-white/80 text-center mt-1">{dept.description}</p>
                        )}
                        <p className="text-xs text-white/60 mt-2">
                          {dept.semesters?.length || 0} Semesters
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground">No departments found.</p>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PrincipalDepartments;
