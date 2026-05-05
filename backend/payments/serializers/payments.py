from rest_framework import serializers

from ..models import Payment
from .fees import MonthlyFeeSerializer


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
