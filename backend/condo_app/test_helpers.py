from django.contrib.auth import get_user_model

from .models import ConciergeProfile, ResidentProfile, StaffProfile

User = get_user_model()


def make_user(username, email=None, password="pass1234!", is_staff=False, is_superuser=False):
    email = email or f"{username}@example.com"
    user = User.objects.create(
        username=username, email=email, is_staff=is_staff, is_superuser=is_superuser
    )
    user.set_password(password)
    user.save(update_fields=["password"])
    return user


def make_manager(username="manager"):
    return make_user(username, is_staff=True)


def make_staff(username="staff"):
    user = make_user(username)
    StaffProfile.objects.create(user=user)
    return user


def make_concierge(username="concierge", active=True):
    user = make_user(username)
    ConciergeProfile.objects.create(user=user, is_active_concierge=active)
    return user


def make_resident(username="resident", unit="101", approved=False):
    user = make_user(username)
    ResidentProfile.objects.create(user=user, unit=unit, is_approved=approved)
    return user
