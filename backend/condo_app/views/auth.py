from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema, extend_schema_view, inline_serializer
from rest_framework import serializers as drf_serializers
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer as BaseTokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView as BaseTokenObtainPairView

from ..permissions import is_concierge_user, is_manager, is_staff_user
from ..serializers import RegisterSerializer, UserSerializer


class _EmailTokenSerializer(BaseTokenObtainPairSerializer):
    default_error_messages = {
        "no_active_account": "Credenciales incorrectas. Verifica tu correo y contraseña."
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        del self.fields[self.username_field]
        self.fields["email"] = drf_serializers.EmailField(write_only=True)

    def validate(self, attrs):
        User = get_user_model()
        try:
            user = User.objects.get(email__iexact=attrs["email"])
        except (User.DoesNotExist, User.MultipleObjectsReturned):
            raise AuthenticationFailed(
                self.error_messages["no_active_account"],
                "no_active_account",
            )
        # Inyectar el nombre de usuario para que el serializer pueda validar la contraseña
        attrs[self.username_field] = user.username
        return super().validate(attrs)


@extend_schema(
    tags=["Autenticación"],
    summary="Iniciar sesión",
    description="Obtiene un par de tokens JWT (`access` y `refresh`) usando **email** y contraseña.",
)
class TokenObtainPairView(BaseTokenObtainPairView):
    serializer_class = _EmailTokenSerializer


@extend_schema_view(
    post=extend_schema(
        tags=["Autenticación"],
        summary="Registrar nuevo usuario",
        description=(
            "Crea una cuenta de residente con email y contraseña. "
            "La cuenta queda **pendiente de aprobación** por el administrador antes de poder operar en el sistema."
        ),
        request=RegisterSerializer,
        responses={201: UserSerializer},
    )
)
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    get=extend_schema(
        tags=["Autenticación"],
        summary="Mi perfil",
        description=(
            "Retorna los datos del usuario autenticado junto con su **rol** "
            "(`manager`, `staff`, `concierge` o `resident`) y su estado de aprobación."
        ),
        responses={200: UserSerializer},
    ),
    patch=extend_schema(
        tags=["Autenticación"],
        summary="Actualizar mi perfil",
        description="Actualiza el nombre de usuario y/o email del usuario autenticado.",
        request=inline_serializer(
            name="UpdateProfileRequest",
            fields={
                "username": drf_serializers.CharField(required=False),
                "email": drf_serializers.EmailField(required=False),
            },
        ),
        responses={200: UserSerializer},
    ),
)
class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def _build_response(self, user):
        role = "resident"
        approved = False
        if is_manager(user):
            role = "manager"
            approved = True
        elif is_staff_user(user):
            role = "staff"
            approved = True
        elif is_concierge_user(user):
            role = "concierge"
            approved = True
        else:
            profile = getattr(user, "resident_profile", None)
            approved = bool(profile and profile.is_approved)
        data = UserSerializer(user).data
        data["role"] = role
        data["approved"] = approved
        return data

    def get(self, request):
        return Response(self._build_response(request.user))

    def patch(self, request):
        User = get_user_model()
        user = request.user
        username = request.data.get("username", "").strip()
        email = request.data.get("email", "").strip()

        if username and username != user.username:
            if User.objects.filter(username=username).exclude(pk=user.pk).exists():
                return Response({"detail": "Ese nombre de usuario ya está en uso."}, status=status.HTTP_400_BAD_REQUEST)
            user.username = username

        if email and email != user.email:
            if User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
                return Response({"detail": "Ese email ya está en uso."}, status=status.HTTP_400_BAD_REQUEST)
            user.email = email

        user.save(update_fields=["username", "email"])
        return Response(self._build_response(user))


@extend_schema_view(
    post=extend_schema(
        tags=["Autenticación"],
        summary="Cambiar contraseña",
        description="Actualiza la contraseña del usuario autenticado. Se requiere `current_password` para confirmar la identidad.",
        request=inline_serializer(
            name="ChangePasswordRequest",
            fields={
                "current_password": drf_serializers.CharField(),
                "new_password": drf_serializers.CharField(min_length=8),
            },
        ),
        responses={200: inline_serializer(
            name="ChangePasswordResponse",
            fields={"detail": drf_serializers.CharField()},
        )},
    )
)
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get("current_password", "")
        new_password = request.data.get("new_password", "")

        if not current_password or not new_password:
            return Response({"detail": "Ambos campos son requeridos."}, status=status.HTTP_400_BAD_REQUEST)

        if not request.user.check_password(current_password):
            return Response({"detail": "La contraseña actual es incorrecta."}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return Response({"detail": "La nueva contraseña debe tener al menos 8 caracteres."}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save(update_fields=["password"])
        return Response({"detail": "Contraseña cambiada exitosamente."})
