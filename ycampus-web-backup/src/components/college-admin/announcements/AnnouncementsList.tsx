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

  return (
    <div className="flex flex-col gap-0 w-full mt-2">
      {announcements.map((announcement, index) => (
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
