import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Camera, Mic, AlertCircle, Loader2 } from 'lucide-react';

interface PermissionDialogProps {
  open: boolean;
  onConfirm: (screenStream?: MediaStream) => void;
  onCancel: () => void;
  startButtonText?: string;
  requireScreenShare?: boolean;
}

const PermissionDialog: React.FC<PermissionDialogProps> = ({
  open,
  onConfirm,
  onCancel,
  startButtonText = "Start Test",
  requireScreenShare = false
}) => {
  const [permissionState, setPermissionState] = useState<'requesting' | 'granted' | 'denied' | 'error'>('requesting');
  const [cameraGranted, setCameraGranted] = useState(false);
  const [microphoneGranted, setMicrophoneGranted] = useState(false);
  const [screenGranted, setScreenGranted] = useState(false);
  const [tabsClosed, setTabsClosed] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (open) {
      requestPermissions();
    }
  }, [open]);

  const requestPermissions = async () => {
    setPermissionState('requesting');
    setCameraGranted(false);
    setMicrophoneGranted(false);
    setScreenGranted(false);
    setScreenStream(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      setCameraGranted(true);
      setMicrophoneGranted(true);
      stream.getTracks().forEach(track => track.stop());

      let displayStream: MediaStream | null = null;
      if (requireScreenShare) {
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: "monitor" // Prefer entire screen
          },
          audio: false
        });
        
        // Verify they shared the entire screen (some browsers might ignore "monitor" preference)
        const videoTrack = displayStream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        if (settings.displaySurface && settings.displaySurface !== 'monitor') {
          displayStream.getTracks().forEach(track => track.stop());
          throw new Error("Please share your Entire Screen, not just a window or tab.");
        }

        setScreenGranted(true);
        setScreenStream(displayStream);
      }

      setPermissionState('granted');
    } catch (error: any) {
      console.error('Permission denied or error:', error);
      if (error && error.message) {
         // Could set a specific error message here if needed in UI
      }
      setPermissionState('denied');
    }
  };

  const handleProceed = () => {
    if (cameraGranted && microphoneGranted && (!requireScreenShare || screenGranted) && (!requireScreenShare || tabsClosed)) {
      if (screenStream) {
        onConfirm(screenStream);
      } else {
        onConfirm();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent
        className="max-w-md rounded-2xl border-0 shadow-2xl bg-white/95 backdrop-blur-xl ring-1 ring-black/5 p-0 flex flex-col overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 border-b border-slate-100/50 bg-gradient-to-r from-slate-50/50 to-white flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            {permissionState === 'requesting' && (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                Requesting Permissions {requireScreenShare && "& Screen"}
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

        <div className="p-6 space-y-6">
          {permissionState === 'requesting' && (
            <p className="text-slate-600 leading-relaxed">
              Please allow access to your camera{requireScreenShare ? ', microphone, and share your entire screen' : ' and microphone'} to continue with the test.
            </p>
          )}

          {permissionState === 'granted' && (
            <>
              <p className="text-slate-600 leading-relaxed">
                Great! We have successfully accessed your camera and microphone.
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-green-50/50 border border-green-200/50 rounded-xl transition-all hover:bg-green-50">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-green-600">
                    <Camera className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-green-800">Camera access granted</span>
                </div>
                <div className="flex items-center gap-3 p-4 bg-green-50/50 border border-green-200/50 rounded-xl transition-all hover:bg-green-50">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-green-600">
                    <Mic className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-green-800">Microphone access granted</span>
                </div>
                {requireScreenShare && screenGranted && (
                  <div className="flex items-center gap-3 p-4 bg-green-50/50 border border-green-200/50 rounded-xl transition-all hover:bg-green-50">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-green-600">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium text-green-800">Screen sharing active</span>
                  </div>
                )}
              </div>

              {requireScreenShare && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> Final Verification
                  </h4>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                      checked={tabsClosed}
                      onChange={(e) => setTabsClosed(e.target.checked)}
                    />
                    <span className="text-sm text-amber-800 leading-tight">
                      I confirm that I have closed all other tabs, windows, and applications. I understand that the test will be immediately aborted if forbidden platforms are detected.
                    </span>
                  </label>
                </div>
              )}

              <p className="text-sm text-slate-500">
                You're all set to begin your test. Click "{startButtonText}" to continue.
              </p>
            </>
          )}

          {permissionState === 'denied' && (
            <>
              <p className="text-slate-600 leading-relaxed">
                Camera and microphone access are required for this test. Please enable permissions and try again.
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-red-50/50 border border-red-200/50 rounded-xl transition-all hover:bg-red-50">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-red-600">
                    <Camera className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-red-800">Camera access required</span>
                </div>
                <div className="flex items-center gap-3 p-4 bg-red-50/50 border border-red-200/50 rounded-xl transition-all hover:bg-red-50">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-red-600">
                    <Mic className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-red-800">Microphone access required</span>
                </div>
                {requireScreenShare && (
                  <div className="flex items-center gap-3 p-4 bg-red-50/50 border border-red-200/50 rounded-xl transition-all hover:bg-red-50">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-red-600">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium text-red-800">Entire Screen sharing required</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="flex-1 rounded-xl hover:bg-slate-200 text-slate-500 font-medium"
          >
            Cancel
          </Button>
          {permissionState === 'granted' ? (
            <Button
              onClick={handleProceed}
              disabled={requireScreenShare && !tabsClosed}
              className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/10 font-semibold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {startButtonText}
            </Button>
          ) : permissionState === 'denied' ? (
            <Button
              onClick={requestPermissions}
              className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/10 font-semibold tracking-wide"
            >
              Try Again
            </Button>
          ) : (
            <Button disabled className="flex-1 rounded-xl bg-slate-900/50 text-white">
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