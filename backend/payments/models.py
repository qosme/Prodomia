import uuid

from django.conf import settings
from django.db import models


class MonthlyFee(models.Model):
    unit = models.CharField(max_length=50)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    period_year = models.PositiveIntegerField()
    period_month = models.PositiveIntegerField()
    due_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("unit", "period_year", "period_month")]

    def __str__(self):
        return f"MonthlyFee(unit={self.unit}, {self.period_year}-{self.period_month:02d}, ${self.amount})"


class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PAID = "PAID", "Paid"
        FAILED = "FAILED", "Failed"
        MANUAL = "MANUAL", "Manual"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resident = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="payments",
    )
    monthly_fee = models.ForeignKey(
        MonthlyFee,
        on_delete=models.PROTECT,
        related_name="payments",
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    # Transbank fields
    token = models.CharField(max_length=200, blank=True)
    buy_order = models.CharField(max_length=64, blank=True, null=True, unique=True)
    session_id = models.CharField(max_length=64, blank=True)
    transaction_date = models.DateTimeField(null=True, blank=True)
    authorization_code = models.CharField(max_length=50, blank=True)
    response_code = models.IntegerField(null=True, blank=True)
    payment_type_code = models.CharField(max_length=10, blank=True)
    # Manual payment fields
    marked_paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="payments_marked_paid",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment(id={self.id}, status={self.status}, resident={self.resident_id})"


class Announcement(models.Model):
    title = models.CharField(max_length=200)
    body = models.TextField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="announcements",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Announcement({self.title!r})"
