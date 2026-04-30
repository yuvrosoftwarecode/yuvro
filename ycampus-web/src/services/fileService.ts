import restApiAuthUtil from '../utils/RestApiAuthUtil';

export const fileService = {
  uploadFile: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    return await restApiAuthUtil.post<{ url: string }>('/core/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};
