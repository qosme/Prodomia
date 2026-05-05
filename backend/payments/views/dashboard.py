from django.db.models import Sum
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from condo_app.models import Complaint, ResidentProfile
from condo_app.permissions import IsManager

from ..models import MonthlyFee, Payment


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated, IsManager]

    def get(self, request):
        now = timezone.now()

        total_units = (
            ResidentProfile.objects.filter(is_approved=True)
            .values("unit")
            .distinct()
            .count()
        )
        pending_approvals = ResidentProfile.objects.filter(is_approved=False).count()
        open_complaints = Complaint.objects.exclude(
            status__in=["RESOLVED", "CLOSED", "REJECTED"]
        ).count()

        fees_this_month = MonthlyFee.objects.filter(
            period_year=now.year,
            period_month=now.month,
        )
        total_fees = fees_this_month.count()

        paid_payments = Payment.objects.filter(
            monthly_fee__period_year=now.year,
            monthly_fee__period_month=now.month,
            status__in=[Payment.Status.PAID, Payment.Status.MANUAL],
        )
        paid_count = paid_payments.count()
        revenue = paid_payments.aggregate(total=Sum("amount"))["total"] or 0

        return Response({
            "total_units": total_units,
            "pending_approvals": pending_approvals,
            "open_complaints": open_complaints,
            "total_fees_this_month": total_fees,
            "paid_this_month": paid_count,
            "revenue_this_month": float(revenue),
        })
