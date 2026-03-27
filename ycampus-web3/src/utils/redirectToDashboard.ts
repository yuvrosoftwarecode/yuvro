import { NavigateFunction } from 'react-router-dom';

export const redirectToDashboard = (user: any, navigate: NavigateFunction) => {
  if (!user || !user.role) {
    navigate('/login');
    return;
  }

  switch (user.role) {
    case 'admin':
      navigate('/admin/dashboard', { replace: true });
      break;
    case 'college_admin':
      navigate('/college-admin/dashboard', { replace: true });
      break;
    case 'principal':
      navigate('/principal/dashboard', { replace: true });
      break;
    case 'hod':
      navigate('/hod/dashboard', { replace: true });
      break;
    case 'faculty':
      navigate('/faculty/dashboard', { replace: true });
      break;
    case 'placement_officer':
      navigate('/placement/dashboard', { replace: true });
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
