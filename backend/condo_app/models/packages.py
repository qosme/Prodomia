import uuid

from django.conf import settings
from django.db import models


class Package(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendiente de retiro"
        DELIVERED = "DELIVERED", "Entregado"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resident = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="packages",
    )
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="received_packages",
    )
    description = models.CharField(max_length=255)
    carrier = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField(blank=True)
    received_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-received_at"]

    def __str__(self) -> str:
        return f"Package({self.id}, resident={self.resident_id}, status={self.status})"
