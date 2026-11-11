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


class UsernameAvailabilityTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user = User.objects.create_user(
            username="existinguser",
            email="existing@example.com",
            password="testpassword123",
        )

    def test_available_username(self):
        from authentication.views import check_username_view
        request = self.factory.get("/api/auth/check-username/", {"username": "brandnewuser"})
        response = check_username_view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"available": True, "message": "Username is available"})

    def test_already_registered_username(self):
        from authentication.views import check_username_view
        request = self.factory.get("/api/auth/check-username/", {"username": "existinguser"})
        response = check_username_view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"available": False, "message": "Username is already taken"})

    def test_case_insensitive_registered_username(self):
        from authentication.views import check_username_view
        request = self.factory.get("/api/auth/check-username/", {"username": "EXISTINGUSER"})
        response = check_username_view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"available": False, "message": "Username is already taken"})

    def test_empty_username(self):
        from authentication.views import check_username_view
        request = self.factory.get("/api/auth/check-username/", {"username": ""})
        response = check_username_view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"available": False, "message": "Invalid username"})

    def test_invalid_username_short(self):
        from authentication.views import check_username_view
        request = self.factory.get("/api/auth/check-username/", {"username": "ab"})
        response = check_username_view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"available": False, "message": "Invalid username"})

    def test_invalid_username_symbols(self):
        from authentication.views import check_username_view
        for invalid_un in ["-leadingsymbol", "trailingsymbol-", "double--hyphen", "bad space", "bad@char"]:
            request = self.factory.get("/api/auth/check-username/", {"username": invalid_un})
            response = check_username_view(request)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data, {"available": False, "message": "Invalid username"}, f"Failed for {invalid_un}")

    def test_authenticated_user_own_username_is_available(self):
        from rest_framework.test import APIRequestFactory, force_authenticate
        from authentication.views import check_username_view
        api_factory = APIRequestFactory()
        request = api_factory.get("/api/auth/check-username/", {"username": "existinguser"})
        force_authenticate(request, user=self.user)
        response = check_username_view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"available": True, "message": "Username is available"})

    def test_database_constraint_case_insensitive_unique(self):
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            User.objects.create_user(
                username="EXISTINGUSER",
                email="another@example.com",
                password="password123",
            )

    def test_registration_serializer_case_insensitive_duplicate(self):
        from authentication.serializers import UserRegistrationSerializer
        data = {
            "username": "EXISTINGUSER",
            "email": "fresh@example.com",
            "password": "ValidPassword123",
            "password_confirm": "ValidPassword123",
        }
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("username", serializer.errors)


class EmailAvailabilityTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="existinguser",
            email="existing@example.com",
            password="testpassword123",
        )

    def test_available_email(self):
        from rest_framework.test import APIRequestFactory
        from authentication.views import check_email_view
        factory = APIRequestFactory()
        request = factory.get("/api/auth/check-email/", {"email": "brandnew@example.com"})
        response = check_email_view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"available": True, "message": "Email is available"})

    def test_already_registered_email(self):
        from rest_framework.test import APIRequestFactory
        from authentication.views import check_email_view
        factory = APIRequestFactory()
        request = factory.get("/api/auth/check-email/", {"email": "existing@example.com"})
        response = check_email_view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["available"], False)
        self.assertIn("already associated with an account", response.data["message"])

    def test_case_insensitive_registered_email(self):
        from rest_framework.test import APIRequestFactory
        from authentication.views import check_email_view
        factory = APIRequestFactory()
        request = factory.get("/api/auth/check-email/", {"email": "EXISTING@EXAMPLE.COM"})
        response = check_email_view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["available"], False)
        self.assertIn("already associated with an account", response.data["message"])

    def test_empty_email(self):
        from rest_framework.test import APIRequestFactory
        from authentication.views import check_email_view
        factory = APIRequestFactory()
        request = factory.get("/api/auth/check-email/", {"email": ""})
        response = check_email_view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"available": False, "message": "Please enter a valid email address."})

    def test_invalid_email_format(self):
        from rest_framework.test import APIRequestFactory
        from authentication.views import check_email_view
        factory = APIRequestFactory()
        for invalid_email in ["notanemail", "user@", "@domain.com", "user@domain"]:
            request = factory.get("/api/auth/check-email/", {"email": invalid_email})
            response = check_email_view(request)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data, {"available": False, "message": "Please enter a valid email address."})

    def test_authenticated_user_own_email_is_available(self):
        from rest_framework.test import APIRequestFactory, force_authenticate
        from authentication.views import check_email_view
        factory = APIRequestFactory()
        request = factory.get("/api/auth/check-email/", {"email": "existing@example.com"})
        force_authenticate(request, user=self.user)
        response = check_email_view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"available": True, "message": "Email is available"})

    def test_database_constraint_case_insensitive_unique_email(self):
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            User.objects.create_user(
                username="anotheruser",
                email="EXISTING@EXAMPLE.COM",
                password="password123",
            )

    def test_registration_serializer_case_insensitive_duplicate_email(self):
        from authentication.serializers import UserRegistrationSerializer
        data = {
            "username": "freshuser",
            "email": "EXISTING@EXAMPLE.COM",
            "password": "ValidPassword123",
            "password_confirm": "ValidPassword123",
        }
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("email", serializer.errors)


