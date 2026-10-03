from rest_framework import permissions
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminUser(BasePermission):
    """
    Permission class that allows access only to admin users.
    """

    def has_permission(self, request, view):
        return (
            request.user and request.user.is_authenticated and request.user.is_admin()
        )


class IsAuthenticatedUser(BasePermission):
    """
    Permission class that allows access only to authenticated users.
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated


class IsInstructorOrAdmin(BasePermission):
    """
    Permission class that allows access to instructors and admins.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and (request.user.is_instructor() or request.user.is_admin())
        )


class IsStudentUser(BasePermission):
    """
    Permission class that allows access only to student users.
    """

    def has_permission(self, request, view):
        return (
            request.user and request.user.is_authenticated and request.user.is_student()
        )


class IsRecruiterUser(BasePermission):
    """
    Permission class that allows access only to recruiter users.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_recruiter()
        )


class IsRecruiterAccountManagerUser(BasePermission):
    """
    Permission class that allows access only to recruiter account manager users.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_recruiter_account_manager()
        )


class IsRecruiterFreelancerUser(BasePermission):
    """
    Permission class that allows access only to recruiter freelancer users.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_recruiter_freelancer()
        )


class IsRecruiterCompanyUser(BasePermission):
    """
    Permission class that allows access only to recruiter company users.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_recruiter_company()
        )


class IsRecruiterCompanyEmployeeUser(BasePermission):
    """
    Permission class that allows access only to recruiter company employee users.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_recruiter_company_employee()
        )


class IsRecruiterCompanyManagerUser(BasePermission):
    """
    Permission class that allows access only to recruiter company manager users.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_recruiter_company_manager()
        )


class IsMarketplaceUser(BasePermission):
    """
    Permission class that allows access to any user with a marketplace role.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and bool(request.user.roles.get("marketplace"))
        )


class ReadOnlyPermission(BasePermission):
    """
    Permission class that allows only read operations.
    """

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS


class IsAuthenticatedOrReadOnly(BasePermission):
    """
    Permission class that allows read access to everyone,
    but write access only to authenticated users.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated


class IsOwnerOrAdmin(BasePermission):
    """
    Permission class that allows access to the owner of the object or admin users.
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Admin users have full access
        if request.user.is_admin():
            return True

        # Check if the object has a user field (for user-owned objects)
        if hasattr(obj, "user"):
            return obj.user == request.user

        # Check if the object has a created_by field
        if hasattr(obj, "created_by"):
            return obj.created_by == request.user

        # Check if the object is the user itself
        if hasattr(obj, "id") and hasattr(request.user, "id"):
            return obj.id == request.user.id

        return False


class IsOwnerOrReadOnly(BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    Read permissions are allowed to any request,
    so we'll always allow GET, HEAD or OPTIONS requests.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner of the object.
        return obj.user == request.user


class CanManageContent(BasePermission):
    """
    Permission class for content management operations.
    Allows content admins and admins to create/update/delete content.
    Students can only read.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Read permissions for all authenticated users
        if request.method in SAFE_METHODS:
            return True

        # Write permissions only for instructors and admins
        return request.user.can_manage_content()


class CanManageCourses(BasePermission):
    """
    Permission class for course management operations.
    Allows instructors and admins to manage courses.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Read permissions for all authenticated users
        if request.method in SAFE_METHODS:
            return True

        # Write permissions only for instructors and admins
        return (
            request.user.is_instructor()
            or request.user.is_admin()
            or request.user.can_manage_content()
        )


class CanManageUsers(BasePermission):
    """
    Permission class for user management operations.
    Only admins can manage users.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.can_manage_users()
        )


class IsHRorReadOnly(BasePermission):
    """
    Permission class for HR operations.
    Allows read access to everyone, write access only to HR staff.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class IsInstructorOrAdminOrReadOnly(BasePermission):
    """
    Permission class that allows read access to everyone,
    but write access only to instructors and admins.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True

        return (
            request.user
            and request.user.is_authenticated
            and (request.user.is_admin() or request.user.is_instructor())
        )


class IsOwnerOrInstructorOrAdmin(BasePermission):
    """
    Permission class that allows access to:
    - Object owners
    - Instructors (for content they can manage)
    - Admins (full access)
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Safe methods: GET, HEAD, OPTIONS
        if request.method in SAFE_METHODS:
            return True

        # Admin users, instructors, and recruiters have full access
        if (
            (hasattr(request.user, "is_admin") and request.user.is_admin())
            or (hasattr(request.user, "is_instructor") and request.user.is_instructor())
            or (hasattr(request.user, "is_recruiter") and request.user.is_recruiter())
            or request.user.is_staff
            or request.user.is_superuser
            or (hasattr(request.user, "role") and request.user.role in ["admin", "instructor", "recruiter"])
        ):
            return True

        # Check ownership
        if hasattr(obj, "created_by"):
            return obj.created_by == request.user

        if hasattr(obj, "user"):
            return obj.user == request.user

        return False
