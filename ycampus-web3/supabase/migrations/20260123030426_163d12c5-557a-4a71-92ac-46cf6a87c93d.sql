-- Create trigger for updating post comments count
CREATE TRIGGER trigger_update_post_comments_count
AFTER INSERT OR DELETE ON public.community_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_post_comments_count();

-- Create trigger for updating post likes count
CREATE TRIGGER trigger_update_post_likes_count
AFTER INSERT OR DELETE ON public.community_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_post_likes_count();

-- Create trigger for updating comment likes count
CREATE TRIGGER trigger_update_comment_likes_count
AFTER INSERT OR DELETE ON public.community_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_comment_likes_count();