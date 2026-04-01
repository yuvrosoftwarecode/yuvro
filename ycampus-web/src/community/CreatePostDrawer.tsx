import React, { useState, useRef } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCommunity, PostTag, PostAudience } from '@/hooks/useCommunity';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Loader2, X, ImagePlus } from 'lucide-react';

interface CreatePostDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated: () => void;
}

const availableTags: { value: PostTag; label: string; color: string }[] = [
  { value: 'exam', label: 'Exam', color: 'bg-red-100 text-red-700 hover:bg-red-200' },
  { value: 'event', label: 'Event', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  { value: 'doubt', label: 'Doubt', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
  { value: 'placement', label: 'Placement', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
  { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
];

const audienceOptions: { value: PostAudience; label: string }[] = [
  { value: 'college', label: 'Entire College' },
  { value: 'department', label: 'My Department' },
  { value: 'batch', label: 'My Batch' },
];

export function CreatePostDrawer({
  open,
  onOpenChange,
  onPostCreated,
}: CreatePostDrawerProps) {
  const isMobile = useIsMobile();
  const { createPost, isCreatingPost } = useCommunity();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<PostTag[]>([]);
  const [audience, setAudience] = useState<PostAudience>('college');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const toggleTag = (tag: PostTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 4 images
    const remainingSlots = 4 - selectedImages.length;
    const filesToAdd = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      // toast is imported via useCommunity's sonner
    }

    // Create preview URLs
    const newPreviewUrls = filesToAdd.map(file => URL.createObjectURL(file));
    
    setSelectedImages(prev => [...prev, ...filesToAdd]);
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    // Revoke the preview URL to free memory
    URL.revokeObjectURL(previewUrls[index]);
    
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setContent('');
    setSelectedTags([]);
    setAudience('college');
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setSelectedImages([]);
    setPreviewUrls([]);
  };


  const handleSubmit = async () => {
    if (!content.trim()) return;

    try {
      await createPost({
        content: content.trim(),
        tags: selectedTags,
        audience,
        images: selectedImages, // Pass File objects directly
      });

      resetForm();
      onPostCreated();
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const isSubmitting = isCreatingPost;

  const formContent = (
    <div className="space-y-4 px-4 sm:px-0">
      <div className="space-y-2">
        <Label htmlFor="content">What's on your mind?</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share updates, ask questions, or start a discussion..."
          className="min-h-[120px] resize-none"
          autoFocus
        />
        <div className="text-xs text-muted-foreground text-right">
          {content.length}/1000
        </div>
      </div>

      {/* Image Upload Section */}
      <div className="space-y-2">
        <Label>Images (optional)</Label>
        <div className="flex flex-wrap gap-2">
          {previewUrls.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`Preview ${index + 1}`}
                className="h-20 w-20 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {selectedImages.length < 4 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-20 w-20 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-muted/50 transition-colors"
            >
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Add</span>
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          onChange={handleImageSelect}
          className="hidden"
        />
        <p className="text-xs text-muted-foreground">
          Up to 4 images, max 5MB each (JPEG, PNG, GIF, WebP)
        </p>
      </div>


      <div className="space-y-2">
        <Label>Tags (optional)</Label>
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => (
            <Badge
              key={tag.value}
              variant="outline"
              className={cn(
                'cursor-pointer transition-colors',
                selectedTags.includes(tag.value)
                  ? tag.color
                  : 'hover:bg-muted'
              )}
              onClick={() => toggleTag(tag.value)}
            >
              {tag.label}
              {selectedTags.includes(tag.value) && (
                <X className="h-3 w-3 ml-1" />
              )}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Who can see this?</Label>
        <Select value={audience} onValueChange={(v) => setAudience(v as PostAudience)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {audienceOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const footerContent = (
    <div className="flex justify-end gap-2 px-4 sm:px-0">
      <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button
        onClick={handleSubmit}
        disabled={!content.trim() || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Posting...
          </>
        ) : (
          'Post'
        )}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Create Post</DrawerTitle>
            <DrawerDescription>
              Share with your campus community
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto flex-1 pb-4">
            {formContent}
          </div>
          <DrawerFooter>{footerContent}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
          <DialogDescription>
            Share with your campus community
          </DialogDescription>
        </DialogHeader>
        {formContent}
        <DialogFooter>{footerContent}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState, useRef } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCommunity, PostTag, PostAudience } from '@/hooks/useCommunity';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Loader2, X, ImagePlus } from 'lucide-react';

interface CreatePostDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated: () => void;
}

const availableTags: { value: PostTag; label: string; color: string }[] = [
  { value: 'exam', label: 'Exam', color: 'bg-red-100 text-red-700 hover:bg-red-200' },
  { value: 'event', label: 'Event', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  { value: 'doubt', label: 'Doubt', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
  { value: 'placement', label: 'Placement', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
  { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
];

const audienceOptions: { value: PostAudience; label: string }[] = [
  { value: 'college', label: 'Entire College' },
  { value: 'department', label: 'My Department' },
  { value: 'batch', label: 'My Batch' },
];

export function CreatePostDrawer({
  open,
  onOpenChange,
  onPostCreated,
}: CreatePostDrawerProps) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { createPost, isCreatingPost } = useCommunity();
  const { uploadImages, uploading, uploadProgress, deleteImage } = useImageUpload(user?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<PostTag[]>([]);
  const [audience, setAudience] = useState<PostAudience>('college');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const toggleTag = (tag: PostTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 4 images
    const remainingSlots = 4 - selectedImages.length;
    const filesToAdd = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      // toast is imported via useCommunity's sonner
    }

    // Create preview URLs
    const newPreviewUrls = filesToAdd.map(file => URL.createObjectURL(file));
    
    setSelectedImages(prev => [...prev, ...filesToAdd]);
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    // Revoke the preview URL to free memory
    URL.revokeObjectURL(previewUrls[index]);
    
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setContent('');
    setSelectedTags([]);
    setAudience('college');
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setSelectedImages([]);
    setPreviewUrls([]);
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;

    try {
      // Upload images first
      let uploadedImageUrls: string[] = [];
      if (selectedImages.length > 0) {
        uploadedImageUrls = await uploadImages(selectedImages);
      }

      await createPost({
        content: content.trim(),
        tags: selectedTags,
        audience,
        images: uploadedImageUrls,
      });

      resetForm();
      onPostCreated();
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const isSubmitting = isCreatingPost || uploading;

  const formContent = (
    <div className="space-y-4 px-4 sm:px-0">
      <div className="space-y-2">
        <Label htmlFor="content">What's on your mind?</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share updates, ask questions, or start a discussion..."
          className="min-h-[120px] resize-none"
          autoFocus
        />
        <div className="text-xs text-muted-foreground text-right">
          {content.length}/1000
        </div>
      </div>

      {/* Image Upload Section */}
      <div className="space-y-2">
        <Label>Images (optional)</Label>
        <div className="flex flex-wrap gap-2">
          {previewUrls.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`Preview ${index + 1}`}
                className="h-20 w-20 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {selectedImages.length < 4 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-20 w-20 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-muted/50 transition-colors"
            >
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Add</span>
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          onChange={handleImageSelect}
          className="hidden"
        />
        <p className="text-xs text-muted-foreground">
          Up to 4 images, max 5MB each (JPEG, PNG, GIF, WebP)
        </p>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Uploading images...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} className="h-1" />
        </div>
      )}

      <div className="space-y-2">
        <Label>Tags (optional)</Label>
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => (
            <Badge
              key={tag.value}
              variant="outline"
              className={cn(
                'cursor-pointer transition-colors',
                selectedTags.includes(tag.value)
                  ? tag.color
                  : 'hover:bg-muted'
              )}
              onClick={() => toggleTag(tag.value)}
            >
              {tag.label}
              {selectedTags.includes(tag.value) && (
                <X className="h-3 w-3 ml-1" />
              )}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Who can see this?</Label>
        <Select value={audience} onValueChange={(v) => setAudience(v as PostAudience)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {audienceOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const footerContent = (
    <div className="flex justify-end gap-2 px-4 sm:px-0">
      <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button
        onClick={handleSubmit}
        disabled={!content.trim() || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {uploading ? 'Uploading...' : 'Posting...'}
          </>
        ) : (
          'Post'
        )}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Create Post</DrawerTitle>
            <DrawerDescription>
              Share with your campus community
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto flex-1 pb-4">
            {formContent}
          </div>
          <DrawerFooter>{footerContent}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
          <DialogDescription>
            Share with your campus community
          </DialogDescription>
        </DialogHeader>
        {formContent}
        <DialogFooter>{footerContent}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
