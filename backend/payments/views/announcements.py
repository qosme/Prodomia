from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from condo_app.permissions import IsManager, is_manager

from ..models import Announcement
from ..serializers import AnnouncementSerializer


@extend_schema(tags=["Anuncios"])
@extend_schema_view(
    list=extend_schema(
        summary="Listar anuncios",
        description="El **administrador** ve todos los anuncios (activos e inactivos); los **residentes y staff** ven solo los activos.",
    ),
    retrieve=extend_schema(
        summary="Obtener anuncio",
        description="Retorna los detalles de un anuncio específico.",
    ),
    create=extend_schema(
        summary="Crear anuncio",
        description="Crea un nuevo anuncio visible para los residentes del condominio. Solo el **administrador**.",
    ),
    update=extend_schema(
        summary="Actualizar anuncio",
        description="Reemplaza todos los campos de un anuncio. Solo el **administrador**.",
    ),
    partial_update=extend_schema(
        summary="Actualizar anuncio parcialmente",
        description="Actualiza uno o más campos de un anuncio. Solo el **administrador**.",
    ),
    destroy=extend_schema(
        summary="Archivar anuncio",
        description="Desactiva (archiva) un anuncio sin eliminarlo de la base de datos (`is_active = false`). Solo el **administrador**.",
    ),
)
class AnnouncementViewSet(viewsets.ModelViewSet):
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if is_manager(user):
            return Announcement.objects.all().order_by("-created_at")
        return Announcement.objects.filter(is_active=True).order_by("-created_at")

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsManager()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        announcement = self.get_object()
        announcement.is_active = False
        announcement.save(update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)
