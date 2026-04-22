export const getMediaUrl = (url: string | null | undefined) => {
  if (!url) return undefined;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  
  const baseUrl = import.meta.env.VITE_BACKEND_API_BASE_URL || '';
  // Remove /api if it's there to get the root domain for media
  const rootUrl = baseUrl.replace(/\/api\/?$/, '');
  return `${rootUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};
