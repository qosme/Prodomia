from drf_spectacular.utils import extend_schema
from rest_framework_simplejwt.views import TokenRefreshView as _BaseTokenRefreshView

from .auth import ChangePasswordView, MeView, RegisterView, TokenObtainPairView
from .complaints import ComplaintViewSet
from .packages import PackageViewSet
from .users import UserAdminViewSet

TokenRefreshView = extend_schema(
    tags=["Autenticación"],
    summary="Refrescar token de acceso",
    description="Genera un nuevo `access` token a partir de un `refresh` token válido.",
)(_BaseTokenRefreshView)

__all__ = [
    "RegisterView",
    "MeView",
    "ChangePasswordView",
    "UserAdminViewSet",
    "ComplaintViewSet",
    "PackageViewSet",
    "TokenObtainPairView",
    "TokenRefreshView",
]
