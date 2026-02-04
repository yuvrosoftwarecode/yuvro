import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DashboardRedirect: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      switch (user.role) {
        case 'admin':
        case 'instructor':
          navigate('/instructor/dashboard', { replace: true });
          break;
        case 'recruiter':
          navigate('/recruiter/dashboard', { replace: true });
          break;
        case 'student':
        default:
          navigate('/student/dashboard', { replace: true });
          break;
      }
    } else if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [user, isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return null;
};

export default DashboardRedirect;