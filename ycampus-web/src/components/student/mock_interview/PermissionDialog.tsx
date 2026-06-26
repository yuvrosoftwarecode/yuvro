import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Camera, Mic, AlertCircle, Loader2 } from 'lucide-react';

interface PermissionDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const PermissionDialog: React.FC<PermissionDialogProps> = ({
  open,
  onConfirm,
  onCancel
}) => {
  const [permissionState, setPermissionState] = useState<'requesting' | 'granted' | 'denied' | 'error'>('requesting');
  const [cameraGranted, setCameraGranted] = useState(false);
  const [microphoneGranted, setMicrophoneGranted] = useState(false);

  const hasRequestedRef = React.useRef(false);

  useEffect(() => {
    if (open && !hasRequestedRef.current) {
      hasRequestedRef.current = true;
      requestPermissions();
    }
  }, [open]);

  const requestPermissions = async () => {
    setPermissionState('requesting');
    setCameraGranted(false);
    setMicrophoneGranted(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      // If we get here, both permissions were granted
      setCameraGranted(true);
      setMicrophoneGranted(true);
      setPermissionState('granted');
      
      // Stop the stream since we only needed it for permission check
      stream.getTracks().forEach(track => track.stop());

      // Auto-confirm/proceed immediately without waiting for Continue click
      onConfirm();
    } catch (error) {
      console.error('Permission denied:', error);
      setPermissionState('denied');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent
        className="max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {permissionState === 'requesting' && (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                Checking Permissions
              </>
            )}
            {permissionState === 'granted' && (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Permissions Granted
              </>
            )}
            {permissionState === 'denied' && (
              <>
                <AlertCircle className="h-5 w-5 text-red-500" />
                Permissions Required
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex gap-3 p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-xl text-amber-800 dark:text-amber-200">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Proctored Session Active</p>
              <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                Your <strong>microphone</strong> and camera are currently in use. Since this session is proctored, please <strong>close any other tabs or applications using your microphone</strong> (like Zoom, Teams, or Google Meet) to avoid issues, then continue.
              </p>
            </div>
          </div>

          {permissionState === 'requesting' && (
            <div className="flex flex-col items-center justify-center py-4 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm text-muted-foreground text-center">
                Checking camera and microphone access...
              </p>
            </div>
          )}

          {permissionState === 'granted' && (
            <div className="flex flex-col items-center justify-center py-4 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-green-500" />
              <p className="text-sm text-muted-foreground text-center">
                Permissions granted! Starting interview...
              </p>
            </div>
          )}

          {permissionState === 'denied' && (
            <>
              <p className="text-muted-foreground text-sm">
                Camera and microphone access are required for this test. Please enable permissions and try again.
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <Camera className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Camera access required</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <Mic className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Microphone access required</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={onCancel} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={requestPermissions} className="flex-1">
                  Try Again
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PermissionDialog;