import uuid
import logging
from django.db import transaction
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.settings import api_settings
from authentication.models import Profile

logger = logging.getLogger(__name__)
User = get_user_model()


def reconcile_user_id_orm(existing_user, new_user_id, validated_token):
    """
    Migrates an existing user record and all related models to a new user_id
    purely through Django ORM without raw SQL.
    """
    old_id = str(existing_user.id)
    new_id = str(new_user_id)
    orig_email = existing_user.email
    orig_username = existing_user.username
    temp_suffix = uuid.uuid4().hex[:8]

    with transaction.atomic():
        # 1. Temporarily release unique constraints on email and username
        existing_user.email = f"tmp_{temp_suffix}_{orig_email}"
        existing_user.username = f"tmp_{temp_suffix}_{orig_username}"
        existing_user.save(update_fields=["email", "username"])

        # 2. Create the new user with the target ID
        new_username = validated_token.get("username", orig_username)
        if User.objects.filter(username=new_username).exists():
            new_username = str(new_id)

        roles = validated_token.get("roles", {})
        local_role = roles.get("ycode", existing_user.role)

        new_user = User.objects.create(
            id=new_user_id,
            email=orig_email,
            username=new_username,
            first_name=validated_token.get("first_name", existing_user.first_name),
            last_name=validated_token.get("last_name", existing_user.last_name),
            role=local_role,
            is_active=existing_user.is_active,
            is_staff=existing_user.is_staff,
            is_superuser=existing_user.is_superuser,
            password=existing_user.password,
        )

        # 3. Migrate all referencing models via Django ORM
        for rel in User._meta.related_objects:
            rel_model = rel.related_model
            fk_field = rel.field.name
            try:
                if rel.many_to_many:
                    through = rel.through
                    for f in through._meta.fields:
                        if f.is_relation and f.related_model == User:
                            through.objects.filter(**{f.name: existing_user}).update(**{f.name: new_user})
                elif rel.one_to_one:
                    old_inst = rel_model.objects.filter(**{fk_field: existing_user}).first()
                    new_inst = rel_model.objects.filter(**{fk_field: new_user}).first()
                    if old_inst:
                        if new_inst:
                            for f in rel_model._meta.fields:
                                if f.name not in (rel_model._meta.pk.name, fk_field):
                                    val = getattr(old_inst, f.name)
                                    if val is not None:
                                        setattr(new_inst, f.name, val)
                            new_inst.save()
                            old_inst.delete()
                        else:
                            rel_model.objects.filter(pk=old_inst.pk).update(**{fk_field: new_user})
                else:
                    rel_model.objects.filter(**{fk_field: existing_user}).update(**{fk_field: new_user})
            except Exception as ex:
                logger.warning(f"Could not migrate relation {rel_model.__name__}.{fk_field}: {ex}")

        # 4. Migrate User M2M fields (groups, permissions)
        for m2m_field in User._meta.many_to_many:
            try:
                old_m2m = getattr(existing_user, m2m_field.name).all()
                if old_m2m.exists():
                    getattr(new_user, m2m_field.name).set(old_m2m)
            except Exception as ex:
                logger.warning(f"Could not migrate m2m {m2m_field.name}: {e}")

        # 5. Delete the temporary old user record cleanly
        existing_user.delete()

    return new_user


class ProductJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)

        products = validated_token.get("products", [])
        if "ycode" not in products and "ylabs" not in products:
            raise AuthenticationFailed("Token is not valid for this product.")

        user = self.get_user(validated_token)
        return user, validated_token

    def get_user(self, validated_token):
        """
        Attempts to find and return a user using the given validated token.
        If the user does not exist, it creates a shadow user.
        """
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            raise InvalidToken("Token contained no recognizable user identification")

        email = validated_token.get("email", "")
        user = None
        
        if email:
            existing_user = User.objects.filter(email=email).first()
            if existing_user:
                if str(existing_user.id) != str(user_id):
                    try:
                        user = reconcile_user_id_orm(existing_user, user_id, validated_token)
                    except Exception as e:
                        logger.error(f"Failed to reconcile ycode user ID to {user_id}: {e}", exc_info=True)
                        user = existing_user
                else:
                    user = existing_user

        if not user:
            try:
                user = User.objects.get(**{api_settings.USER_ID_FIELD: user_id})
            except User.DoesNotExist:
                pass

        if not user:
            username = validated_token.get("username", str(user_id))
            
            roles = validated_token.get("roles", {})
            local_role = roles.get("ycode", "student")

            user = User(
                **{api_settings.USER_ID_FIELD: user_id},
                username=username,
                email=email,
                first_name=validated_token.get("first_name", ""),
                last_name=validated_token.get("last_name", ""),
                role=local_role,
                is_active=True,
                is_staff=(local_role == "admin"),
                is_superuser=(local_role == "admin"),
            )
            user.set_unusable_password()
            
            # Do not persist the internal sync user to the database
            if email != "admin_sync@yhub.internal":
                user.save()
                Profile.objects.get_or_create(user=user)

        if not user.is_active:
            raise AuthenticationFailed("User is inactive", code="user_inactive")

        return user
