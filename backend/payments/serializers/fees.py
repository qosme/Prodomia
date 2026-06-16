from rest_framework import serializers

from ..models import MonthlyFee, Payment


class MonthlyFeeSerializer(serializers.ModelSerializer):
    has_paid_payments = serializers.SerializerMethodField()

    def get_has_paid_payments(self, obj):
        return obj.payments.filter(status__in=[Payment.Status.PAID, Payment.Status.MANUAL]).exists()

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
            "has_paid_payments",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "has_paid_payments"]


class WebpayInitSerializer(serializers.Serializer):
    monthly_fee_id = serializers.IntegerField()
