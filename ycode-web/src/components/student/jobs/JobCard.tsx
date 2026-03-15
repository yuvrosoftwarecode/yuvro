import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Briefcase, DollarSign, Share2, BookmarkIcon } from 'lucide-react';
import { Job } from '@/services/jobService';
import BookmarkButton from './BookmarkButton';
import ShareJobModal from './ShareJobModal';

interface JobCardProps {
  job: Job;
  isBookmarked: boolean;
  isApplied: boolean;
  onBookmark: (jobId: string) => void;
  onApply: (job: Job) => void;
  showBookmarkDate?: boolean;
  bookmarkDate?: string;
  bookmarkLoading?: boolean;
}

const JobCard: React.FC<JobCardProps> = ({ 
  job, 
  isBookmarked, 
  isApplied, 
  onBookmark, 
  onApply, 
  showBookmarkDate, 
  bookmarkDate,
  bookmarkLoading = false
}) => {
  const navigate = useNavigate();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  if (!job || !job.company) {
    return null;
  }

  const getExperienceText = (job: Job) => {
    if (job.experience_min_years === 0) return 'Fresher';
    if (job.experience_max_years) {
      return `${job.experience_min_years}-${job.experience_max_years} yrs`;
    }
    return `${job.experience_min_years}+ yrs`;
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
      return `${job.locations[0]} • Hybrid`;
    }
    if (job.is_remote) {
      return 'Remote';
    }
    if (job.locations.length > 0) {
      return `${job.locations[0]} • Onsite`;
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

  const getMatchPercentage = (job: Job) => {
    const userSkills = ['React', 'TypeScript', 'JavaScript']; 
    const matchingSkills = job.skills.filter(skill => 
      userSkills.some(userSkill => 
        userSkill.toLowerCase() === skill.toLowerCase()
      )
    );
    const percentage = Math.min(Math.round((matchingSkills.length / Math.max(job.skills.length, 1)) * 100), 100);
    return Math.max(percentage, 60); 
  };

  const handleShare = () => {
    setShareModalOpen(true);
  };

  const handleTitleClick = () => {
    navigate(`/student/jobs/${job.id}`);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold text-lg">
              {job.company.name.charAt(0)}
            </div>
            <div>
              <h3 
                className="text-lg font-semibold text-gray-900 hover:text-blue-600 cursor-pointer transition-colors"
                onClick={handleTitleClick}
              >
                {job.title}
              </h3>
              <p className="text-gray-600">{job.company.name}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {getLocationText(job)}
            </div>
            <div className="flex items-center gap-1">
              <Briefcase className="h-4 w-4" />
              {getExperienceText(job)}
            </div>
            {job.posted_at && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {getPostedTime(job.posted_at)}
              </div>
            )}
            {showBookmarkDate && bookmarkDate && (
              <div className="flex items-center gap-1 text-blue-600">
                <BookmarkIcon className="h-4 w-4" />
                Bookmarked {getPostedTime(bookmarkDate)}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {job.skills.slice(0, 3).map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
              >
                {skill}
              </span>
            ))}
            {job.skills.length > 3 && (
              <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-sm">
                +{job.skills.length - 3} more
              </span>
            )}
          </div>

          {getSalaryText(job) && (
            <div className="flex items-center gap-1 text-green-600 font-medium">
              <DollarSign className="h-4 w-4" />
              {getSalaryText(job)}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
            {getMatchPercentage(job)}% Match
          </div>
          <div className="flex items-center gap-2">
            <BookmarkButton
              isBookmarked={isBookmarked}
              isLoading={bookmarkLoading}
              onClick={() => onBookmark(job.id)}
            />
            <button 
              className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              onClick={handleShare}
              title="Share this job"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <p className="text-sm text-gray-600 line-clamp-2 flex-1 mr-4">
          {job.description.substring(0, 150)}...
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleTitleClick}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
          >
            View Details
          </button>
          {isApplied ? (
            <button
              disabled
              className="bg-green-100 text-green-700 px-6 py-2 rounded-lg font-medium cursor-not-allowed"
            >
              Applied
            </button>
          ) : (
            <button
              onClick={() => onApply(job)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Apply Now
            </button>
          )}
        </div>
      </div>

      {/* Share Modal */}
      <ShareJobModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        job={job}
      />
    </div>
  );
};

export default JobCard;