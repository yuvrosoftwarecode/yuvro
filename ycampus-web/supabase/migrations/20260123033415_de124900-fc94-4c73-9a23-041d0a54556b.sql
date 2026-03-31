-- Tighten Community RLS to require authenticated user and enforce ownership

-- community_posts
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON public.community_posts;

CREATE POLICY "Authenticated users can create posts"
ON public.community_posts
FOR INSERT
TO authenticated
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update own posts"
ON public.community_posts
FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can delete own posts"
ON public.community_posts
FOR DELETE
TO authenticated
USING (author_id = auth.uid());

-- community_comments
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.community_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.community_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.community_comments;

CREATE POLICY "Authenticated users can create comments"
ON public.community_comments
FOR INSERT
TO authenticated
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update own comments"
ON public.community_comments
FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can delete own comments"
ON public.community_comments
FOR DELETE
TO authenticated
USING (author_id = auth.uid());

-- community_likes
DROP POLICY IF EXISTS "Users can add likes" ON public.community_likes;
DROP POLICY IF EXISTS "Users can remove own likes" ON public.community_likes;

CREATE POLICY "Users can add likes"
ON public.community_likes
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove own likes"
ON public.community_likes
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- community_bookmarks
DROP POLICY IF EXISTS "Users can add bookmarks" ON public.community_bookmarks;
DROP POLICY IF EXISTS "Users can remove own bookmarks" ON public.community_bookmarks;

CREATE POLICY "Users can add bookmarks"
ON public.community_bookmarks
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove own bookmarks"
ON public.community_bookmarks
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- community_reports
DROP POLICY IF EXISTS "Users can create reports" ON public.community_reports;

CREATE POLICY "Users can create reports"
ON public.community_reports
FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());
