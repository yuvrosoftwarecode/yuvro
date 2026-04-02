import { useParams, useNavigate } from 'react-router-dom';
import { PrincipalSidebar } from '@/components/principal/PrincipalSidebar';
import { useDepartments } from '@/hooks/useDepartments';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import HODDashboard from '@/pages/hod/HODDashboard';

const DepartmentDetail = () => {
  const { departmentId } = useParams();
  const navigate = useNavigate();
  const { departments } = useDepartments();

  const department = departments?.find(d => d.id === departmentId);
  const deptName = department?.name || 'Department';

  return (
    <HODDashboard
      sidebarComponent={<PrincipalSidebar />}
      title={`${deptName} — Department Dashboard`}
      headerExtra={
        <Button variant="ghost" size="icon" className="mr-1" onClick={() => navigate('/principal/departments')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
      }
    />
  );
};

export default DepartmentDetail;
