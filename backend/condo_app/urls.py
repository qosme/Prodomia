from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"complaints", views.ComplaintViewSet, basename="complaint")
router.register(r"users", views.UserAdminViewSet, basename="user-admin")

urlpatterns = [
    path("", include(router.urls)),
    path("auth/register/", views.RegisterView.as_view(), name="register"),
    path("auth/token/", views.TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", views.TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/change-password/", views.ChangePasswordView.as_view(), name="change_password"),
    path("me/", views.MeView.as_view(), name="me"),
]
