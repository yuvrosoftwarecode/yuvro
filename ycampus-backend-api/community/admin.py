from django.contrib import admin
from .models import Post, Tag, PostImage, Like, Comment, SavedPost

@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('name',)

class PostImageInline(admin.TabularInline):
    model = PostImage
    extra = 1

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'visibility', 'created_at')
    list_filter = ('visibility', 'tags')
    search_fields = ('content', 'user__email')
    inlines = [PostImageInline]

admin.site.register(Like)
admin.site.register(Comment)
admin.site.register(SavedPost)
