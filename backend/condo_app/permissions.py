from rest_framework.permissions import BasePermission


def is_manager(user) -> bool:
    return bool(user and user.is_authenticated and (user.is_staff or user.is_superuser))


def is_staff_user(user) -> bool:
    return bool(user and user.is_authenticated and hasattr(user, "staff_profile"))


def is_concierge_user(user) -> bool:
    if not (user and user.is_authenticated):
        return False
    profile = getattr(user, "concierge_profile", None)
    return bool(profile and profile.is_active_concierge)


def is_approved_resident(user) -> bool:
    if not (user and user.is_authenticated):
        return False
    profile = getattr(user, "resident_profile", None)
    return bool(profile and profile.is_approved)


class IsManager(BasePermission):
    def has_permission(self, request, view):
        return is_manager(request.user)


class IsStaff(BasePermission):
    def has_permission(self, request, view):
        return is_staff_user(request.user)


class IsConcierge(BasePermission):
    def has_permission(self, request, view):
        return is_concierge_user(request.user)


class IsApprovedResident(BasePermission):
    def has_permission(self, request, view):
        return is_approved_resident(request.user)
