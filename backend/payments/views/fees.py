from django.db.models.deletion import ProtectedError
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from condo_app.permissions import IsManager

from ..models import MonthlyFee
from ..serializers import MonthlyFeeSerializer


@extend_schema(tags=["Cuotas"])
@extend_schema_view(
    list=extend_schema(
        summary="Listar cuotas",
        description="Retorna todas las cuotas mensuales del condominio, ordenadas por período descendente. Solo el **administrador**.",
    ),
    retrieve=extend_schema(
        summary="Obtener cuota",
        description="Retorna los detalles de una cuota mensual específica.",
    ),
    create=extend_schema(
        summary="Crear cuota",
        description="Crea una cuota mensual para una unidad. Retorna `409` si ya existe una cuota para esa unidad en el mismo período. Solo el **administrador**.",
    ),
    update=extend_schema(
        summary="Actualizar cuota",
        description="Reemplaza todos los campos de una cuota mensual. Solo el **administrador**.",
    ),
    partial_update=extend_schema(
        summary="Actualizar cuota parcialmente",
        description="Actualiza uno o más campos de una cuota. Solo el **administrador**.",
    ),
    destroy=extend_schema(
        summary="Eliminar cuota",
        description="Elimina una cuota mensual. Retorna `409` si tiene pagos asociados. Solo el **administrador**.",
    ),
)
class MonthlyFeeViewSet(viewsets.ModelViewSet):
    queryset = MonthlyFee.objects.all().order_by("-period_year", "-period_month")
    serializer_class = MonthlyFeeSerializer

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception as exc:
            if hasattr(exc, 'detail') and 'non_field_errors' in getattr(exc, 'detail', {}):
                return Response(
                    {"detail": "Ya existe una cuota para esta unidad en el período seleccionado."},
                    status=status.HTTP_409_CONFLICT,
                )
            raise

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

    @extend_schema(
        tags=["Cuotas"],
        summary="Mi cuota del mes",
        description="Retorna la cuota mensual de la unidad del **residente autenticado** para el mes en curso. Devuelve `null` si no hay cuota generada para este mes.",
    )
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
