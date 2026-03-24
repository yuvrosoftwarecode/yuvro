import React, { useState, useEffect, useRef } from 'react';
import { createPost, updatePost, Post } from '../../../services/community';
import { X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editPost?: Post | null;
}

const hardcodedTags = ["Exam", "Event", "Doubt", "Placement", "General"];

const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, onSuccess, editPost }) => {
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('ENTIRE_COLLEGE');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editPost) {
        setContent(editPost.content);
        setVisibility(editPost.visibility);
        setSelectedTags(editPost.tags.map(t => t.name));
        setImages([]);
        setPreviewUrls(editPost.images.map(img => img.image));
      } else {
        setContent('');
        setVisibility('ENTIRE_COLLEGE');
        setSelectedTags([]);
        setImages([]);
        setPreviewUrls([]);
      }
    }
  }, [isOpen, editPost]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const validFiles = filesArray.filter(f => f.size <= 5 * 1024 * 1024); // max 5MB
      
      if (validFiles.length < filesArray.length) {
        toast.error('Some files exceed the 5MB limit.');
      }

      const totalAllowed = 4;
      const currentLength = images.length + (editPost ? editPost.images.length : 0);
      
      if (currentLength + validFiles.length > totalAllowed) {
        toast.error(`Maximum ${totalAllowed} images allowed.`);
        const allowedToAdd = totalAllowed - currentLength;
        validFiles.splice(allowedToAdd);
      }

      if (validFiles.length > 0) {
        const newImages = [...images, ...validFiles];
        setImages(newImages);
        
        const newUrls = newImages.map(file => URL.createObjectURL(file));
        const currentPreviewUrls = editPost ? editPost.images.map(img => img.image) : [];
        setPreviewUrls([...currentPreviewUrls, ...newUrls]);
      }
    }
  };

  const removeImage = (index: number) => {
    if (editPost && index < editPost.images.length) {
      toast.info('Modifying existing images is not supported yet.');
      return;
    }
    
    const imageIndex = index - (editPost ? editPost.images.length : 0);
    const newImages = [...images];
    newImages.splice(imageIndex, 1);
    setImages(newImages);
    
    const newUrls = [...previewUrls];
    newUrls.splice(index, 1);
    setPreviewUrls(newUrls);
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const getTagStyles = (tag: string, isSelected: boolean) => {
    if (!isSelected) return 'text-gray-600 hover:bg-gray-50 border border-gray-100';
    
    switch (tag) {
      case 'Exam': return 'bg-red-100/50 text-red-700 border-red-200';
      case 'Event': return 'bg-blue-100/50 text-blue-700 border-blue-200';
      case 'Doubt': return 'bg-amber-100/50 text-amber-700 border-amber-200';
      case 'Placement': return 'bg-green-100/50 text-green-700 border-green-200';
      case 'General': return 'bg-slate-100/50 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-900 border-slate-200';
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;

    try {
      setLoading(true);
      
      if (editPost) {
        // Send as application/json since we are modifying text/tags mostly
        await updatePost(editPost.id, {
          content,
          visibility,
          tags: selectedTags,
        });
        toast.success("Post updated successfully");
      } else {
        const formData = new FormData();
        formData.append('content', content);
        formData.append('visibility', visibility);
        selectedTags.forEach(tag => {
          formData.append('tags', tag);
        });
        images.forEach(img => {
          formData.append('uploaded_images', img);
        });

        await createPost(formData);
        toast.success("Post created successfully");
      }

      onSuccess();
    } catch (error: any) {
      console.error(error);
      let msg = "Action failed";
      if (error?.response?.data) {
        if (typeof error.response.data === 'string') {
          msg = error.response.data;
        } else if (error.response.data.detail) {
          msg = error.response.data.detail;
        } else if (typeof error.response.data === 'object') {
          const firstKey = Object.keys(error.response.data)[0];
          const firstErr: any = error.response.data[firstKey];
          msg = `${firstKey}: ${Array.isArray(firstErr) ? firstErr[0] : firstErr}`;
        }
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle>
            {editPost ? 'Edit Post' : 'Create New Post'}
          </DialogTitle>
          <DialogDescription>
            {editPost 
              ? 'Update your community post details below' 
              : 'Share something with your campus community'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="content" className="text-sm font-medium text-gray-700">What's on your mind?</label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 1000))}
              placeholder="Share updates, ask questions, or start a discussion..."
              rows={5}
              className="border-gray-200 focus:border-slate-300 focus:ring-slate-200 resize-none text-gray-800"
            />
            <div className="text-right text-xs text-gray-500">{content.length}/1000</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label htmlFor="visibility" className="text-sm font-medium text-gray-700">Who can see this?</label>
              <Select
                value={visibility}
                onValueChange={(value) => setVisibility(value)}
              >
                <SelectTrigger className="border-gray-200 focus:border-slate-300">
                  <SelectValue placeholder="Select Visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENTIRE_COLLEGE">Entire College</SelectItem>
                  <SelectItem value="MY_DEPARTMENT">My Department</SelectItem>
                  <SelectItem value="MY_BATCH">My Batch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Tags (Optional)</label>
            <div className="flex flex-wrap gap-3">
              {hardcodedTags.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleTag(tag);
                    }}
                    className={`px-3 py-1.5 text-[13px] font-medium rounded-full transition-all duration-200 border flex items-center gap-1.5 ${getTagStyles(tag, isSelected)}`}
                  >
                    {tag}
                    {isSelected && <X className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {!editPost && (
            <div className="grid gap-2 mb-2">
              <label className="text-sm font-medium text-gray-700">Images (Optional)</label>
              <div className="flex items-center gap-4 flex-wrap">
                {previewUrls.map((url, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
                    <img src={url} alt="preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        removeImage(i);
                      }}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                
                {images.length < 4 && (
                  <div className="relative">
                    <input
                      type="file"
                      id="image-upload"
                      className="hidden"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      multiple
                      onChange={handleImageChange}
                      ref={fileInputRef}
                    />
                    <label
                      htmlFor="image-upload"
                      className="flex flex-col items-center justify-center w-24 h-24 rounded-lg cursor-pointer border-2 border-dashed bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-600 transition-all font-bold"
                    >
                      <ImageIcon className="w-6 h-6 mb-1 text-slate-400" />
                      <span className="text-xs">Add</span>
                    </label>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Up to 4 images, max 5MB each (JPEG, PNG, GIF, WebP)</p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-gray-200">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!content.trim() || loading} className="bg-slate-900 hover:bg-slate-950 text-white">
             {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (editPost ? 'Update' : 'Post')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostModal;
