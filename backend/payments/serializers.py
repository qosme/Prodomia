from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Announcement, MonthlyFee, Payment

User = get_user_model()


class MonthlyFeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyFee
        fields = [
            "id",
            "unit",
            "amount",
            "period_year",
            "period_month",
            "due_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PaymentSerializer(serializers.ModelSerializer):
    monthly_fee = MonthlyFeeSerializer(read_only=True)
    resident_username = serializers.CharField(source="resident.username", read_only=True)
    marked_paid_by_username = serializers.CharField(
        source="marked_paid_by.username", read_only=True, default=None
    )

    class Meta:
        model = Payment
        fields = [
            "id",
            "resident",
            "resident_username",
            "monthly_fee",
            "amount",
            "status",
            "token",
            "buy_order",
            "transaction_date",
            "authorization_code",
            "response_code",
            "payment_type_code",
            "marked_paid_by",
            "marked_paid_by_username",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class PaymentMarkPaidSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = Announcement
        fields = [
            "id",
            "title",
            "body",
            "created_by",
            "created_by_username",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_by_username", "created_at", "updated_at"]


class WebpayInitSerializer(serializers.Serializer):
    monthly_fee_id = serializers.IntegerField()
