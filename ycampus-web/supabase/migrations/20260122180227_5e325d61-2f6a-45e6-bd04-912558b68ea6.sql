-- Create post tags enum
CREATE TYPE public.post_tag AS ENUM ('exam', 'event', 'doubt', 'placement', 'general');

-- Create audience type enum
CREATE TYPE public.post_audience AS ENUM ('college', 'department', 'batch');

-- Create community_posts table
CREATE TABLE public.community_posts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    images TEXT[] DEFAULT '{}',
    tags post_tag[] DEFAULT '{}',
    audience post_audience NOT NULL DEFAULT 'college',
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    batch_id UUID,
    likes_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    is_hidden BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create community_comments table
CREATE TABLE public.community_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes_count INTEGER NOT NULL DEFAULT 0,
    is_hidden BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create community_likes table (for posts and comments)
CREATE TABLE public.community_likes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT likes_target_check CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NOT NULL)
    ),
    UNIQUE(user_id, post_id),
    UNIQUE(user_id, comment_id)
);

-- Create community_bookmarks table
CREATE TABLE public.community_bookmarks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, post_id)
);

-- Create community_reports table
CREATE TABLE public.community_reports (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT reports_target_check CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NOT NULL)
    )
);

-- Enable RLS on all tables
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

-- Posts policies
CREATE POLICY "Anyone can view non-hidden posts" ON public.community_posts
    FOR SELECT USING (is_hidden = false);

CREATE POLICY "Authenticated users can create posts" ON public.community_posts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own posts" ON public.community_posts
    FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Users can delete own posts" ON public.community_posts
    FOR DELETE USING (author_id = auth.uid());

-- Comments policies
CREATE POLICY "Anyone can view non-hidden comments" ON public.community_comments
    FOR SELECT USING (is_hidden = false);

CREATE POLICY "Authenticated users can create comments" ON public.community_comments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own comments" ON public.community_comments
    FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Users can delete own comments" ON public.community_comments
    FOR DELETE USING (author_id = auth.uid());

-- Likes policies
CREATE POLICY "Anyone can view likes" ON public.community_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can add likes" ON public.community_likes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can remove own likes" ON public.community_likes
    FOR DELETE USING (user_id = auth.uid());

-- Bookmarks policies
CREATE POLICY "Users can view own bookmarks" ON public.community_bookmarks
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can add bookmarks" ON public.community_bookmarks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can remove own bookmarks" ON public.community_bookmarks
    FOR DELETE USING (user_id = auth.uid());

-- Reports policies
CREATE POLICY "Users can view own reports" ON public.community_reports
    FOR SELECT USING (reporter_id = auth.uid());

CREATE POLICY "Users can create reports" ON public.community_reports
    FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_posts_author ON public.community_posts(author_id);
CREATE INDEX idx_posts_created ON public.community_posts(created_at DESC);
CREATE INDEX idx_posts_department ON public.community_posts(department_id);
CREATE INDEX idx_comments_post ON public.community_comments(post_id);
CREATE INDEX idx_comments_parent ON public.community_comments(parent_id);
CREATE INDEX idx_likes_post ON public.community_likes(post_id);
CREATE INDEX idx_likes_comment ON public.community_likes(comment_id);
CREATE INDEX idx_bookmarks_user ON public.community_bookmarks(user_id);

-- Function to update post likes count
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.post_id IS NOT NULL THEN
        UPDATE public.community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' AND OLD.post_id IS NOT NULL THEN
        UPDATE public.community_posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update comment likes count
CREATE OR REPLACE FUNCTION public.update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.comment_id IS NOT NULL THEN
        UPDATE public.community_comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' AND OLD.comment_id IS NOT NULL THEN
        UPDATE public.community_comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update post comments count
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.community_posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers without WHEN clause (logic handled inside function)
CREATE TRIGGER trigger_update_post_likes
    AFTER INSERT OR DELETE ON public.community_likes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_post_likes_count();

CREATE TRIGGER trigger_update_comment_likes
    AFTER INSERT OR DELETE ON public.community_likes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_comment_likes_count();

CREATE TRIGGER trigger_update_post_comments
    AFTER INSERT OR DELETE ON public.community_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_post_comments_count();

-- Update timestamps trigger
CREATE TRIGGER update_community_posts_updated_at
    BEFORE UPDATE ON public.community_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_community_comments_updated_at
    BEFORE UPDATE ON public.community_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();