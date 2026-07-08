import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, useRef } from 'react';
import authService from '@/services/authService';
import { yhubApiAuthUtil } from '@/utils/RestApiAuthUtil';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute('/github/callback')({
  component: GithubCallbackComponent,
});

function GithubCallbackComponent() {
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get('code');
  const [error, setError] = useState<string | null>(null);
  const { updateUser } = useAuth();
  const hasRun = useRef(false);

  useEffect(() => {
    async function completeGithubFlow() {
      if (!code) {
        setError('No authorization code provided by GitHub.');
        return;
      }
      if (hasRun.current) return;
      hasRun.current = true;
      
      try {
        await yhubApiAuthUtil.post('/auth/github/connect/', { code });
        // Fetch updated user to reflect github_connected status
        const userData = await authService.getCurrentUser();
        updateUser(userData);
        navigate({ to: '/dashboard' });
      } catch (err: any) {
        // If it fails, allow retry
        hasRun.current = false;
        setError(err?.message || 'An error occurred while connecting GitHub.');
      }
    }
    completeGithubFlow();
  }, [code, navigate, updateUser]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center text-destructive max-w-md w-full">
          <h2 className="text-lg font-semibold mb-2">GitHub Connection Failed</h2>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => navigate({ to: '/dashboard' })}
            className="mt-6 px-4 py-2 bg-background border rounded-md text-foreground hover:bg-accent"
          >
            Return to Dashboard
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg font-medium">Connecting to GitHub...</p>
        </div>
      )}
    </div>
  );
}
