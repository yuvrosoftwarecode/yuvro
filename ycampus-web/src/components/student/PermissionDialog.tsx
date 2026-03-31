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

  useEffect(() => {
    if (open) {
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
    } catch (error) {
      console.error('Permission denied:', error);
      setPermissionState('denied');
    }
  };

  const handleProceed = () => {
    if (cameraGranted && microphoneGranted) {
      onConfirm();
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
                Requesting Permissions
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
          {permissionState === 'requesting' && (
            <p className="text-muted-foreground">
              Please allow access to your camera and microphone to continue with the test.
            </p>
          )}

          {permissionState === 'granted' && (
            <>
              <p className="text-muted-foreground">
                Great! We have successfully accessed your camera and microphone.
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Camera className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Camera access granted</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Mic className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Microphone access granted</span>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                You're all set to begin your test. Click "Next" to continue.
              </p>
            </>
          )}

          {permissionState === 'denied' && (
            <>
              <p className="text-muted-foreground">
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
            </>
          )}
        </div>
        
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          {permissionState === 'granted' ? (
            <Button onClick={handleProceed} className="flex-1">
              Next
            </Button>
          ) : permissionState === 'denied' ? (
            <Button onClick={requestPermissions} className="flex-1">
              Try Again
            </Button>
          ) : (
            <Button disabled className="flex-1">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Requesting...
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PermissionDialog;