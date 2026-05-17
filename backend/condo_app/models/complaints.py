import uuid

from django.conf import settings
from django.db import models


class Complaint(models.Model):
    class Status(models.TextChoices):
        NEW = "NEW", "New"
        ASSIGNED = "ASSIGNED", "Assigned"
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        RESOLVED = "RESOLVED", "Resolved"
        REJECTED = "REJECTED", "Rejected"
        CLOSED = "CLOSED", "Closed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resident = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="complaints",
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    location = models.CharField(max_length=200, blank=True)
    category = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Complaint(id={self.id}, status={self.status})"


class ComplaintAssignment(models.Model):
    complaint = models.OneToOneField(
        Complaint, on_delete=models.CASCADE, related_name="assignment"
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="assigned_complaints",
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="assignments_made",
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Assignment(complaint_id={self.complaint_id}, assigned_to={self.assigned_to_id})"


class ComplaintPhoto(models.Model):
    complaint = models.ForeignKey(
        Complaint, on_delete=models.CASCADE, related_name="photos"
    )
    image_url = models.URLField(max_length=500)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="complaint_photos_uploaded",
    )
    created_at = models.DateTimeField(auto_now_add=True)


class ComplaintComment(models.Model):
    complaint = models.ForeignKey(
        Complaint, on_delete=models.CASCADE, related_name="comments"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="complaint_comments",
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)


class ComplaintStatusHistory(models.Model):
    complaint = models.ForeignKey(
        Complaint, on_delete=models.CASCADE, related_name="status_history"
    )
    from_status = models.CharField(max_length=20, choices=Complaint.Status.choices)
    to_status = models.CharField(max_length=20, choices=Complaint.Status.choices)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="complaint_status_changes",
    )
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
