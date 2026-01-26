import React, { useState, useEffect } from 'react';
import { Bell, Users, X, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface ApplicationNotification {
  id: string;
  jobId: string;
  jobTitle: string;
  applicantName: string;
  timestamp: Date;
  read: boolean;
}

const ApplicationNotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<ApplicationNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const handleJobUpdate = (event: CustomEvent) => {
      const { type, job_id, data } = event.detail;
      
      if (type === 'job_application_created') {
        const newNotification: ApplicationNotification = {
          id: `${job_id}-${Date.now()}`,
          jobId: job_id,
          jobTitle: data.job_title || 'Unknown Job',
          applicantName: data.applicant_name || 'New Applicant',
          timestamp: new Date(),
          read: false
        };
        
        setNotifications(prev => [newNotification, ...prev.slice(0, 9)]); 
        setUnreadCount(prev => prev + 1);
        
        toast.success('New Application Received!', {
          description: `${newNotification.applicantName} applied for ${newNotification.jobTitle}`,
          action: {
            label: 'View',
            onClick: () => navigate(`/recruiter/jobs/${job_id}/applicants`)
          },
          duration: 5000,
        });
      }
    };

    window.addEventListener('jobUpdate', handleJobUpdate as EventListener);
    return () => window.removeEventListener('jobUpdate', handleJobUpdate as EventListener);
  }, [navigate]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    setUnreadCount(0);
  };

  const viewApplications = (jobId: string, notificationId: string) => {
    markAsRead(notificationId);
    navigate(`/recruiter/jobs/${jobId}/applicants`);
    setIsOpen(false);
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return timestamp.toLocaleDateString();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No new notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => viewApplications(notification.jobId, notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${!notification.read ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <Users className={`h-4 w-4 ${!notification.read ? 'text-blue-600' : 'text-gray-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        New application for {notification.jobTitle}
                      </p>
                      <p className="text-sm text-gray-600">
                        {notification.applicantName} just applied
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTime(notification.timestamp)}
                      </p>
                    </div>
                    <Eye className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <button
                onClick={() => {
                  navigate('/recruiter/jobs');
                  setIsOpen(false);
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View all jobs
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ApplicationNotificationCenter;