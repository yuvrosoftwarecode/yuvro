import React from 'react';
import { Loader2, CheckCircle, AlertCircle, Play } from 'lucide-react';

export type PreviewState = 
  | 'idle'
  | 'booting'
  | 'installing'
  | 'starting'
  | 'ready'
  | 'error';

interface PreviewStatusProps {
  status: PreviewState;
  errorMessage?: string;
  onRetry?: () => void;
}

export function PreviewStatus({ status, errorMessage, onRetry }: PreviewStatusProps) {
  if (status === 'ready') return null;

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 max-w-md text-center p-6 bg-card rounded-lg border shadow-lg">
        {status === 'error' ? (
          <AlertCircle className="h-10 w-10 text-destructive" />
        ) : (
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        )}
        
        <h3 className="text-lg font-semibold tracking-tight">
          {status === 'booting' && "Booting WebContainer..."}
          {status === 'installing' && "Installing Dependencies..."}
          {status === 'starting' && "Starting Dev Server..."}
          {status === 'error' && "Failed to start preview"}
        </h3>
        
        <p className="text-sm text-muted-foreground">
          {status === 'booting' && "Initializing the secure browser-based Node.js runtime."}
          {status === 'installing' && "Fetching and installing npm packages. This may take a moment."}
          {status === 'starting' && "Running npm run dev..."}
          {status === 'error' && errorMessage}
        </p>

        {status === 'error' && onRetry && (
          <button 
            onClick={onRetry}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md flex items-center gap-2 hover:bg-primary/90"
          >
            <Play className="h-4 w-4" />
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
