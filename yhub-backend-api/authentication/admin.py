from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.db import models
from .models import User, GithubConnection


class RoleFilter(admin.SimpleListFilter):
    title = "Role"
    parameter_name = "role"

    def lookups(self, request, model_admin):
        return (
            ("admin", "Admin"),
            ("instructor", "Instructor"),
            ("recruiter", "Recruiter"),
            ("student", "Student"),
            ("guest", "Guest"),
        )

    def queryset(self, request, queryset):
        val = self.value()
        if not val:
            return queryset
        if val == "admin":
            return queryset.filter(
                models.Q(roles__ycode="admin") | models.Q(roles__ylabs="admin")
            )
        elif val == "instructor":
            return queryset.filter(roles__ycode="instructor")
        elif val == "recruiter":
            return queryset.filter(
                models.Q(roles__ycode="recruiter")
                | models.Q(roles__ylabs="recruiter")
                | models.Q(roles__marketplace__startswith="recruiter")
            )
        elif val == "student":
            return queryset.filter(
                models.Q(roles__ycode="student") | models.Q(roles__ylabs="student")
            )
        elif val == "guest":
            return queryset.filter(roles__ycode="guest")
        return queryset


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
        "display_roles",
        "is_guest_user",
        "is_staff",
        "is_active",
        "date_joined",
    )
    list_filter = (RoleFilter, "is_guest_user", "is_staff", "is_active", "date_joined")
    search_fields = ("email", "username", "first_name", "last_name")
    ordering = ("-date_joined",)

    fieldsets = (
        (None, {"fields": ("email", "username", "password")}),
        ("Personal Info", {"fields": ("first_name", "last_name")}),
        ("Roles", {"fields": ("roles",)}),
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

    @admin.display(description="Roles")
    def display_roles(self, obj):
        if not obj.roles:
            return "-"
        if isinstance(obj.roles, dict):
            return ", ".join(f"{k}: {v}" for k, v in obj.roles.items()) if obj.roles else "-"
        return str(obj.roles)

    get_roles = display_roles
