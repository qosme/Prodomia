from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"monthly-fees", views.MonthlyFeeViewSet, basename="monthly-fee")
router.register(r"payments", views.PaymentViewSet, basename="payment")
router.register(r"announcements", views.AnnouncementViewSet, basename="announcement")

urlpatterns = [
    path("", include(router.urls)),
    path("webpay/init/", views.WebpayInitView.as_view(), name="webpay-init"),
    path("webpay/callback/", views.WebpayCallbackView.as_view(), name="webpay-callback"),
    path("stats/", views.DashboardStatsView.as_view(), name="dashboard-stats"),
]
