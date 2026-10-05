from django.test import TestCase, RequestFactory
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from authentication.models import MARKETPLACE_ROLE_CHOICES
from authentication.permissions import (
    IsRecruiterAccountManagerUser,
    IsRecruiterFreelancerUser,
    IsRecruiterCompanyUser,
    IsRecruiterCompanyEmployeeUser,
    IsRecruiterCompanyManagerUser,
    IsMarketplaceUser,
    IsRecruiterUser,
)
from authentication.serializers import CustomTokenObtainPairSerializer

User = get_user_model()


class MarketplaceRoleModelTests(TestCase):
    def test_marketplace_role_choices_defined(self):
        valid_keys = [choice[0] for choice in MARKETPLACE_ROLE_CHOICES]
        self.assertIn("recruiter_account_manager", valid_keys)
        self.assertIn("recruiter_freelancer", valid_keys)
        self.assertIn("recruiter_company", valid_keys)
        self.assertIn("recruiter_company_employee", valid_keys)
        self.assertIn("recruiter_company_manager", valid_keys)

    def test_valid_marketplace_roles_save_successfully(self):
        user1 = User.objects.create_user(
            username="manager_test",
            email="manager@test.com",
            password="securepassword123",
            roles={"marketplace": "recruiter_account_manager"},
        )
        self.assertTrue(user1.is_recruiter_account_manager())
        self.assertFalse(user1.is_recruiter_freelancer())
        self.assertFalse(user1.is_recruiter_company())
        self.assertTrue(user1.is_recruiter())

        user2 = User.objects.create_user(
            username="freelancer_test",
            email="freelancer@test.com",
            password="securepassword123",
            roles={"marketplace": "recruiter_freelancer"},
        )
        self.assertFalse(user2.is_recruiter_account_manager())
        self.assertTrue(user2.is_recruiter_freelancer())
        self.assertFalse(user2.is_recruiter_company())
        self.assertTrue(user2.is_recruiter())

        user3 = User.objects.create_user(
            username="company_test",
            email="company@test.com",
            password="securepassword123",
            roles={"marketplace": "recruiter_company"},
        )
        self.assertFalse(user3.is_recruiter_account_manager())
        self.assertFalse(user3.is_recruiter_freelancer())
        self.assertTrue(user3.is_recruiter_company())
        self.assertTrue(user3.is_recruiter())

        user4 = User.objects.create_user(
            username="employee_test",
            email="employee@test.com",
            password="securepassword123",
            roles={"marketplace": "recruiter_company_employee"},
        )
        self.assertTrue(user4.is_recruiter_company_employee())
        self.assertFalse(user4.is_recruiter_company_manager())
        self.assertTrue(user4.is_recruiter())

        user5 = User.objects.create_user(
            username="cmp_mgr_test",
            email="cmp_mgr@test.com",
            password="securepassword123",
            roles={"marketplace": "recruiter_company_manager"},
        )
        self.assertFalse(user5.is_recruiter_company_employee())
        self.assertTrue(user5.is_recruiter_company_manager())
        self.assertTrue(user5.is_recruiter())

    def test_invalid_marketplace_role_raises_validation_error(self):
        user = User(
            username="invalid_role_test",
            email="invalid@test.com",
            roles={"marketplace": "invalid_recruiter"},
        )
        with self.assertRaises(ValidationError) as ctx:
            user.clean()
        self.assertIn("roles", ctx.exception.message_dict)
        self.assertIn("Invalid marketplace role", ctx.exception.message_dict["roles"][0])


class MarketplacePermissionsTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.manager_user = User.objects.create_user(
            username="mgr_user",
            email="mgr@test.com",
            password="password123",
            roles={"marketplace": "recruiter_account_manager"},
        )
        self.freelancer_user = User.objects.create_user(
            username="fl_user",
            email="fl@test.com",
            password="password123",
            roles={"marketplace": "recruiter_freelancer"},
        )
        self.company_user = User.objects.create_user(
            username="cmp_user",
            email="cmp@test.com",
            password="password123",
            roles={"marketplace": "recruiter_company"},
        )
        self.employee_user = User.objects.create_user(
            username="emp_user",
            email="emp@test.com",
            password="password123",
            roles={"marketplace": "recruiter_company_employee"},
        )
        self.company_mgr_user = User.objects.create_user(
            username="cmp_mgr_user",
            email="cmp_mgr@test.com",
            password="password123",
            roles={"marketplace": "recruiter_company_manager"},
        )
        self.student_user = User.objects.create_user(
            username="student_user",
            email="student@test.com",
            password="password123",
            roles={"ycode": "student"},
        )

    def test_account_manager_permission(self):
        permission = IsRecruiterAccountManagerUser()
        request = self.factory.get("/")
        
        request.user = self.manager_user
        self.assertTrue(permission.has_permission(request, None))

        request.user = self.freelancer_user
        self.assertFalse(permission.has_permission(request, None))

        request.user = self.company_user
        self.assertFalse(permission.has_permission(request, None))

        request.user = self.student_user
        self.assertFalse(permission.has_permission(request, None))

    def test_freelancer_permission(self):
        permission = IsRecruiterFreelancerUser()
        request = self.factory.get("/")

        request.user = self.freelancer_user
        self.assertTrue(permission.has_permission(request, None))

        request.user = self.manager_user
        self.assertFalse(permission.has_permission(request, None))

        request.user = self.company_user
        self.assertFalse(permission.has_permission(request, None))

        request.user = self.student_user
        self.assertFalse(permission.has_permission(request, None))

    def test_company_permission(self):
        permission = IsRecruiterCompanyUser()
        request = self.factory.get("/")

        request.user = self.company_user
        self.assertTrue(permission.has_permission(request, None))

        request.user = self.manager_user
        self.assertFalse(permission.has_permission(request, None))

        request.user = self.freelancer_user
        self.assertFalse(permission.has_permission(request, None))

        request.user = self.student_user
        self.assertFalse(permission.has_permission(request, None))

    def test_company_employee_permission(self):
        permission = IsRecruiterCompanyEmployeeUser()
        request = self.factory.get("/")

        request.user = self.employee_user
        self.assertTrue(permission.has_permission(request, None))

        request.user = self.company_mgr_user
        self.assertFalse(permission.has_permission(request, None))

        request.user = self.student_user
        self.assertFalse(permission.has_permission(request, None))

    def test_company_manager_permission(self):
        permission = IsRecruiterCompanyManagerUser()
        request = self.factory.get("/")

        request.user = self.company_mgr_user
        self.assertTrue(permission.has_permission(request, None))

        request.user = self.employee_user
        self.assertFalse(permission.has_permission(request, None))

        request.user = self.student_user
        self.assertFalse(permission.has_permission(request, None))

    def test_marketplace_user_permission(self):
        permission = IsMarketplaceUser()
        request = self.factory.get("/")

        request.user = self.manager_user
        self.assertTrue(permission.has_permission(request, None))

        request.user = self.freelancer_user
        self.assertTrue(permission.has_permission(request, None))

        request.user = self.company_user
        self.assertTrue(permission.has_permission(request, None))

        request.user = self.employee_user
        self.assertTrue(permission.has_permission(request, None))

        request.user = self.company_mgr_user
        self.assertTrue(permission.has_permission(request, None))

        request.user = self.student_user
        self.assertFalse(permission.has_permission(request, None))

    def test_recruiter_user_permission(self):
        permission = IsRecruiterUser()
        request = self.factory.get("/")

        request.user = self.manager_user
        self.assertTrue(permission.has_permission(request, None))

        request.user = self.freelancer_user
        self.assertTrue(permission.has_permission(request, None))

        request.user = self.company_user
        self.assertTrue(permission.has_permission(request, None))

        request.user = self.employee_user
        self.assertTrue(permission.has_permission(request, None))

        request.user = self.company_mgr_user
        self.assertTrue(permission.has_permission(request, None))

        request.user = self.student_user
        self.assertFalse(permission.has_permission(request, None))


class UserAdminTests(TestCase):
    def setUp(self):
        from django.contrib.admin.sites import AdminSite
        from authentication.admin import UserAdmin, RoleFilter
        self.site = AdminSite()
        self.admin = UserAdmin(User, self.site)
        self.filter = RoleFilter

    def test_display_roles(self):
        user1 = User(roles={"ycode": "student", "ylabs": "admin"})
        self.assertEqual(self.admin.display_roles(user1), "ycode: student, ylabs: admin")

        user2 = User(roles={})
        self.assertEqual(self.admin.display_roles(user2), "-")

        user3 = User(roles=None)
        self.assertEqual(self.admin.display_roles(user3), "-")

    def test_roles_in_list_display_and_fieldsets(self):
        self.assertIn("display_roles", self.admin.list_display)
        
        # Check that 'roles' is present in fieldsets
        fieldset_fields = []
        for name, opts in self.admin.fieldsets:
            fieldset_fields.extend(opts.get("fields", ()))
        self.assertIn("roles", fieldset_fields)

    def test_role_filter_queryset(self):
        user_admin = User.objects.create_user(
            username="admin_user",
            email="admin_u@test.com",
            roles={"ycode": "admin"}
        )
        user_student = User.objects.create_user(
            username="student_u",
            email="student_u@test.com",
            roles={"ycode": "student"}
        )
        user_recruiter = User.objects.create_user(
            username="recruiter_u",
            email="recruiter_u@test.com",
            roles={"marketplace": "recruiter_company"}
        )

        from authentication.admin import RoleFilter
        from django.test import RequestFactory
        factory = RequestFactory()
        request = factory.get("/")

        # Test filter for admin
        rf_admin = RoleFilter(request, {"role": "admin"}, User, self.admin)
        admin_qs = rf_admin.queryset(request, User.objects.all())
        self.assertIn(user_admin, admin_qs)
        self.assertNotIn(user_student, admin_qs)

        # Test filter for student
        rf_student = RoleFilter(request, {"role": "student"}, User, self.admin)
        student_qs = rf_student.queryset(request, User.objects.all())
        self.assertIn(user_student, student_qs)
        self.assertNotIn(user_admin, student_qs)

        # Test filter for recruiter
        rf_recruiter = RoleFilter(request, {"role": "recruiter"}, User, self.admin)
        recruiter_qs = rf_recruiter.queryset(request, User.objects.all())
        self.assertIn(user_recruiter, recruiter_qs)
        self.assertNotIn(user_admin, recruiter_qs)

