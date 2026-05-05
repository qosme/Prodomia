from rest_framework import serializers

from ..models import MonthlyFee


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


class WebpayInitSerializer(serializers.Serializer):
    monthly_fee_id = serializers.IntegerField()
