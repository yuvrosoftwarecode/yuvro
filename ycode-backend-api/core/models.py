import uuid
from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models

class StatelessUserManager(UserManager):
    def get(self, *args, **kwargs):
        pk = kwargs.get('pk') or kwargs.get('id') or kwargs.get('email')
        fallback_id = '00000000-0000-0000-0000-000000000000'
        if pk:
            try:
                fallback_id = uuid.UUID(str(pk))
            except ValueError:
                fallback_id = uuid.uuid5(uuid.NAMESPACE_DNS, str(pk))
            
            from core.user_resolver import resolve_user
            user_data = resolve_user(pk)
            if user_data:
                return self.model(
                    id=user_data.id,
                    email=user_data.email,
                    username=user_data.username,
                    role=user_data.role,
                    is_active=user_data.is_active,
                )
        email = kwargs.get('email') or 'user@yuvro.com'
        return self.model(
            id=fallback_id,
            email=email,
            username=kwargs.get('username') or email.split('@')[0],
            role=kwargs.get('role') or 'student'
        )

    def get_queryset(self):
        return super().get_queryset().none()

    def create(self, **kwargs):
        return self.model(**kwargs)

    def get_or_create(self, defaults=None, **kwargs):
        try:
            return self.get(**kwargs), False
        except Exception:
            inst = self.model(**kwargs)
            return inst, True


class StatelessModelManager(models.Manager):
    def get(self, *args, **kwargs):
        if self.model.__name__ == 'Profile':
            user = kwargs.get('user')
            user_id = user.id if hasattr(user, 'id') else kwargs.get('user_id') or kwargs.get('pk') or kwargs.get('id')
            fallback_user_id = '00000000-0000-0000-0000-000000000000'
            if user_id:
                try:
                    fallback_user_id = uuid.UUID(str(user_id))
                except ValueError:
                    fallback_user_id = uuid.uuid5(uuid.NAMESPACE_DNS, str(user_id))
                
                from core.user_resolver import resolve_user
                user_data = resolve_user(user_id)
                if user_data:
                    user_inst = User(id=user_data.id, email=user_data.email, username=user_data.username, role=user_data.role)
                    college_inst = College(id=user_data.college_id, name=user_data.college_name) if user_data.college_id else None
                    department_inst = Department(id=user_data.department_id, name=user_data.department_name) if user_data.department_id else None
                    return self.model(
                        id=user_data.id,
                        user=user_inst,
                        full_name=user_data.full_name,
                        college=college_inst,
                        department=department_inst,
                        profile_image=user_data.profile_image,
                    )
            user_inst = User(id=fallback_user_id, email='user@yuvro.com', username='user', role='student')
            return self.model(id=fallback_user_id, user=user_inst)
        else:
            pk = kwargs.get('pk') or kwargs.get('id') or kwargs.get('name')
            fallback_id = None
            if pk:
                try:
                    fallback_id = uuid.UUID(str(pk))
                except ValueError:
                    fallback_id = uuid.uuid5(uuid.NAMESPACE_DNS, str(pk))
            return self.model(id=fallback_id or uuid.uuid4(), name=kwargs.get('name') or str(pk))

    def create(self, **kwargs):
        return self.model(**kwargs)

    def get_or_create(self, defaults=None, **kwargs):
        try:
            return self.get(**kwargs), False
        except Exception:
            inst = self.model(**kwargs)
            return inst, True

    def get_queryset(self):
        return super().get_queryset().none()


