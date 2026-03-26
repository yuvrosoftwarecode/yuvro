import React from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { CommunityFeed } from '@/components/community/CommunityFeed';

const Community = () => {
  return (
    <StudentLayout>
      <CommunityFeed />
    </StudentLayout>
  );
};

export default Community;
