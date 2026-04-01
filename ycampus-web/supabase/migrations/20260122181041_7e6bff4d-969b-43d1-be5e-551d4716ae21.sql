-- Drop the foreign key constraint on community_posts.author_id to allow mock auth users
ALTER TABLE public.community_posts 
DROP CONSTRAINT IF EXISTS community_posts_author_id_fkey;

-- Drop the foreign key constraint on community_comments.author_id
ALTER TABLE public.community_comments 
DROP CONSTRAINT IF EXISTS community_comments_author_id_fkey;

-- Drop the foreign key constraint on community_likes.user_id
ALTER TABLE public.community_likes 
DROP CONSTRAINT IF EXISTS community_likes_user_id_fkey;

-- Drop the foreign key constraint on community_bookmarks.user_id
ALTER TABLE public.community_bookmarks 
DROP CONSTRAINT IF EXISTS community_bookmarks_user_id_fkey;

-- Drop the foreign key constraint on community_reports.reporter_id
ALTER TABLE public.community_reports 
DROP CONSTRAINT IF EXISTS community_reports_reporter_id_fkey;