class User(AbstractUser):
    ROLE_CHOICES = [
        ("student", "Student"),
        ("instructor", "Instructor"),
        ("recruiter", "Recruiter"),
        ("admin", "Administrator"),
        ("guest", "Guest"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="student")

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    objects = StatelessUserManager()

    class Meta:
        managed = False
        db_table = "authentication_user"

    def save(self, *args, **kwargs):
        pass

    @classmethod
    def from_dict(cls, data):
        user_id = data.get("user_id") or data.get("id")
        import uuid
        try:
            uuid.UUID(str(user_id))
        except (ValueError, TypeError):
            user_id = uuid.uuid5(uuid.NAMESPACE_DNS, str(user_id))
            
        email = data.get("email") or "student@yuvro.com"
        
        user = cls(
            id=user_id,
            email=email,
            username=data.get("username") or email.split("@")[0],
            first_name=data.get("first_name", ""),
            last_name=data.get("last_name", ""),
            role=data.get("role", "student"),
            is_active=data.get("is_active", True),
        )
        
        # Profile details
        profile = data.get("profile") or {}
        user._college_id = profile.get("college_id")
        user._college_name = profile.get("college_name")
        user._department_id = profile.get("department_id")
        user._department_name = profile.get("department_name")
        user._full_name = profile.get("full_name") or f"{user.first_name} {user.last_name}".strip() or user.username
        user._profile_image = profile.get("profile_image")
        
        return user

    @property
    def college_id(self):
        return getattr(self, "_college_id", None)

    @property
    def college_name(self):
        return getattr(self, "_college_name", None)

    @property
    def department_id(self):
        return getattr(self, "_department_id", None)

    @property
    def department_name(self):
        return getattr(self, "_department_name", None)

    @property
    def full_name(self):
        return getattr(self, "_full_name", f"{self.first_name} {self.last_name}".strip() or self.username)

    @property
    def profile_image(self):
        return getattr(self, "_profile_image", None)

    def is_admin(self):
        return self.role == "admin"

    def is_instructor(self):
        return self.role == "instructor"

    def is_recruiter(self):
        return self.role == "recruiter"

    def is_student(self):
        return self.role == "student"

    def is_guest(self):
        return self.role == "guest"

    def can_manage_content(self):
        return self.role in ["admin", "instructor"]

    def can_manage_users(self):
        return self.role == "admin"


class College(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    verification_status = models.CharField(
        max_length=20,
        choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")],
        default="pending"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = StatelessModelManager()

    class Meta:
        managed = False
        db_table = "authentication_college"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        pass


class Department(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    verification_status = models.CharField(
        max_length=20,
        choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")],
        default="approved"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = StatelessModelManager()

    class Meta:
        managed = False
        db_table = "authentication_department"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        pass


class Profile(models.Model):
    GENDER_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
        ("prefer_not_to_say", "Prefer not to say"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile", db_constraint=False)

    profile_image = models.URLField(blank=True, null=True)
    cover_image = models.URLField(blank=True, null=True)

    full_name = models.CharField(max_length=200, blank=True, null=True)
    title = models.CharField(max_length=200, blank=True, null=True)
    location = models.CharField(max_length=200, blank=True, null=True)

    college = models.ForeignKey(College, on_delete=models.SET_NULL, null=True, blank=True, related_name="students", db_constraint=False)
    college_other = models.CharField(max_length=255, blank=True, null=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name="students", db_constraint=False)
    department_other = models.CharField(max_length=255, blank=True, null=True)
    student_id = models.CharField(max_length=100, blank=True, null=True)
    id_card_image = models.URLField(blank=True, null=True)

    google_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    about = models.TextField(blank=True, null=True)
    gender = models.CharField(
        max_length=20, choices=GENDER_CHOICES, blank=True, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    resume_config = models.JSONField(
        default=dict,
        blank=True,
        null=True
    )

    objects = StatelessModelManager()

    class Meta:
        managed = False
        db_table = "authentication_profile"

    def __str__(self):
        return f"{self.user.email}'s Profile"

    def save(self, *args, **kwargs):
        pass


class BaseModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="created_%(class)s_set",
        help_text="User who created this record",
        db_constraint=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class BaseTimestampedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class Transaction(BaseTimestampedModel):
    STATUS_PENDING = "pending"
    STATUS_COMPLETED = "completed"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_FAILED, "Failed"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="transactions")
    contest = models.ForeignKey("assessment.Contest", on_delete=models.SET_NULL, null=True, blank=True, related_name="transactions")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    transaction_id = models.CharField(max_length=100, unique=True, blank=True, null=True)

    def __str__(self):
        return f"{self.user.email} - {self.amount} - {self.status}"