class ForgotPasswordOtpTests(TestCase):
    def setUp(self):
        from rest_framework.test import APIRequestFactory
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(
            username="resetuser",
            email="resetuser@example.com",
            password="OldPassword123!",
        )

    def test_send_code_existing_user(self):
        from authentication.views import send_forgot_password_code_view
        from authentication.models import RegistrationOTP
        request = self.factory.post(
            "/api/auth/forgot-password/send-code/",
            {"email": "resetuser@example.com"},
            format="json",
        )
        response = send_forgot_password_code_view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "success")

        otp_rec = RegistrationOTP.objects.filter(
            email="resetuser@example.com",
            resource_id="forgot_password",
            resource_type="password_reset",
        ).first()
        self.assertIsNotNone(otp_rec)
        self.assertEqual(len(otp_rec.otp), 6)
        self.assertTrue(otp_rec.otp.isdigit())

    def test_send_code_case_insensitive_email(self):
        from authentication.views import send_forgot_password_code_view
        from authentication.models import RegistrationOTP
        request = self.factory.post(
            "/api/auth/forgot-password/send-code/",
            {"email": "RESETUSER@EXAMPLE.COM"},
            format="json",
        )
        response = send_forgot_password_code_view(request)
        self.assertEqual(response.status_code, 200)

        otp_rec = RegistrationOTP.objects.filter(
            email="resetuser@example.com",
            resource_id="forgot_password",
        ).first()
        self.assertIsNotNone(otp_rec)

    def test_send_code_non_existent_email_is_enumeration_safe(self):
        from authentication.views import send_forgot_password_code_view
        from authentication.models import RegistrationOTP
        request = self.factory.post(
            "/api/auth/forgot-password/send-code/",
            {"email": "nobody@example.com"},
            format="json",
        )
        response = send_forgot_password_code_view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "success")
        self.assertFalse(
            RegistrationOTP.objects.filter(email="nobody@example.com").exists()
        )

    def test_send_code_invalid_email_format(self):
        from authentication.views import send_forgot_password_code_view
        request = self.factory.post(
            "/api/auth/forgot-password/send-code/",
            {"email": "invalid-email"},
            format="json",
        )
        response = send_forgot_password_code_view(request)
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)

    def test_verify_code_success(self):
        from datetime import timedelta
        from django.utils import timezone
        from authentication.views import verify_forgot_password_code_view
        from authentication.models import RegistrationOTP

        RegistrationOTP.objects.create(
            email=self.user.email,
            resource_id="forgot_password",
            resource_type="password_reset",
            otp="654321",
            expires_at=timezone.now() + timedelta(minutes=5),
        )

        request = self.factory.post(
            "/api/auth/forgot-password/verify-code/",
            {"email": self.user.email, "code": "654321"},
            format="json",
        )
        response = verify_forgot_password_code_view(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "success")
        self.assertIn("token", response.data)
        self.assertIn("uidb64", response.data)

    def test_verify_code_incorrect(self):
        from datetime import timedelta
        from django.utils import timezone
        from authentication.views import verify_forgot_password_code_view
        from authentication.models import RegistrationOTP

        RegistrationOTP.objects.create(
            email=self.user.email,
            resource_id="forgot_password",
            resource_type="password_reset",
            otp="654321",
            expires_at=timezone.now() + timedelta(minutes=5),
        )

        request = self.factory.post(
            "/api/auth/forgot-password/verify-code/",
            {"email": self.user.email, "code": "000000"},
            format="json",
        )
        response = verify_forgot_password_code_view(request)
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)

    def test_verify_code_expired(self):
        from datetime import timedelta
        from django.utils import timezone
        from authentication.views import verify_forgot_password_code_view
        from authentication.models import RegistrationOTP

        RegistrationOTP.objects.create(
            email=self.user.email,
            resource_id="forgot_password",
            resource_type="password_reset",
            otp="654321",
            expires_at=timezone.now() - timedelta(minutes=1),
        )

        request = self.factory.post(
            "/api/auth/forgot-password/verify-code/",
            {"email": self.user.email, "code": "654321"},
            format="json",
        )
        response = verify_forgot_password_code_view(request)
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)

    def test_reset_password_with_token(self):
        from datetime import timedelta
        from django.utils import timezone
        from django.contrib.auth import authenticate
        from authentication.views import verify_forgot_password_code_view, reset_password_with_code_view
        from authentication.models import RegistrationOTP

        RegistrationOTP.objects.create(
            email=self.user.email,
            resource_id="forgot_password",
            resource_type="password_reset",
            otp="112233",
            expires_at=timezone.now() + timedelta(minutes=5),
        )

        # 1. Verify code
        verify_req = self.factory.post(
            "/api/auth/forgot-password/verify-code/",
            {"email": self.user.email, "code": "112233"},
            format="json",
        )
        verify_res = verify_forgot_password_code_view(verify_req)
        token = verify_res.data["token"]
        uidb64 = verify_res.data["uidb64"]

        # 2. Reset password
        new_pw = "BrandNewPassword123!"
        reset_req = self.factory.post(
            "/api/auth/forgot-password/reset-with-code/",
            {
                "email": self.user.email,
                "code": "112233",
                "token": token,
                "uidb64": uidb64,
                "password": new_pw,
            },
            format="json",
        )
        reset_res = reset_password_with_code_view(reset_req)
        self.assertEqual(reset_res.status_code, 200)
        self.assertEqual(reset_res.data["status"], "success")
        self.assertIn("access", reset_res.data)
        self.assertIn("refresh", reset_res.data)
        self.assertIn("user", reset_res.data)
        self.assertEqual(reset_res.data["user"]["email"], self.user.email)

        # 3. Check authentication with new password
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(new_pw))
        authed = authenticate(username=self.user.email, password=new_pw)
        self.assertIsNotNone(authed)

        # 4. Check OTP record deleted
        self.assertFalse(
            RegistrationOTP.objects.filter(
                email=self.user.email,
                resource_id="forgot_password",
            ).exists()
        )

        # 5. Token cannot be reused
        reuse_req = self.factory.post(
            "/api/auth/forgot-password/reset-with-code/",
            {
                "email": self.user.email,
                "token": token,
                "password": "AnotherPassword123!",
            },
            format="json",
        )
        reuse_res = reset_password_with_code_view(reuse_req)
        self.assertEqual(reuse_res.status_code, 400)




