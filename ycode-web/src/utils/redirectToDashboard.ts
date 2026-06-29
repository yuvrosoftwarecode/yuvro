import { NavigateFunction } from 'react-router-dom';

export const redirectToDashboard = (user: any, navigate: NavigateFunction) => {
  const userRole = user?.roles?.ycode || user?.role;
  if (!user || !userRole) {
    navigate('/login');
    return;
  }

  switch (userRole) {
    case 'admin':
    case 'instructor':
      navigate('/instructor/dashboard', { replace: true });
      break;
    case 'recruiter':
      navigate('/recruiter/dashboard', { replace: true });
      break;
    case 'guest':
      navigate('/change-password', { replace: true });
      break;
    case 'student':
      navigate('/student/dashboard', { replace: true });
      // navigate('/student/learn', { replace: true });
      break;
    default:
      navigate('/login');
  }
};
