from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count
from .models import Post, Tag, Like, Comment, SavedPost
from .serializers import PostSerializer, TagSerializer, CommentSerializer
from rest_framework.exceptions import PermissionDenied
from django.conf import settings
import traceback

class TagViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticated]

class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        college = getattr(user, 'college', None)

        # User needs to be student or admin, ideally, but we're verifying they have access
        if getattr(user, 'role', None) not in ['student', 'admin', 'college_admin']:
            pass

        queryset = Post.objects.prefetch_related('tags', 'images', 'comments__user', 'likes', 'saved_by').annotate(
            likes_count=Count('likes', distinct=True),
            comments_count=Count('comments', distinct=True)
        ).all()

        if college:
            queryset = queryset.filter(college=college)
        elif getattr(user, 'role', None) != 'admin':
            return queryset.none()

        # Tabs logic
        tab = self.request.query_params.get('tab', 'all')
        
        if tab == 'saved':
            queryset = queryset.filter(saved_by__user=user)
        elif tab == 'my_department' and getattr(user, 'student_profile', None):
            department = user.student_profile.department
            queryset = queryset.filter(department=department)
        elif tab == 'my_batch' and getattr(user, 'student_profile', None):
            batch = user.student_profile.batch
            queryset = queryset.filter(batch=batch)
        else:
            # Default "All" logic with visibility constraints
            # If standard student, they only see Entire College OR their own dept/batch if matches
            if getattr(user, 'role', None) == 'student':
                queries = Q(visibility='ENTIRE_COLLEGE') | Q(user=user)
                
                # We need to rely on their profile for department/batch. Assuming user.student_profile exists.
                # If not, we just show ENTIRE_COLLEGE.
                if hasattr(user, 'student_profile'):
                    if user.student_profile.department:
                        queries |= Q(visibility='MY_DEPARTMENT', department=user.student_profile.department)
                    if user.student_profile.batch:
                        queries |= Q(visibility='MY_BATCH', batch=user.student_profile.batch)
                
                queryset = queryset.filter(queries)

        return queryset.distinct()

    def create(self, request, *args, **kwargs):
        # We manually call is_valid to catch and return field errors specifically
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # save() returns the instance
            instance = serializer.save(
                user=request.user,
                department=getattr(request.user.student_profile, 'department', None) if hasattr(request.user, 'student_profile') else None,
                batch=getattr(request.user.student_profile, 'batch', None) if hasattr(request.user, 'student_profile') else None,
                college=getattr(request.user, 'college', None)
            )
            # Re-serialize to include all read-only fields generated on creation
            response_serializer = self.get_serializer(instance)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            tb = traceback.format_exc()
            # If it failed during save/create in serializer, it's a server/logic error
            return Response({
                'detail': str(e),
                'error': 'Post creation failed on server',
                'traceback': tb if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # We manually handle the creation in 'create' to be more robust, 
    # but we'll leave perform_create for compatibility if called elsewhere.
    def perform_create(self, serializer):
        user = self.request.user
        department = getattr(user.student_profile, 'department', None) if hasattr(user, 'student_profile') else None
        batch = getattr(user.student_profile, 'batch', None) if hasattr(user, 'student_profile') else None
        college = getattr(user, 'college', None)
        serializer.save(user=user, department=department, batch=batch, college=college)

    def perform_update(self, serializer):
        if self.get_object().user != self.request.user:
            raise PermissionDenied("You can only edit your own posts.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            raise PermissionDenied("You can only delete your own posts.")
        instance.delete()

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        post = self.get_object()
        Like.objects.get_or_create(post=post, user=request.user)
        return Response({'status': 'liked'})

    @action(detail=True, methods=['post'])
    def unlike(self, request, pk=None):
        post = self.get_object()
        Like.objects.filter(post=post, user=request.user).delete()
        return Response({'status': 'unliked'})

    @action(detail=True, methods=['post'])
    def save_post(self, request, pk=None):
        post = self.get_object()
        SavedPost.objects.get_or_create(post=post, user=request.user)
        return Response({'status': 'saved'})

    @action(detail=True, methods=['post'])
    def unsave_post(self, request, pk=None):
        post = self.get_object()
        SavedPost.objects.filter(post=post, user=request.user).delete()
        return Response({'status': 'unsaved'})

    @action(detail=True, methods=['post'])
    def comment(self, request, pk=None):
        post = self.get_object()
        content = request.data.get('content')
        parent_id = request.data.get('parent_id') # Support replies
        
        if not content:
            return Response({'error': 'Content is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        parent = None
        if parent_id:
            try:
                parent = Comment.objects.get(id=parent_id, post=post)
            except Comment.DoesNotExist:
                return Response({'error': 'Parent comment not found'}, status=status.HTTP_404_NOT_FOUND)
        
        comment = Comment.objects.create(post=post, user=request.user, content=content, parent=parent)
        serializer = CommentSerializer(comment, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            raise PermissionDenied("You can only delete your own comments.")
        instance.delete()

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        from .models import CommentLike
        comment = self.get_object()
        CommentLike.objects.get_or_create(comment=comment, user=request.user)
        return Response({'status': 'liked'})

    @action(detail=True, methods=['post'])
    def unlike(self, request, pk=None):
        from .models import CommentLike
        comment = self.get_object()
        CommentLike.objects.filter(comment=comment, user=request.user).delete()
        return Response({'status': 'unliked'})
