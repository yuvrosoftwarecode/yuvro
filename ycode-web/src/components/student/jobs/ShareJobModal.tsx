import React from 'react';
import { X, Copy, MessageCircle, Facebook, Linkedin, Send, Mail, Link } from 'lucide-react';
import { Job } from '@/services/jobService';
import { toast } from 'sonner';

interface ShareJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
}

const ShareJobModal: React.FC<ShareJobModalProps> = ({ isOpen, onClose, job }) => {
  if (!isOpen || !job) return null;

  const shareUrl = `${window.location.origin}/jobs/${job.id}`;
  const shareTitle = `${job.title} at ${job.company.name}`;
  const shareText = `Check out this amazing job opportunity: ${job.title} at ${job.company.name}. ${job.description.substring(0, 100)}...`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Job link copied to clipboard!', {
        description: 'Share this link with others so they can apply to this job.',
      });
      onClose(); 
    } catch (error) {
      toast.error('Failed to copy link to clipboard');
    }
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(facebookUrl, '_blank');
  };

  const handleLinkedInShare = () => {
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}&summary=${encodeURIComponent(shareText)}`;
    window.open(linkedinUrl, '_blank');
  };

  const handleTelegramShare = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(telegramUrl, '_blank');
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Job Opportunity: ${shareTitle}`);
    const body = encodeURIComponent(`Hi,\n\nI found this interesting job opportunity that might be perfect for you:\n\n${shareTitle}\n\n${shareText}\n\nApply here: ${shareUrl}\n\nBest regards`);
    const emailUrl = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = emailUrl;
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

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Share Job</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
              {job.company.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
              <p className="text-gray-600 text-sm">{job.company.name}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>{getLocationText(job)}</span>
                {getSalaryText(job) && <span>{getSalaryText(job)}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Share via</h3>
          
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors mb-2"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Copy className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900">Copy Link</p>
              <p className="text-sm text-gray-500">Copy job link to clipboard</p>
            </div>
          </button>

          <button
            onClick={handleWhatsAppShare}
            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors mb-2"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900">WhatsApp</p>
              <p className="text-sm text-gray-500">Share via WhatsApp</p>
            </div>
          </button>

          <button
            onClick={handleLinkedInShare}
            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors mb-2"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Linkedin className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900">LinkedIn</p>
              <p className="text-sm text-gray-500">Share on LinkedIn</p>
            </div>
          </button>

          <button
            onClick={handleFacebookShare}
            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors mb-2"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Facebook className="h-5 w-5 text-blue-700" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900">Facebook</p>
              <p className="text-sm text-gray-500">Share on Facebook</p>
            </div>
          </button>

          <button
            onClick={handleTelegramShare}
            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors mb-2"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Send className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900">Telegram</p>
              <p className="text-sm text-gray-500">Share via Telegram</p>
            </div>
          </button>

          <button
            onClick={handleEmailShare}
            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors mb-2"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Mail className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900">Email</p>
              <p className="text-sm text-gray-500">Share via email</p>
            </div>
          </button>
        </div>

        <div className="px-6 pb-6">
          <div className="bg-gray-50 rounded-lg p-3 border">
            <div className="flex items-center gap-2 mb-2">
              <Link className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Job Link</span>
            </div>
            <p className="text-sm text-gray-600 break-all">{shareUrl}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareJobModal;