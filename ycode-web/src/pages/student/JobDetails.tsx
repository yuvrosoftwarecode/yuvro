import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Clock, Briefcase, DollarSign, ArrowLeft, BookmarkIcon, Share2, LogIn } from 'lucide-react';
import Navigation from '@/components/common/Navigation';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

import { jobService, Job } from '@/services/jobService';
import { JobApplicationData } from '@/services/jobApplicationService';
import BookmarkButton from '@/components/student/jobs/BookmarkButton';
import ApplyJobDialog from '@/components/student/jobs/ApplyJobDialog';
import ShareJobModal from '@/components/student/jobs/ShareJobModal';
import useJobApplications from '@/hooks/useJobApplications';

const JobDetails = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Use the custom hook for job applications (only if authenticated)
  const jobApplicationsHook = useJobApplications();
  const {
    userJobStatus = {},
    bookmarkLoading = new Set(),
    handleBookmarkJob = () => {},
    handleApplyToJob = async () => {}
  } = isAuthenticated ? jobApplicationsHook : {};

  useEffect(() => {
    if (jobId) {
      fetchJob();
    }
  }, [jobId]);

  // Update page title and meta tags for better sharing
  useEffect(() => {
    if (job) {
      document.title = `${job.title} at ${job.company.name} | YourCompany Jobs`;
      
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', 
          `Apply for ${job.title} at ${job.company.name}. ${job.description.substring(0, 150)}...`
        );
      }
      
      // Update Open Graph tags for social sharing
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', `${job.title} at ${job.company.name}`);
      }
      
      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) {
        ogDescription.setAttribute('content', 
          `Apply for ${job.title} at ${job.company.name}. ${job.description.substring(0, 150)}...`
        );
      }
    }
    
    return () => {
      // Reset title when component unmounts
      document.title = 'YourCompany Jobs';
    };
  }, [job]);

  const fetchJob = async () => {
    try {
      setLoading(true);
      const jobData = await jobService.getJob(jobId!);
      setJob(jobData);
    } catch (error) {
      console.error('Error fetching job:', error);
      toast.error('Failed to load job details');
      navigate(isAuthenticated ? '/student/jobs' : '/');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyClick = () => {
    if (!isAuthenticated) {
      toast.error('Please login to apply for jobs', {
        description: 'You need to be logged in to apply for this job.',
        action: {
          label: 'Login',
          onClick: () => navigate('/login')
        }
      });
      return;
    }
    setApplyDialogOpen(true);
  };

  const handleBookmarkClick = () => {
    if (!isAuthenticated) {
      toast.error('Please login to bookmark jobs', {
        description: 'You need to be logged in to bookmark this job.',
        action: {
          label: 'Login',
          onClick: () => navigate('/login')
        }
      });
      return;
    }
    handleBookmarkJob(job!.id);
  };

  const handleApplySubmit = async (applicationData: JobApplicationData) => {
    try {
      await handleApplyToJob(applicationData);
      setApplyDialogOpen(false);
      toast.success(`Successfully applied to ${job?.title}`);
    } catch (error) {
      toast.error('Failed to apply to job. Please try again.');
    }
  };

  const handleShare = () => {
    setShareModalOpen(true);
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading job details...</p>
          </div>
        </div>
      </>
    );
  }

  if (!job) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Job not found</h2>
            <p className="text-gray-600 mb-4">The job you're looking for doesn't exist or has been removed.</p>
            <button
              onClick={() => navigate('/student/jobs')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Jobs
            </button>
          </div>
        </div>
      </>
    );
  }

  const jobStatus = userJobStatus[job.id] || { is_bookmarked: false, is_applied: false };
  const isBookmarked = isAuthenticated ? jobStatus.is_bookmarked : false;
  const isApplied = isAuthenticated ? jobStatus.is_applied : false;

  const getExperienceText = (job: Job) => {
    if (job.experience_min_years === 0) return 'Fresher';
    if (job.experience_max_years) {
      return `${job.experience_min_years}-${job.experience_max_years} years`;
    }
    return `${job.experience_min_years}+ years`;
  };

  const getSalaryText = (job: Job) => {
    if (!job.min_salary && !job.max_salary) return null;
    const currency = job.currency === 'INR' ? '₹' : '$';
    if (job.min_salary && job.max_salary) {
      return `${currency}${job.min_salary}-${job.max_salary} LPA`;
    }
    if (job.min_salary) {
      return `${currency}${job.min_salary}+ LPA`;
    }
    return `Up to ${currency}${job.max_salary} LPA`;
  };

  const getLocationText = (job: Job) => {
    if (job.is_remote && job.locations.length > 0) {
      return `${job.locations.join(', ')} • Hybrid`;
    }
    if (job.is_remote) {
      return 'Remote';
    }
    if (job.locations.length > 0) {
      return `${job.locations.join(', ')} • Onsite`;
    }
    return 'Location not specified';
  };

  const getPostedTime = (postedAt: string) => {
    const now = new Date();
    const posted = new Date(postedAt);
    const diffTime = Math.abs(now.getTime() - posted.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} week${Math.ceil(diffDays / 7) > 1 ? 's' : ''} ago`;
    return `${Math.ceil(diffDays / 30)} month${Math.ceil(diffDays / 30) > 1 ? 's' : ''} ago`;
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <button
            onClick={() => navigate(isAuthenticated ? '/student/jobs' : '/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {isAuthenticated ? 'Back to Jobs' : 'Back to Home'}
          </button>

          {/* Job Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold text-xl">
                  {job.company.name.charAt(0)}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
                  <p className="text-xl text-gray-600">{job.company.name}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {isAuthenticated ? (
                  <>
                    <BookmarkButton
                      isBookmarked={isBookmarked}
                      isLoading={bookmarkLoading.has(job.id)}
                      onClick={handleBookmarkClick}
                    />
                    <button
                      onClick={handleShare}
                      className="p-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                      title="Share this job"
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => navigate('/login')}
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <LogIn className="h-4 w-4" />
                      Login to Apply
                    </button>
                    <button
                      onClick={handleShare}
                      className="p-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                      title="Share this job"
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Job Meta Info */}
            <div className="flex flex-wrap items-center gap-6 text-gray-600 mb-6">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {getLocationText(job)}
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                {getExperienceText(job)}
              </div>
              {job.posted_at && (
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {getPostedTime(job.posted_at)}
                </div>
              )}
              {getSalaryText(job) && (
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <DollarSign className="h-5 w-5" />
                  {getSalaryText(job)}
                </div>
              )}
            </div>

            {/* Skills */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Apply Button */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
              <div className="text-sm text-gray-500">
                Employment Type: <span className="font-medium text-gray-900 capitalize">{job.employment_type.replace('-', ' ')}</span>
              </div>
              {!isAuthenticated ? (
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <LogIn className="h-4 w-4" />
                  Login to Apply
                </button>
              ) : isApplied ? (
                <button
                  disabled
                  className="bg-green-100 text-green-700 px-8 py-3 rounded-lg font-medium cursor-not-allowed"
                >
                  Applied
                </button>
              ) : (
                <button
                  onClick={handleApplyClick}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Apply Now
                </button>
              )}
            </div>
          </div>

          {/* Job Description */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Job Description</h2>
            <div className="prose max-w-none text-gray-700">
              <p className="whitespace-pre-wrap">{job.description}</p>
            </div>
          </div>

          {/* Company Info */}
          {job.company.description && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About {job.company.name}</h2>
              <div className="prose max-w-none text-gray-700">
                <p className="whitespace-pre-wrap">{job.company.description}</p>
              </div>
              
              {job.company.website && (
                <div className="mt-4">
                  <a
                    href={job.company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Visit Company Website →
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Apply Dialog - Only show if authenticated */}
        {isAuthenticated && (
          <ApplyJobDialog
            isOpen={applyDialogOpen}
            onClose={() => setApplyDialogOpen(false)}
            job={job}
            onSubmit={handleApplySubmit}
          />
        )}

        {/* Share Modal */}
        {job && (
          <ShareJobModal
            isOpen={shareModalOpen}
            onClose={() => setShareModalOpen(false)}
            job={job}
          />
        )}
      </div>
    </>
  );
};

export default JobDetails;