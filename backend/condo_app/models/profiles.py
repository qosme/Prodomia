from django.conf import settings
from django.db import models


class ResidentProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="resident_profile",
    )
    unit = models.CharField(max_length=50, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    is_approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"ResidentProfile(user_id={self.user_id}, approved={self.is_approved})"


class StaffProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="staff_profile",
    )
    is_active_staff = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"StaffProfile(user_id={self.user_id}, active={self.is_active_staff})"
