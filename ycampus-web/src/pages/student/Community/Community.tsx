import React, { useState, useEffect } from 'react';
import RoleSidebar from '../../../components/common/RoleSidebar';
import PageHeader from '../../../components/common/PageHeader';
import { useAuth } from '../../../contexts/AuthContext';
import PostCard from './PostCard';
import CreatePostModal from './CreatePostModal';
import { Post, getPosts } from '../../../services/community';
import { MessageCircle, Users, PenSquare } from 'lucide-react';
import { toast } from 'sonner';

const Community = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'my_department', label: 'My Department' },
    { id: 'my_batch', label: 'My Batch' },
    { id: 'saved', label: 'Saved' },
  ];

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const data = await getPosts(activeTab);
      setPosts(data);
    } catch (error) {
      toast.error('Failed to load posts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [activeTab]);

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setIsCreateModalOpen(true);
  };

  const handleCreatePostSuccess = () => {
    fetchPosts();
    setIsCreateModalOpen(false);
    setEditingPost(null);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <RoleSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto space-y-6">
            <PageHeader 
              title={
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-slate-900" />
                  <span>Community</span>
                </div>
              }
              subtitle="Connect, collaborate, and share with your campus community"
            />
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-8 flex items-center gap-4">
             <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center font-bold text-lg">
                {(user as any)?.first_name?.charAt(0).toUpperCase() || 'S'}
             </div>
             <div 
               className="flex-1 bg-gray-100 rounded-full px-4 py-3 text-gray-500 cursor-text hover:bg-gray-200 transition-colors"
               onClick={() => { setEditingPost(null); setIsCreateModalOpen(true); }}
             >
                Share something with your community...
             </div>
             <button 
                onClick={() => { setEditingPost(null); setIsCreateModalOpen(true); }}
                className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-slate-950 transition-colors flex items-center gap-2 shadow-sm"
             >
               <PenSquare className="w-4 h-4" />
               <span className="hidden sm:inline">Create Post</span>
               <span className="sm:hidden">+</span>
             </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 flex overflow-x-auto hide-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-4 px-6 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id 
                    ? 'border-slate-900 text-slate-900' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
              </div>
            ) : posts.length > 0 ? (
              posts.map(post => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  onUpdate={fetchPosts} 
                  onEdit={() => handleEdit(post)}
                />
              ))
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
                No posts found in this section. Be the first to start a conversation!
              </div>
            )}
          </div>
          </div>
        </main>
      </div>

      <CreatePostModal 
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingPost(null);
        }}
        onSuccess={handleCreatePostSuccess}
        editPost={editingPost}
      />
    </div>
  );
};

export default Community;
