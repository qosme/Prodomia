from django.db.models.deletion import ProtectedError
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from condo_app.permissions import IsManager

from ..models import MonthlyFee
from ..serializers import MonthlyFeeSerializer


class MonthlyFeeViewSet(viewsets.ModelViewSet):
    queryset = MonthlyFee.objects.all().order_by("-period_year", "-period_month")
    serializer_class = MonthlyFeeSerializer

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "No se puede eliminar esta cuota porque tiene pagos asociados."},
                status=status.HTTP_409_CONFLICT,
            )

    def get_permissions(self):
        if self.action == "my_fee":
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsManager()]

    @action(detail=False, methods=["get"], url_path="my_fee")
    def my_fee(self, request):
        profile = getattr(request.user, "resident_profile", None)
        if not profile or not profile.is_approved:
            return Response({"detail": "Residente no aprobado."}, status=403)
        now = timezone.now()
        fee = MonthlyFee.objects.filter(
            unit=profile.unit,
            period_year=now.year,
            period_month=now.month,
        ).first()
        if not fee:
            return Response(None)
        return Response(MonthlyFeeSerializer(fee).data)
