import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface JobUpdateEvent {
  type: 'job_application_created' | 'job_application_updated' | 'job_updated';
  job_id: string;
  application_id?: string;
  data?: any;
}

interface UseRealtimeJobUpdatesProps {
  onJobApplicationCountUpdate?: (jobId: string, newCount: number) => void;
  onJobUpdate?: (jobId: string, jobData: any) => void;
  enabled?: boolean;
}

export const useRealtimeJobUpdates = ({
  onJobApplicationCountUpdate,
  onJobUpdate,
  enabled = true
}: UseRealtimeJobUpdatesProps) => {
  
  const handleJobUpdate = useCallback((event: JobUpdateEvent) => {
    console.log('Received job update event:', event);
    
    switch (event.type) {
      case 'job_application_created':
        if (onJobApplicationCountUpdate && event.data?.applications_count !== undefined) {
          onJobApplicationCountUpdate(event.job_id, event.data.applications_count);
          toast.success('New application received!', {
            description: `Job: ${event.data.job_title || 'Unknown'}`,
            duration: 5000,
          });
        }
        break;
        
      case 'job_application_updated':
        if (onJobApplicationCountUpdate && event.data?.applications_count !== undefined) {
          onJobApplicationCountUpdate(event.job_id, event.data.applications_count);
        }
        break;
        
      case 'job_updated':
        if (onJobUpdate) {
          onJobUpdate(event.job_id, event.data);
        }
        break;
    }
  }, [onJobApplicationCountUpdate, onJobUpdate]);

  useEffect(() => {
    if (!enabled) return; 
    
    const pollInterval = setInterval(() => {
      const event = new CustomEvent('jobDataRefresh');
      window.dispatchEvent(event);
    }, 30000); 

    const handleCustomEvent = (event: CustomEvent<JobUpdateEvent>) => {
      handleJobUpdate(event.detail);
    };

    window.addEventListener('jobUpdate', handleCustomEvent as EventListener);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('jobUpdate', handleCustomEvent as EventListener);
    };
  }, [enabled, handleJobUpdate]);

  const triggerJobUpdate = useCallback((event: JobUpdateEvent) => {
    const customEvent = new CustomEvent('jobUpdate', { detail: event });
    window.dispatchEvent(customEvent);
  }, []);

  return {
    triggerJobUpdate
  };
};

export default useRealtimeJobUpdates;