import { redirect } from '@tanstack/react-router';

export function requireStudentAuth(currentUrl?: string) {
  if (typeof window !== 'undefined') {
    const searchParams: any = { tab: 'signin' };
    if (currentUrl && currentUrl !== '/' && !currentUrl.includes('/auth')) {
      searchParams.redirect = currentUrl;
    }

    const token = localStorage.getItem('access');
    if (!token) {
      throw redirect({ to: '/auth', search: searchParams });
    }
    const userStr = localStorage.getItem('user');
    if (userStr) {
      let user;
      try {
        user = JSON.parse(userStr);
      } catch (e) {
        throw redirect({ to: '/auth', search: searchParams });
      }

      if (user) {
        const role = user.roles?.ylabs || user.role;
        if (role?.toLowerCase() === 'admin') {
          throw redirect({ to: '/admin' });
        }
      }
    } else {
      throw redirect({ to: '/auth', search: searchParams });
    }
  }
}

export function requireAdminAuth(currentUrl?: string) {
  if (typeof window !== 'undefined') {
    const searchParams: any = { tab: 'signin' };
    if (currentUrl && currentUrl !== '/' && !currentUrl.includes('/auth')) {
      searchParams.redirect = currentUrl;
    }

    const token = localStorage.getItem('access');
    if (!token) {
      throw redirect({ to: '/auth', search: searchParams });
    }
    const userStr = localStorage.getItem('user');
    if (userStr) {
      let user;
      try {
        user = JSON.parse(userStr);
      } catch (e) {
        throw redirect({ to: '/auth', search: searchParams });
      }

      if (user) {
        const role = user.roles?.ylabs || user.role;
        if (role?.toLowerCase() !== 'admin') {
          throw redirect({ to: '/student/dashboard' });
        }
      }
    } else {
      throw redirect({ to: '/auth', search: searchParams });
    }
  }
}
