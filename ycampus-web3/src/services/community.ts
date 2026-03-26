import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface Tag {
  id: number;
  name: string;
}

export interface PostImage {
  id: number;
  image: string;
}

export interface Comment {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
  content: string;
  created_at: string;
}

export interface Post {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
  content: string;
  visibility: string;
  tags: Tag[];
  created_at: string;
  images: PostImage[];
  comments: Comment[];
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_saved: boolean;
}

export const getPosts = async (tab: string = 'all'): Promise<Post[]> => {
  const response = await restApiAuthUtil.get(`/community/posts/?tab=${tab}`);
  return response as any;
};

export const createPost = async (formData: FormData): Promise<Post> => {
  const response = await restApiAuthUtil.post('/community/posts/', formData);
  return response as any;
};

export const updatePost = async (id: number, data: any): Promise<Post> => {
  const response = await restApiAuthUtil.patch(`/community/posts/${id}/`, data);
  return response as any;
};

export const deletePost = async (id: number): Promise<void> => {
  await restApiAuthUtil.delete(`/community/posts/${id}/`);
};

export const likePost = async (id: number): Promise<void> => {
  await restApiAuthUtil.post(`/community/posts/${id}/like/`);
};

export const unlikePost = async (id: number): Promise<void> => {
  await restApiAuthUtil.post(`/community/posts/${id}/unlike/`);
};

export const savePost = async (id: number): Promise<void> => {
  await restApiAuthUtil.post(`/community/posts/${id}/save_post/`);
};

export const unsavePost = async (id: number): Promise<void> => {
  await restApiAuthUtil.post(`/community/posts/${id}/unsave_post/`);
};

export const commentOnPost = async (id: number, content: string): Promise<Comment> => {
  const response = await restApiAuthUtil.post(`/community/posts/${id}/comment/`, { content });
  return response as any;
};

export const getTags = async (): Promise<Tag[]> => {
  const response = await restApiAuthUtil.get('/community/tags/');
  return response as any;
};
