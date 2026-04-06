from rest_framework import serializers
from .models import Post, Tag, PostImage, Like, Comment, SavedPost
from django.contrib.auth import get_user_model

User = get_user_model()

class CommunityUserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'role']
        
    def get_name(self, obj):
        if hasattr(obj, 'first_name') and hasattr(obj, 'last_name'):
            return f"{obj.first_name} {obj.last_name}".strip() or obj.email
        return obj.email

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name']

class PostImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostImage
        fields = ['id', 'image']

class CommentSerializer(serializers.ModelSerializer):
    user = CommunityUserSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = ['id', 'user', 'content', 'parent', 'created_at', 'updated_at', 'replies', 'likes_count', 'is_liked']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_replies(self, obj):
        # We only want to show replies if this is a top-level comment to avoid deep recursion
        # But for simplicity, we'll just return all replies and let the frontend handle depth if needed
        # Or even better, check if we're already deep
        if obj.replies.exists():
            return CommentSerializer(obj.replies.all(), many=True, context=self.context).data
        return []

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            from .models import CommentLike
            return CommentLike.objects.filter(comment=obj, user=request.user).exists()
        return False

class PostSerializer(serializers.ModelSerializer):
    user = CommunityUserSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    images = PostImageSerializer(many=True, read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()
    department_name = serializers.CharField(source="department.name", read_only=True)
    batch_name = serializers.CharField(source="batch.name", read_only=True)
    
    tag_names = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False
    )
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(), write_only=True, required=False
    )

    class Meta:
        model = Post
        fields = [
            'id', 'user', 'content', 'visibility', 'tags', 'department', 'department_name', 'batch', 'batch_name', 'college',
            'created_at', 'updated_at', 'images', 'comments', 'likes_count',
            'comments_count', 'is_liked', 'is_saved', 'tag_names', 'uploaded_images'
        ]
        read_only_fields = ['department', 'batch', 'college']

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Like.objects.filter(post=obj, user=request.user).exists()
        return False

    def get_is_saved(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return SavedPost.objects.filter(post=obj, user=request.user).exists()
        return False

    def create(self, validated_data):
        # Extract write-only fields
        uploaded_images = validated_data.pop('uploaded_images', [])
        tag_names = validated_data.pop('tag_names', [])

        # The extra kwargs passed from viewset.perform_create (or serializer.save)
        # will be in validated_data.
        post = Post.objects.create(**validated_data)
        
        # Handle tags
        if tag_names:
            tag_objs = []
            for name in tag_names:
                tag, _ = Tag.objects.get_or_create(name=name)
                tag_objs.append(tag)
            post.tags.set(tag_objs)

        # Handle images
        for img_file in uploaded_images:
            PostImage.objects.create(post=post, image=img_file)
            
        return post

    def update(self, instance, validated_data):
        tag_names = validated_data.pop('tag_names', None)
        
        instance.content = validated_data.get('content', instance.content)
        instance.visibility = validated_data.get('visibility', instance.visibility)
        instance.save()

        if tag_names is not None:
            tag_objs = []
            for name in tag_names:
                tag, _ = Tag.objects.get_or_create(name=name)
                tag_objs.append(tag)
            instance.tags.set(tag_objs)
            
        return instance
