import React, { useState } from 'react';
import { Post, likePost, unlikePost, savePost, unsavePost, deletePost, commentOnPost } from '../../../services/community';
import { Heart, MessageCircle, Bookmark, MoreVertical, Send } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'sonner';

interface PostCardProps {
  post: Post;
  onUpdate: () => void;
  onEdit: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onUpdate, onEdit }) => {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  // Parse time relative
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const isOwner = user?.email === post.user.email;

  const handleLike = async () => {
    try {
      if (post.is_liked) {
        await unlikePost(post.id);
      } else {
        await likePost(post.id);
      }
      onUpdate();
    } catch (error) {
      toast.error('Failed to update like status');
    }
  };

  const handleSave = async () => {
    try {
      if (post.is_saved) {
        await unsavePost(post.id);
      } else {
        await savePost(post.id);
      }
      onUpdate();
    } catch (error) {
      toast.error('Failed to update save status');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await commentOnPost(post.id, commentText);
      setCommentText('');
      onUpdate();
    } catch (error) {
      toast.error('Failed to post comment');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await deletePost(post.id);
      toast.success('Post deleted');
      onUpdate();
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4 relative">
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-3 items-center">
          <div className="w-12 h-12 bg-gray-200 text-gray-800 rounded-full flex items-center justify-center font-medium text-lg">
            {post.user.avatar ? (
               <img src={post.user.avatar} alt="avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
               post.user.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex flex-col">
            <h4 className="font-semibold text-gray-900 text-base leading-tight">{post.user.name}</h4>
            <span className="text-sm text-gray-400 mt-0.5">{getTimeAgo(post.created_at)}</span>
          </div>
        </div>

        {isOwner && (
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)} 
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
            >
              <MoreVertical size={20} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 shadow-md rounded-lg py-2 w-32 z-10">
                <button 
                  onClick={() => { setShowMenu(false); onEdit(); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Edit
                </button>
                <button 
                  onClick={() => { setShowMenu(false); handleDelete(); }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {post.tags.map(tag => (
          <span key={tag.id} className="bg-blue-100 text-blue-600 text-sm font-medium px-3 py-1 rounded-full">
            {tag.name}
          </span>
        ))}
      </div>

      <p className="text-gray-900 whitespace-pre-wrap mb-5 text-[15px]" style={{ wordBreak: 'break-word' }}>
        {post.content}
      </p>

      {post.images && post.images.length > 0 && (
        <div className={`grid gap-2 mb-5 ${
          post.images.length === 1 ? 'grid-cols-1' : 
          post.images.length === 2 ? 'grid-cols-2' : 
          post.images.length === 3 ? 'grid-cols-2' : 'grid-cols-2'
        }`}>
          {post.images.map((img, idx) => (
            <img 
              key={img.id} 
              src={img.image} 
              alt={`Post img ${idx}`} 
              className={`rounded-lg object-cover w-full border border-gray-100 ${post.images.length === 3 && idx === 0 ? 'col-span-2' : 'h-48'}`} 
            />
          ))}
        </div>
      )}

      <div className="border-t border-gray-100"></div>
      
      <div className="flex items-center justify-between pt-4">
        <div className="flex gap-6">
          <button 
            onClick={handleLike} 
            className={`flex items-center gap-2 text-sm ${post.is_liked ? 'text-red-500' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Heart size={20} className={post.is_liked ? "fill-current" : "stroke-current fill-transparent stroke-[1.5]"} />
            <span className="font-medium">{post.likes_count}</span>
          </button>
          
          <button 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <MessageCircle size={20} className="stroke-current fill-transparent stroke-[1.5]" />
            <span className="font-medium">{post.comments_count}</span>
          </button>
        </div>
        
        <button 
          onClick={handleSave}
          className={`text-sm ${post.is_saved ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Bookmark size={20} className={post.is_saved ? "fill-current" : "stroke-current fill-transparent stroke-[1.5]"} />
        </button>
      </div>

      {showComments && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="space-y-4 max-h-60 overflow-y-auto mb-4 hide-scrollbar">
            {post.comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <div className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {c.user?.name ? c.user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl rounded-tl-none text-sm w-full">
                  <div className="font-semibold text-gray-800 mb-1">{c.user?.name || 'User'}</div>
                  <p className="text-gray-600">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
             <div className="w-8 h-8 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center font-bold text-xs">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
             </div>
             <input 
               type="text" 
               placeholder="Write a comment..." 
               value={commentText}
               onChange={(e) => setCommentText(e.target.value)}
               className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
             />
             <button type="submit" disabled={!commentText.trim()} className="text-orange-600 disabled:text-gray-400 p-2">
               <Send size={18} />
             </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PostCard;
