from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, GithubConnection


@admin.register(GithubConnection)
class GithubConnectionAdmin(admin.ModelAdmin):
    list_display = ('user', 'github_username', 'github_user_id', 'scopes', 'connected_at', 'updated_at')
    search_fields = ('user__email', 'user__username', 'github_username', 'github_user_id')
    list_filter = ('connected_at', 'updated_at')
    readonly_fields = ('id', 'access_token', 'connected_at', 'updated_at')
    
    fieldsets = (
        (None, {
            'fields': ('id', 'user')
        }),
        ('GitHub Details', {
            'fields': ('github_username', 'github_user_id', 'scopes')
        }),
        ('Security & Tokens', {
            'fields': ('access_token',)
        }),
        ('Timestamps', {
            'fields': ('connected_at', 'updated_at')
        }),
    )
@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        "email",
        "username",
        "first_name",
        "last_name",
        "is_guest_user",
        "is_staff",
        "is_active",
        "date_joined",
    )
    list_filter = ("is_guest_user", "is_staff", "is_active", "date_joined")
    search_fields = ("email", "username", "first_name", "last_name")
    ordering = ("-date_joined",)

    fieldsets = (
        (None, {"fields": ("email", "username", "password")}),
        ("Personal Info", {"fields": ("first_name", "last_name")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_guest_user",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important Dates", {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "username", "password1", "password2"),
            },
        ),
    )
