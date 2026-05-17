from django.contrib.auth import get_user_model
from rest_framework import serializers

from ..models import Package

User = get_user_model()


class PackageSerializer(serializers.ModelSerializer):
    resident_username = serializers.CharField(source="resident.username", read_only=True)
    resident_unit = serializers.CharField(
        source="resident.resident_profile.unit", read_only=True, default=""
    )
    received_by_username = serializers.CharField(source="received_by.username", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Package
        fields = [
            "id",
            "resident",
            "resident_username",
            "resident_unit",
            "received_by",
            "received_by_username",
            "description",
            "carrier",
            "status",
            "status_display",
            "notes",
            "received_at",
            "delivered_at",
        ]
        read_only_fields = ["id", "received_by", "status", "received_at", "delivered_at"]


class PackageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Package
        fields = ["resident", "description", "carrier", "notes"]

    def validate_resident(self, user):
        if not hasattr(user, "resident_profile"):
            raise serializers.ValidationError("El usuario seleccionado no es un residente.")
        if not user.resident_profile.is_approved:
            raise serializers.ValidationError("El residente no está aprobado.")
        return user
