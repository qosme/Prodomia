from django.contrib.auth import get_user_model
from rest_framework import serializers as drf_serializers
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer as BaseTokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView as BaseTokenObtainPairView

from ..permissions import is_manager, is_staff_user
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
        # Inject the resolved username so the parent's authenticate() call works normally
        attrs[self.username_field] = user.username
        return super().validate(attrs)


class TokenObtainPairView(BaseTokenObtainPairView):
    serializer_class = _EmailTokenSerializer


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = "resident"
        approved = False
        if is_manager(user):
            role = "manager"
            approved = True
        elif is_staff_user(user):
            role = "staff"
            approved = True
        else:
            profile = getattr(user, "resident_profile", None)
            approved = bool(profile and profile.is_approved)
        data = UserSerializer(user).data
        data["role"] = role
        data["approved"] = approved
        return Response(data)


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
