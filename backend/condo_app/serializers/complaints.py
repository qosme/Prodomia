from django.contrib.auth import get_user_model
from rest_framework import serializers

from ..models import (
    Complaint,
    ComplaintAssignment,
    ComplaintComment,
    ComplaintPhoto,
    ComplaintStatusHistory,
)

User = get_user_model()


class ComplaintPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplaintPhoto
        fields = ["id", "image_url", "uploaded_by", "created_at"]
        read_only_fields = ["id", "uploaded_by", "created_at"]


class ComplaintCommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)

    class Meta:
        model = ComplaintComment
        fields = ["id", "author", "author_username", "body", "created_at"]
        read_only_fields = ["id", "author", "author_username", "created_at"]


class ComplaintAssignmentSerializer(serializers.ModelSerializer):
    assigned_to_username = serializers.CharField(source="assigned_to.username", read_only=True)

    class Meta:
        model = ComplaintAssignment
        fields = ["assigned_to", "assigned_to_username", "assigned_by", "assigned_at"]
        read_only_fields = ["assigned_by", "assigned_at", "assigned_to_username"]


class ComplaintStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_username = serializers.CharField(source="changed_by.username", read_only=True)

    class Meta:
        model = ComplaintStatusHistory
        fields = [
            "id",
            "from_status",
            "to_status",
            "changed_by",
            "changed_by_username",
            "note",
            "created_at",
        ]
        read_only_fields = ["id", "changed_by", "changed_by_username", "created_at"]


class ComplaintSerializer(serializers.ModelSerializer):
    resident_username = serializers.CharField(source="resident.username", read_only=True)
    assignment = ComplaintAssignmentSerializer(read_only=True)
    photos = ComplaintPhotoSerializer(many=True, read_only=True)
    comments = ComplaintCommentSerializer(many=True, read_only=True)
    status_history = ComplaintStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Complaint
        fields = [
            "id",
            "resident",
            "resident_username",
            "title",
            "description",
            "location",
            "category",
            "status",
            "created_at",
            "updated_at",
            "assignment",
            "photos",
            "comments",
            "status_history",
        ]
        read_only_fields = ["id", "resident", "resident_username", "created_at", "updated_at"]


class ComplaintCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = ["title", "description", "location", "category"]


class AddCommentSerializer(serializers.Serializer):
    body = serializers.CharField()


class AssignComplaintSerializer(serializers.Serializer):
    assigned_to = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())


class SetStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Complaint.Status.choices)
    note = serializers.CharField(required=False, allow_blank=True)
