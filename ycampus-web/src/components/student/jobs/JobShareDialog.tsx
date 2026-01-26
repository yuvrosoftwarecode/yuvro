import React, { useState } from 'react';
import { X, Copy, Linkedin, MessageCircle, Facebook, Twitter, Mail, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Job } from '@/services/jobService';

interface JobShareDialogProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
}

const JobShareDialog: React.FC<JobShareDialogProps> = ({ job, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const jobShareUrl = `${window.location.origin}/student/jobs?source=share&jobId=${job.id}`;
  
  const encodedUrl = encodeURIComponent(jobShareUrl);
  const jobTitle = encodeURIComponent(job.title);
  const companyName = encodeURIComponent(job.company.name);
  const description = encodeURIComponent(`Check out this ${job.title} position at ${job.company.name}`);

  const shareLinks = {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${description}%20${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${description}`,
    email: `mailto:?subject=${jobTitle} - ${companyName}&body=Check this job opportunity: ${jobShareUrl}`
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(jobShareUrl);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform: string) => {
    let url = '';
    
    switch (platform) {
      case 'linkedin':
        url = shareLinks.linkedin;
        break;
      case 'whatsapp':
        url = shareLinks.whatsapp;
        window.open(url, '_blank');
        return;
      case 'facebook':
        url = shareLinks.facebook;
        break;
      case 'twitter':
        url = shareLinks.twitter;
        break;
      case 'email':
        url = shareLinks.email;
        window.location.href = url;
        return;
      default:
        return;
    }

    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: job.title,
          text: `Check out this ${job.title} position at ${job.company.name}`,
          url: jobShareUrl
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Share Job</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900">{job.title}</h3>
          <p className="text-sm text-gray-600">{job.company.name}</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Share Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={jobShareUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600 font-mono truncate"
            />
            <button
              onClick={handleCopyLink}
              className={`p-2 rounded-lg transition-colors ${
                copied
                  ? 'bg-green-100 text-green-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Share Via
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleShare('linkedin')}
              className="flex items-center justify-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
              title="Share on LinkedIn"
            >
              <Linkedin className="h-5 w-5 text-blue-700" />
              <span className="text-sm font-medium text-gray-700">LinkedIn</span>
            </button>

            <button
              onClick={() => handleShare('whatsapp')}
              className="flex items-center justify-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors"
              title="Share on WhatsApp"
            >
              <MessageCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">WhatsApp</span>
            </button>

            <button
              onClick={() => handleShare('facebook')}
              className="flex items-center justify-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
              title="Share on Facebook"
            >
              <Facebook className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Facebook</span>
            </button>

            <button
              onClick={() => handleShare('twitter')}
              className="flex items-center justify-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-sky-50 hover:border-sky-300 transition-colors"
              title="Share on Twitter"
            >
              <Twitter className="h-5 w-5 text-sky-500" />
              <span className="text-sm font-medium text-gray-700">Twitter</span>
            </button>

            <button
              onClick={() => handleShare('email')}
              className="flex items-center justify-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-colors"
              title="Share via Email"
            >
              <Mail className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium text-gray-700">Email</span>
            </button>

            {'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
                title="Share using system options"
              >
                <svg
                  className="h-5 w-5 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C9.589 12.438 10.696 12 11.844 12c1.148 0 2.255.438 3.161 1.342m0 0a9 9 0 10-12.727 0m12.727 0A9 9 0 015.157 21H19m0 0h4v-4m0 4l-4-4"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700">More</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
          <p>
            <strong>Note:</strong> When your link is shared, others can view this job and apply directly.
          </p>
        </div>
      </div>
    </>
  );
};

export default JobShareDialog;
