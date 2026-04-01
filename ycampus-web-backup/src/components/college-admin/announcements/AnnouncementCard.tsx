import React from 'react';
import { User, Calendar, Paperclip, ChevronRight, Pencil, Trash2 } from 'lucide-react';

// Using a more generalized any interface since fields might vary slightly between API and the user prompt
interface AnnouncementCardProps {
  announcement: any;
  onView?: (announcement: any) => void;
  onEdit?: (announcement: any) => void;
  onDelete?: (announcement: any) => void;
}

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({ announcement, onView, onEdit, onDelete }) => {
  const getPriorityStyles = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-50 text-red-600 border-red-200';
      case 'important':
        return 'bg-orange-50 text-orange-600 border-orange-200';
      default:
        return 'bg-blue-50 text-blue-600 border-blue-200';
    }
  };

  const formattedDate = announcement.expiry_date
    ? new Date(announcement.expiry_date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : '';

  // Ensure that if the createdBy is an email it formats nicely.
  const createdBy = announcement.created_by_name?.includes('@') 
    ? 'College Admin' 
    : (announcement.created_by_name || 'College Admin');
  const hasAttachment = !!announcement.attachment;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between transition-all duration-200 hover:shadow-md hover:border-gray-300 mb-4 group w-full">
      <div className="flex-1 pr-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-bold text-gray-900">{announcement.title}</h3>
          
          <span
            className={`text-xs font-medium px-3 py-1 rounded-full border ${
              announcement.level === 'college' 
                ? 'bg-blue-50 text-blue-600 border-blue-200' 
                : 'bg-purple-50 text-purple-600 border-purple-200'
            }`}
          >
            {announcement.level === 'college' 
              ? 'College Level' 
              : (announcement.department_name ? `${announcement.department_name} Department` : 'Department Announcement')}
          </span>

          <span
            className={`text-xs font-medium px-3 py-1 rounded-full border ${getPriorityStyles(announcement.priority)}`}
          >
            {announcement.priority ? announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1) : 'Normal'}
          </span>
        </div>

        <p className="text-gray-500 text-sm line-clamp-2">
          {announcement.content}
        </p>

        <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400 font-medium">
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4" />
            <span>{createdBy}</span>
          </div>
          
          {formattedDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{formattedDate}</span>
            </div>
          )}

          {hasAttachment && (
            <a 
              href={announcement.attachment} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-blue-600 cursor-pointer hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <Paperclip className="w-4 h-4" />
              <span>Attachment</span>
            </a>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 sm:mt-0 shrink-0">
        {onEdit && (
          <button
            onClick={() => onEdit(announcement)}
            className="p-1.5 text-gray-400 hover:text-slate-950 hover:bg-slate-100 rounded-md transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(announcement)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button 
          onClick={() => onView && onView(announcement)}
          className="flex items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors font-medium ml-2"
        >
          View <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
