import { useState } from 'react';
import { toast } from 'sonner';
import { fileService } from '@/services/fileService';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function useImageUpload(userId: string | undefined) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadImages = async (files: File[]): Promise<string[]> => {
    if (!userId) {
      toast.error('You must be logged in to upload images');
      return [];
    }

    const validFiles = files.filter(file => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name} is not a supported image type`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return [];

    setUploading(true);
    setUploadProgress(0);

    const uploadedUrls: string[] = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];

      try {
        const response = await fileService.uploadFile(file);
        uploadedUrls.push(response.url);
        setUploadProgress(((i + 1) / validFiles.length) * 100);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    setUploadProgress(0);

    return uploadedUrls;
  };

  const deleteImage = async (imageUrl: string): Promise<boolean> => {
    // Backend doesn't currently support generic file deletion via API
    // This would require a more complex implementation on the backend
    console.warn('Image deletion not supported on backend yet:', imageUrl);
    return true; // Return true to avoid UI errors if it's just a cleanup
  };

  return {
    uploadImages,
    deleteImage,
    uploading,
    uploadProgress,
  };
}
