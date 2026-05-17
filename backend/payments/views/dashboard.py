from django.db.models import Sum
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view, inline_serializer
from rest_framework import serializers as drf_serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from condo_app.models import Complaint, ResidentProfile
from condo_app.permissions import IsManager

from ..models import MonthlyFee, Payment


@extend_schema_view(
    get=extend_schema(
        tags=["Dashboard"],
        summary="Estadísticas generales",
        description=(
            "Retorna un resumen de métricas del condominio para el **mes en curso**. Solo el **administrador**.\n\n"
            "| Campo | Descripción |\n"
            "|-------|-------------|\n"
            "| `total_units` | Unidades con al menos un residente aprobado |\n"
            "| `pending_approvals` | Residentes pendientes de aprobación |\n"
            "| `open_complaints` | Reclamos que no están resueltos, cerrados ni rechazados |\n"
            "| `total_fees_this_month` | Cuotas generadas en el mes actual |\n"
            "| `paid_this_month` | Cuotas pagadas en el mes actual |\n"
            "| `revenue_this_month` | Monto total recaudado en el mes actual |"
        ),
        responses={200: inline_serializer(
            name="DashboardStatsResponse",
            fields={
                "total_units": drf_serializers.IntegerField(),
                "pending_approvals": drf_serializers.IntegerField(),
                "open_complaints": drf_serializers.IntegerField(),
                "total_fees_this_month": drf_serializers.IntegerField(),
                "paid_this_month": drf_serializers.IntegerField(),
                "revenue_this_month": drf_serializers.FloatField(),
            },
        )},
    )
)
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
        pending_approvals = ResidentProfile.objects.filter(is_approved=False, user__is_active=True).count()
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
