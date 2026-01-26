import { NavigateFunction } from 'react-router-dom';

export const redirectToDashboard = (user: any, navigate: NavigateFunction) => {
  if (!user || !user.role) {
    navigate('/login');
    return;
  }

  switch (user.role) {
    case 'admin':
    case 'instructor':
      navigate('/instructor/dashboard', { replace: true });
      break;
    case 'recruiter':
      navigate('/recruiter/dashboard', { replace: true });
      break;
    case 'student':
      navigate('/student/dashboard', { replace: true });
      break;
    default:
      navigate('/login');
  }
};
