import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({ 
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem('access');
      if (!token) {
        throw redirect({ to: '/auth', search: { tab: 'signin' } });
      }
      const userStr = localStorage.getItem('user');
      if (userStr) {
        let user;
        try {
          user = JSON.parse(userStr);
        } catch (e) {
          throw redirect({ to: '/auth', search: { tab: 'signin' } });
        }
        
        if (user) {
          const role = user.roles?.ylabs || user.role;
          if (role !== 'admin') {
            throw redirect({ to: '/dashboard' });
          }
        }
      } else {
        throw redirect({ to: '/auth', search: { tab: 'signin' } });
      }
    }
  },
  component: () => <Outlet /> 
});
