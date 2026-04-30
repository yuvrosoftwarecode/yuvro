import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Loader2, LogOut } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import authService from '@/services/authService';

export const FixRoleTool = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Only show if the user's role is not the expected 'placement_officer'
  if (!user || user.role === 'placement_officer' || success) {
    if (success) {
      return (
        <Alert className="mb-6 bg-emerald-50 border-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="text-emerald-800 font-bold">Role Updated Successfully!</AlertTitle>
          <AlertDescription className="text-emerald-700">
            Your role has been changed to <strong>placement_officer</strong> in the database. 
            Please log out and log back in for all changes to take effect.
            <Button 
                variant="outline" 
                size="sm" 
                className="mt-3 block border-emerald-600 text-emerald-600 hover:bg-emerald-100"
                onClick={() => logout()}
            >
                <LogOut className="h-4 w-4 mr-2" /> Log Out Now
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  }

  const handleFixRole = async () => {
    setLoading(true);
    try {
      console.log('Attempting to fix role for user:', user.id);
      
      // Update via REST API auth service
      await authService.updateUser({ role: 'placement_officer' });

      toast({
        title: "Account Repaired",
        description: "Your role has been synchronized. Please log out and back in.",
      });
      setSuccess(true);
    } catch (err) {
      console.error('Failed to fix role:', err);
      toast({
        title: "Repair Failed",
        description: "Could not update your role. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Alert variant="destructive" className="mb-6 bg-amber-50 border-amber-200 text-amber-900">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="font-bold">Role Mismatch Detected</AlertTitle>
      <AlertDescription className="text-amber-800">
        Your current role is <strong>{user.role}</strong>, but the backend expects <strong>placement_officer</strong>. 
        This is why you are seeing "Unauthorized" errors.
        <div className="mt-4">
          <Button 
            onClick={handleFixRole} 
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700 text-white border-0"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Fix My Account Role
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
