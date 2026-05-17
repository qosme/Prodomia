from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Package
from ..permissions import IsConcierge, IsManager, is_approved_resident, is_concierge_user, is_manager
from ..serializers import PackageCreateSerializer, PackageSerializer
from ..services.notifications import notify_package_received


@extend_schema(tags=["Pedidos"])
@extend_schema_view(
    list=extend_schema(
        summary="Listar pedidos",
        description=(
            "Residentes ven solo sus propios pedidos. "
            "Conserjes y administradores ven todos los pedidos."
        ),
    ),
    create=extend_schema(
        summary="Registrar pedido recibido",
        description="Solo el **conserje** puede registrar un nuevo pedido. Envía un email al residente automáticamente.",
        request=PackageCreateSerializer,
        responses={201: PackageSerializer},
    ),
)
class PackageViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), IsConcierge()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "create":
            return PackageCreateSerializer
        return PackageSerializer

    def get_queryset(self):
        user = self.request.user
        if is_manager(user) or is_concierge_user(user):
            return Package.objects.select_related(
                "resident", "resident__resident_profile", "received_by"
            ).all()
        return Package.objects.select_related(
            "resident", "resident__resident_profile", "received_by"
        ).filter(resident=user)

    def perform_create(self, serializer):
        package = serializer.save(received_by=self.request.user)
        notify_package_received(package)

    @extend_schema(
        tags=["Pedidos"],
        summary="Marcar pedido como entregado",
        description="Marca el pedido como entregado. Solo **conserje** o **administrador**.",
        request=None,
        responses={200: PackageSerializer},
    )
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsConcierge | IsManager])
    def mark_delivered(self, request, pk=None):
        package = self.get_object()
        if package.status == Package.Status.DELIVERED:
            return Response({"detail": "El pedido ya fue entregado."}, status=status.HTTP_400_BAD_REQUEST)
        package.status = Package.Status.DELIVERED
        package.delivered_at = timezone.now()
        package.save(update_fields=["status", "delivered_at"])
        return Response(PackageSerializer(package).data)

    @extend_schema(
        tags=["Pedidos"],
        summary="Mis pedidos",
        description="Retorna solo los pedidos del residente autenticado.",
        responses={200: PackageSerializer(many=True)},
    )
    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def my_packages(self, request):
        qs = Package.objects.select_related(
            "resident", "resident__resident_profile", "received_by"
        ).filter(resident=request.user)
        return Response(PackageSerializer(qs, many=True).data)
