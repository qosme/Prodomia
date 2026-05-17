from django.contrib.auth import get_user_model
from rest_framework import serializers

from ..models import ConciergeProfile, ResidentProfile, StaffProfile

User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    unit = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)

    def validate_username(self, value: str) -> str:
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("El nombre de usuario ya existe.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        unit = validated_data.pop("unit", "")
        phone = validated_data.pop("phone", "")
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save(update_fields=["password"])
        ResidentProfile.objects.create(user=user, unit=unit, phone=phone, is_approved=False)
        return user


class ResidentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResidentProfile
        fields = ["unit", "phone", "is_approved"]


class StaffProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffProfile
        fields = ["is_active_staff"]


class ConciergeProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConciergeProfile
        fields = ["is_active_concierge"]


class UserSerializer(serializers.ModelSerializer):
    resident_profile = ResidentProfileSerializer(read_only=True)
    staff_profile = StaffProfileSerializer(read_only=True)
    concierge_profile = ConciergeProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "is_staff", "is_active",
            "resident_profile", "staff_profile", "concierge_profile",
        ]


class CreateStaffSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_username(self, value: str) -> str:
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("El nombre de usuario ya existe.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save(update_fields=["password"])
        StaffProfile.objects.create(user=user)
        return user


class CreateConciergeSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_username(self, value: str) -> str:
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("El nombre de usuario ya existe.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save(update_fields=["password"])
        ConciergeProfile.objects.create(user=user)
        return user
