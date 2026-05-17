from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import ResidentProfile, StaffProfile
from ..permissions import IsManager
from ..serializers import CreateStaffSerializer, UserSerializer

User = get_user_model()


@extend_schema(tags=["Usuarios"])
@extend_schema_view(
    list=extend_schema(
        summary="Listar usuarios",
        description="Retorna todos los usuarios del sistema (residentes, staff y administrador). Solo accesible por el **administrador**.",
    ),
    retrieve=extend_schema(
        summary="Obtener usuario",
        description="Retorna los datos de un usuario específico. Solo accesible por el **administrador**.",
    ),
)
class UserAdminViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, IsManager]
    serializer_class = UserSerializer

    def get_queryset(self):
        return User.objects.all().order_by("id")

    @extend_schema(
        tags=["Usuarios"],
        summary="Residentes pendientes de aprobación",
        description="Lista los residentes cuya cuenta fue registrada pero aún no ha sido aprobada por el administrador.",
    )
    @action(detail=False, methods=["get"])
    def pending_residents(self, request):
        users = (
            User.objects.filter(resident_profile__is_approved=False)
            .select_related("resident_profile")
            .order_by("id")
        )
        return Response(UserSerializer(users, many=True).data)

    @extend_schema(
        tags=["Usuarios"],
        summary="Aprobar residente",
        description="Aprueba la cuenta de un residente para que pueda acceder a las funciones del sistema (reclamos, pagos, etc.).",
    )
    @action(detail=True, methods=["post"])
    def approve_resident(self, request, pk=None):
        user = self.get_object()
        profile, _ = ResidentProfile.objects.get_or_create(user=user)
        profile.is_approved = True
        profile.save(update_fields=["is_approved"])
        return Response(UserSerializer(user).data)

    @extend_schema(
        tags=["Usuarios"],
        summary="Promover a staff",
        description="Asigna el rol de **staff** (personal de mantención) a un usuario existente.",
    )
    @action(detail=True, methods=["post"])
    def make_staff(self, request, pk=None):
        user = self.get_object()
        StaffProfile.objects.get_or_create(user=user)
        return Response(UserSerializer(user).data)

    @extend_schema(
        tags=["Usuarios"],
        summary="Listar staff",
        description="Retorna todos los usuarios con perfil de **staff** activo.",
    )
    @action(detail=False, methods=["get"])
    def staff(self, request):
        users = (
            User.objects.filter(staff_profile__isnull=False)
            .select_related("staff_profile")
            .order_by("id")
        )
        return Response(UserSerializer(users, many=True).data)

    @extend_schema(
        tags=["Usuarios"],
        summary="Crear usuario staff",
        description="Crea un nuevo usuario con rol de **staff** directamente, sin pasar por el flujo de registro de residentes.",
    )
    @action(detail=False, methods=["post"])
    def create_staff(self, request):
        serializer = CreateStaffSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        tags=["Usuarios"],
        summary="Desactivar usuario",
        description="Desactiva la cuenta de un usuario (`is_active = false`). El usuario no podrá iniciar sesión.",
    )
    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=["is_active"])
        return Response(UserSerializer(user).data)

    @extend_schema(
        tags=["Usuarios"],
        summary="Activar usuario",
        description="Reactiva la cuenta de un usuario (`is_active = true`). El usuario podrá volver a iniciar sesión.",
    )
    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=["is_active"])
        return Response(UserSerializer(user).data)

    @extend_schema(
        tags=["Usuarios"],
        summary="Desactivar staff",
        description="Desactiva el perfil de staff de un usuario (`is_active_staff = false`) sin eliminar su cuenta.",
    )
    @action(detail=True, methods=["post"])
    def deactivate_staff(self, request, pk=None):
        user = self.get_object()
        profile = getattr(user, "staff_profile", None)
        if profile:
            profile.is_active_staff = False
            profile.save(update_fields=["is_active_staff"])
        return Response(UserSerializer(user).data)
