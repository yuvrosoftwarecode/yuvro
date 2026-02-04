import React from 'react';
import { JobApplication } from '@/services/jobApplicationService';

interface ApplicationCardProps {
  application: JobApplication;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({ application }) => {
  if (!application || !application.job || !application.job.company) {
    return null;
  }

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-blue-100 text-blue-700 border-blue-200'; // Default for applied
    
    switch (status) {
      case 'under_review': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'shortlisted': return 'bg-green-100 text-green-700 border-green-200';
      case 'interview_scheduled': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'selected': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getStatusText = (status?: string) => {
    if (!status) return 'Applied';
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold text-lg">
              {application.job.company.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {application.job.title}
              </h3>
              <p className="text-gray-600">{application.job.company.name}</p>
            </div>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(application.status)}`}>
          {getStatusText(application.status)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
        {application.applied_at && (
          <div>
            <span className="font-medium">Applied:</span> {new Date(application.applied_at).toLocaleDateString()}
          </div>
        )}
        {application.expected_salary && (
          <div>
            <span className="font-medium">Expected Salary:</span> {application.expected_currency} {application.expected_salary}
          </div>
        )}
        {application.available_from && (
          <div>
            <span className="font-medium">Available From:</span> {new Date(application.available_from).toLocaleDateString()}
          </div>
        )}
        {application.notice_period_days && (
          <div>
            <span className="font-medium">Notice Period:</span> {application.notice_period_days} days
          </div>
        )}
      </div>

      {application.cover_letter && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700 line-clamp-3">{application.cover_letter}</p>
        </div>
      )}
    </div>
  );
};

export default ApplicationCard;