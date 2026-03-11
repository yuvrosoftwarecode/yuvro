import React from 'react';
import { AnnouncementCard } from './AnnouncementCard';

interface AnnouncementsListProps {
  announcements: any[];
  onView?: (announcement: any) => void;
  onEdit?: (announcement: any) => void;
  onDelete?: (announcement: any) => void;
}

export const AnnouncementsList: React.FC<AnnouncementsListProps> = ({ announcements, onView, onEdit, onDelete }) => {
  if (!announcements || announcements.length === 0) {
    return null;
  }

  // Ensure newest announcements are at the top (if they have a created_at property, otherwise use original order assuming API did it)
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.created_at && b.created_at) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return 0;
  });

  return (
    <div className="flex flex-col gap-0 w-full mt-2">
      {sortedAnnouncements.map((announcement, index) => (
        <AnnouncementCard 
          key={announcement.id || index} 
          announcement={announcement} 
          onView={onView} 
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
