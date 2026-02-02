import React from 'react';
import { XCircle, MapPin, Briefcase, DollarSign, Calendar, Clock, CheckCircle } from 'lucide-react';
import { Job } from '@/services/jobService';
import StatusBadge from '../StatusBadge';

interface JobDetailsViewerProps {
    job: Job;
    onClose: () => void;
    actions?: React.ReactNode;
}

const JobDetailsViewer: React.FC<JobDetailsViewerProps> = ({ job, onClose, actions }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-xl font-semibold text-gray-900">{job.title}</h2>
                                <StatusBadge status={job.status} />
                            </div>
                            <p className="text-sm text-gray-600">{job.company.name}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <XCircle className="h-5 w-5 text-gray-400" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Job Details */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-3 font-semibold">Job Description</h3>
                        <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                            {job.description.split('\n').map((paragraph, index) => (
                                <p key={index} className="mb-2">{paragraph}</p>
                            ))}
                        </div>
                    </div>

                    {/* Job Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <Briefcase className="h-4 w-4 text-blue-500" />
                                    Employment Details
                                </h4>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex justify-between border-b pb-1 border-gray-50">
                                        <span className="font-medium text-gray-500">Type</span>
                                        <span>{job.employment_type.replace('-', ' ')}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1 border-gray-50">
                                        <span className="font-medium text-gray-500">Experience</span>
                                        <span>{job.experience_min_years}-{job.experience_max_years || '+'} years</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1 border-gray-50">
                                        <span className="font-medium text-gray-500">Education</span>
                                        <span>{job.education_level}</span>
                                    </div>
                                </div>
                            </div>

                            {job.skills.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">Required Skills</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {job.skills.map((skill, index) => (
                                            <span key={index} className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-orange-500" />
                                    Location & Compensation
                                </h4>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex justify-between border-b pb-1 border-gray-50">
                                        <span className="font-medium text-gray-500">Location</span>
                                        <span>{job.locations.join(', ') || (job.is_remote ? 'Remote' : 'Not specified')}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1 border-gray-50">
                                        <span className="font-medium text-gray-500">Remote Policy</span>
                                        <span>{job.is_remote ? 'Fully Remote' : 'On-site / Hybrid'}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1 border-gray-50">
                                        <span className="font-medium text-gray-500">Salary Range</span>
                                        <span>
                                            {job.min_salary && job.max_salary
                                                ? `${job.min_salary}-${job.max_salary} ${job.currency}`
                                                : job.min_salary ? `${job.min_salary}+ ${job.currency}` : 'Not specified'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        Close
                    </button>
                    {actions}
                </div>
            </div>
        </div>
    );
};

export default JobDetailsViewer;
