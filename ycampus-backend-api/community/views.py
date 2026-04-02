from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count
from .models import Post, Tag, Like, Comment, SavedPost
from .serializers import PostSerializer, TagSerializer, CommentSerializer
from rest_framework.exceptions import PermissionDenied

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
        import traceback
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            self.perform_create(serializer)
        except Exception as e:
            tb = traceback.format_exc()
            return Response({'detail': str(e), 'traceback': tb}, status=status.HTTP_400_BAD_REQUEST)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        user = self.request.user
        department = None
        batch = None
        college = getattr(user, 'college', None)
        
        if hasattr(user, 'student_profile'):
            department = user.student_profile.department
            batch = user.student_profile.batch
            
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
        if not content:
            return Response({'error': 'Content is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        comment = Comment.objects.create(post=post, user=request.user, content=content)
        serializer = CommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
