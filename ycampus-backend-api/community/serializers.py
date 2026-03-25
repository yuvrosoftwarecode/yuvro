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
    
    class Meta:
        model = Comment
        fields = ['id', 'user', 'content', 'created_at', 'updated_at']

class PostSerializer(serializers.ModelSerializer):
    user = CommunityUserSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    images = PostImageSerializer(many=True, read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()
    
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(), write_only=True, required=False
    )

    class Meta:
        model = Post
        fields = [
            'id', 'user', 'content', 'visibility', 'tags', 'department', 'batch', 'college',
            'created_at', 'updated_at', 'images', 'comments', 'likes_count',
            'comments_count', 'is_liked', 'is_saved', 'tag_ids', 'uploaded_images'
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
        validated_data.pop('uploaded_images', None)
        validated_data.pop('tag_ids', None)

        images_data = self.context['request'].FILES.getlist('uploaded_images')
        tags_data = self.context['request'].data.getlist('tags')
        
        post = Post.objects.create(**validated_data)
        
        if tags_data:
            tag_objs = []
            for tag_name in tags_data:
                tag, _ = Tag.objects.get_or_create(name=tag_name)
                tag_objs.append(tag)
            post.tags.set(tag_objs)

        for image_data in images_data:
            PostImage.objects.create(post=post, image=image_data)
        return post

    def update(self, instance, validated_data):
        tags_data = self.context['request'].data.getlist('tags')
        
        instance.content = validated_data.get('content', instance.content)
        instance.visibility = validated_data.get('visibility', instance.visibility)
        instance.save()

        if tags_data:
            tag_objs = []
            for tag_name in tags_data:
                tag, _ = Tag.objects.get_or_create(name=tag_name)
                tag_objs.append(tag)
            instance.tags.set(tag_objs)
            
        return instance
