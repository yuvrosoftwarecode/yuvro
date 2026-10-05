import os
import glob
import shutil
import uuid
import logging
from django.db import transaction
from django.conf import settings
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
        local_role = roles.get("ylabs", existing_user.role)

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
            is_guest_user=validated_token.get("is_guest_user", getattr(existing_user, 'is_guest_user', False)),
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
                logger.warning(f"Could not migrate m2m {m2m_field.name}: {ex}")

        # 5. Delete the temporary old user record cleanly
        existing_user.delete()

    # 6. Migrate workspace files on disk
    try:
        workspaces_root = getattr(settings, 'WORKSPACES_ROOT', '/workspaces')
        for pattern in [
            os.path.join(workspaces_root, "evaluation", "*", "users", old_id),
            os.path.join(workspaces_root, "labs", "*", "users", old_id),
        ]:
            for old_path in glob.glob(pattern):
                new_path = os.path.join(os.path.dirname(old_path), new_id)
                if os.path.exists(old_path):
                    if not os.path.exists(new_path):
                        os.rename(old_path, new_path)
                    else:
                        for root, dirs, files in os.walk(old_path):
                            rel = os.path.relpath(root, old_path)
                            target_dir = os.path.join(new_path, rel)
                            os.makedirs(target_dir, exist_ok=True)
                            for f in files:
                                src_f = os.path.join(root, f)
                                dst_f = os.path.join(target_dir, f)
                                if not os.path.exists(dst_f):
                                    shutil.copy2(src_f, dst_f)
                        shutil.rmtree(old_path, ignore_errors=True)
    except Exception as ex:
        logger.error(f"Error migrating workspace directories for user {new_id}: {ex}")

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
        if "ylabs" not in products:
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

        try:
            user = User.objects.get(**{api_settings.USER_ID_FIELD: user_id})
            
            # Update existing user names from token if they changed
            token_first = validated_token.get("first_name", "")
            token_last = validated_token.get("last_name", "")
            needs_save = False
            
            if token_first and user.first_name != token_first:
                user.first_name = token_first
                needs_save = True
            if token_last and user.last_name != token_last:
                user.last_name = token_last
                needs_save = True
            
            token_guest = validated_token.get("is_guest_user")
            if token_guest is not None and getattr(user, 'is_guest_user', None) != token_guest:
                user.is_guest_user = token_guest
                needs_save = True
                
            if needs_save:
                user.save()
                
            token_resume = validated_token.get("resume_file")
            profile, created = Profile.objects.get_or_create(user=user)
            if token_resume and profile.resume_file != token_resume:
                profile.resume_file = token_resume
                profile.save()
                
        except User.DoesNotExist:
            username = validated_token.get("username", str(user_id))
            email = validated_token.get("email", "")
            
            if email:
                existing_user = User.objects.filter(email=email).first()
                if existing_user and str(existing_user.id) != str(user_id):
                    try:
                        return reconcile_user_id_orm(existing_user, user_id, validated_token)
                    except Exception as e:
                        logger.error(f"Failed to reconcile user ID to {user_id}: {e}", exc_info=True)
                        return existing_user
                elif existing_user:
                    return existing_user
            
            roles = validated_token.get("roles", {})
            local_role = roles.get("ylabs", "student")

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
                is_guest_user=validated_token.get("is_guest_user", False),
            )
            user.set_unusable_password()
            
            # Do not persist the internal sync user to the database
            if email != "admin_sync@yhub.internal":
                user.save()
                profile, _ = Profile.objects.get_or_create(user=user)
                token_resume = validated_token.get("resume_file")
                if token_resume:
                    profile.resume_file = token_resume
                    profile.save()

        if not user.is_active:
            raise AuthenticationFailed("User is inactive", code="user_inactive")

        return user
