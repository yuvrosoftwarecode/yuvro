import React from 'react';
import { XCircle, MapPin, Briefcase, DollarSign, Clock, CheckCircle, Globe, GraduationCap } from 'lucide-react';
import { Job } from '@/services/jobService';
import StatusBadge from '../StatusBadge';
import { Button } from '@/components/ui/button';

interface JobDetailsViewerProps {
    job: Job;
    onClose: () => void;
    actions?: React.ReactNode;
}

const JobDetailsViewer: React.FC<JobDetailsViewerProps> = ({ job, onClose, actions }) => {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 flex flex-col">
                <div className="p-6 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-2xl font-bold text-gray-900">{job.title}</h2>
                                <StatusBadge status={job.status} />
                            </div>
                            <div className="flex items-center text-gray-600 gap-2">
                                <Building2Icon className="h-4 w-4" />
                                <span className="font-medium">{job.company.name}</span>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="rounded-full hover:bg-gray-100 -mr-2 -mt-2"
                        >
                            <XCircle className="h-6 w-6 text-gray-400" />
                        </Button>
                    </div>
                </div>

                <div className="p-6 space-y-8 flex-1 overflow-y-auto">
                    {/* Job Details */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            Job Description
                        </h3>
                        <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap text-sm">
                            {job.description}
                        </div>
                    </div>

                    {/* Job Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Column 1: Employment Details & Skills */}
                        <div className="space-y-6">
                            <div className="bg-gray-50/50 rounded-lg p-5 border border-gray-100">
                                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 pb-2 border-b border-gray-100">
                                    <Briefcase className="h-4 w-4 text-blue-600" />
                                    Employment Details
                                </h4>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-[140px_1fr] items-center">
                                        <span className="text-sm text-gray-500 font-medium">Type</span>
                                        <span className="text-sm text-gray-900 font-medium capitalize">{job.employment_type.replace('-', ' ')}</span>
                                    </div>
                                    <div className="grid grid-cols-[140px_1fr] items-center">
                                        <span className="text-sm text-gray-500 font-medium flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5" /> Experience
                                        </span>
                                        <span className="text-sm text-gray-900 font-medium">{job.experience_min_years}-{job.experience_max_years || '+'} years</span>
                                    </div>
                                    <div className="grid grid-cols-[140px_1fr] items-center">
                                        <span className="text-sm text-gray-500 font-medium flex items-center gap-1.5">
                                            <GraduationCap className="h-3.5 w-3.5" /> Education
                                        </span>
                                        <span className="text-sm text-gray-900 font-medium capitalize">{job.education_level.replace('_', ' ')}</span>
                                    </div>
                                    <div className="grid grid-cols-[140px_1fr] items-center">
                                        <span className="text-sm text-gray-500 font-medium">Notice Period</span>
                                        <span className="text-sm text-gray-900 font-medium">{job.notice_period || 'Immediate'} days</span>
                                    </div>
                                </div>
                            </div>

                            {job.skills.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wider text-gray-500">Required Skills</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {job.skills.map((skill, index) => (
                                            <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 shadow-sm">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Column 2: Location & Compensation */}
                        <div className="space-y-6">
                            <div className="bg-gray-50/50 rounded-lg p-5 border border-gray-100">
                                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 pb-2 border-b border-gray-100">
                                    <Globe className="h-4 w-4 text-indigo-600" />
                                    Location & Compensation
                                </h4>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-[140px_1fr] items-center">
                                        <span className="text-sm text-gray-500 font-medium flex items-center gap-1.5">
                                            <MapPin className="h-3.5 w-3.5" /> Location
                                        </span>
                                        <span className="text-sm text-gray-900 font-medium">{job.locations.join(', ') || (job.is_remote ? 'Remote' : 'Not specified')}</span>
                                    </div>
                                    <div className="grid grid-cols-[140px_1fr] items-center">
                                        <span className="text-sm text-gray-500 font-medium">Remote Policy</span>
                                        <span className={`text-sm font-medium ${job.is_remote ? 'text-green-600 bg-green-50 px-2 py-0.5 rounded-md inline-block w-fit' : 'text-gray-900'}`}>
                                            {job.is_remote ? 'Fully Remote' : 'On-site / Hybrid'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-[140px_1fr] items-center">
                                        <span className="text-sm text-gray-500 font-medium flex items-center gap-1.5">
                                            <DollarSign className="h-3.5 w-3.5" /> Salary Range
                                        </span>
                                        <span className="text-sm text-gray-900 font-medium">
                                            {job.min_salary && job.max_salary
                                                ? `${job.min_salary.toLocaleString()} - ${job.max_salary.toLocaleString()} ${job.currency}`
                                                : job.min_salary ? `${job.min_salary.toLocaleString()}+ ${job.currency}` : 'Not specified'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 rounded-b-xl flex-shrink-0">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                    >
                        Close
                    </Button>
                    {actions}
                </div>
            </div>
        </div>
    );
};

const Building2Icon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" /></svg>
);

export default JobDetailsViewer;
