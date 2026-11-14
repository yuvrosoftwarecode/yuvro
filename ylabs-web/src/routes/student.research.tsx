import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/student/research')({
  beforeLoad: () => {
    throw redirect({ to: '/research' });
  },
});