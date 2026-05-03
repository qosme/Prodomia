import uuid

from django.conf import settings
from django.db.models.deletion import ProtectedError
from django.http import HttpResponseRedirect
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from condo_app.permissions import IsManager, is_approved_resident, is_manager

from .models import Announcement, MonthlyFee, Payment
from .serializers import (
    AnnouncementSerializer,
    MonthlyFeeSerializer,
    PaymentMarkPaidSerializer,
    PaymentSerializer,
    WebpayInitSerializer,
)


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


class PaymentViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Payment.objects.select_related("resident", "monthly_fee", "marked_paid_by").order_by(
            "-created_at"
        )
        if is_manager(user):
            return qs
        return qs.filter(resident=user)

    @action(detail=False, methods=["get"], url_path="my_payments")
    def my_payments(self, request):
        qs = Payment.objects.filter(resident=request.user).select_related(
            "monthly_fee"
        ).order_by("-created_at")
        return Response(PaymentSerializer(qs, many=True).data)

    @action(detail=False, methods=["post"], url_path="create_manual")
    def create_manual(self, request):
        if not is_manager(request.user):
            return Response({"detail": "Solo los gestores pueden registrar pagos manuales."}, status=403)

        fee_id = request.data.get("monthly_fee_id")
        notes = request.data.get("notes", "")

        if not fee_id:
            return Response({"detail": "monthly_fee_id es requerido."}, status=400)

        try:
            fee = MonthlyFee.objects.get(pk=fee_id)
        except MonthlyFee.DoesNotExist:
            return Response({"detail": "Cuota no encontrada."}, status=404)

        already_paid = Payment.objects.filter(
            monthly_fee=fee,
            status__in=[Payment.Status.PAID, Payment.Status.MANUAL],
        ).exists()
        if already_paid:
            return Response({"detail": "Esta cuota ya está pagada."}, status=400)

        from condo_app.models import ResidentProfile
        profile = ResidentProfile.objects.filter(
            unit=fee.unit, is_approved=True
        ).select_related("user").first()
        if not profile:
            return Response({"detail": "No se encontró un residente aprobado para esta unidad."}, status=404)

        payment = Payment.objects.create(
            resident=profile.user,
            monthly_fee=fee,
            amount=fee.amount,
            status=Payment.Status.MANUAL,
            marked_paid_by=request.user,
            notes=notes,
            transaction_date=timezone.now(),
        )
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="mark_paid")
    def mark_paid(self, request, pk=None):
        if not is_manager(request.user):
            return Response({"detail": "Only managers can mark payments as paid."}, status=403)
        payment = self.get_object()
        ser = PaymentMarkPaidSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        payment.status = Payment.Status.MANUAL
        payment.marked_paid_by = request.user
        payment.notes = ser.validated_data.get("notes", "")
        payment.save(update_fields=["status", "marked_paid_by", "notes", "updated_at"])
        return Response(PaymentSerializer(payment).data)


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


class WebpayInitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not is_approved_resident(request.user):
            return Response({"detail": "Only approved residents can make payments."}, status=403)

        ser = WebpayInitSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        fee_id = ser.validated_data["monthly_fee_id"]

        try:
            fee = MonthlyFee.objects.get(pk=fee_id)
        except MonthlyFee.DoesNotExist:
            return Response({"detail": "Monthly fee not found."}, status=404)

        profile = request.user.resident_profile
        if fee.unit != profile.unit:
            return Response({"detail": "This fee does not belong to your unit."}, status=403)

        existing_paid = Payment.objects.filter(
            resident=request.user,
            monthly_fee=fee,
            status__in=[Payment.Status.PAID, Payment.Status.MANUAL],
        ).exists()
        if existing_paid:
            return Response({"detail": "This fee is already paid."}, status=400)

        buy_order = f"BO-{uuid.uuid4().hex[:16]}"
        session_id = f"SID-{request.user.id}-{fee.id}"

        from .transbank_service import init_transaction

        return_url = settings.TRANSBANK_RETURN_URL
        try:
            result = init_transaction(buy_order, session_id, int(fee.amount), return_url)
        except Exception as exc:
            return Response({"detail": f"Transbank error: {exc}"}, status=502)

        Payment.objects.create(
            resident=request.user,
            monthly_fee=fee,
            amount=fee.amount,
            status=Payment.Status.PENDING,
            token=result["token"],
            buy_order=buy_order,
            session_id=session_id,
        )

        return Response({"redirect_url": result["url"], "token": result["token"]})


@method_decorator(csrf_exempt, name="dispatch")
class WebpayCallbackView(View):
    def _handle(self, request):
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")

        # User cancelled before paying
        tbk_token = request.GET.get("TBK_TOKEN") or request.POST.get("TBK_TOKEN")
        if tbk_token:
            Payment.objects.filter(token=tbk_token).update(status=Payment.Status.FAILED)
            return HttpResponseRedirect(f"{frontend_url}/payments?result=cancelled")

        token_ws = request.POST.get("token_ws") or request.GET.get("token_ws")
        if not token_ws:
            return HttpResponseRedirect(f"{frontend_url}/payments?result=failed")

        from .transbank_service import confirm_transaction

        try:
            response = confirm_transaction(token_ws)
        except Exception:
            Payment.objects.filter(token=token_ws).update(status=Payment.Status.FAILED)
            return HttpResponseRedirect(f"{frontend_url}/payments?result=failed")

        try:
            payment = Payment.objects.get(token=token_ws)
        except Payment.DoesNotExist:
            return HttpResponseRedirect(f"{frontend_url}/payments?result=failed")

        response_code = response.get("response_code") if isinstance(response, dict) else getattr(response, "response_code", None)

        if response_code == 0:
            payment.status = Payment.Status.PAID
            payment.authorization_code = (
                response.get("authorization_code", "") if isinstance(response, dict)
                else getattr(response, "authorization_code", "")
            )
            payment.payment_type_code = (
                response.get("payment_type_code", "") if isinstance(response, dict)
                else getattr(response, "payment_type_code", "")
            )
            payment.transaction_date = timezone.now()
            payment.response_code = response_code
            payment.save(update_fields=[
                "status", "authorization_code", "payment_type_code",
                "transaction_date", "response_code", "updated_at",
            ])
            return HttpResponseRedirect(f"{frontend_url}/payments?result=success")
        else:
            payment.status = Payment.Status.FAILED
            payment.response_code = response_code
            payment.save(update_fields=["status", "response_code", "updated_at"])
            return HttpResponseRedirect(f"{frontend_url}/payments?result=failed")

    def get(self, request):
        return self._handle(request)

    def post(self, request):
        return self._handle(request)


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated, IsManager]

    def get(self, request):
        from django.contrib.auth import get_user_model
        from django.db.models import Count, Sum
        from condo_app.models import Complaint, ResidentProfile

        User = get_user_model()

        now = timezone.now()

        total_units = (
            ResidentProfile.objects.filter(is_approved=True)
            .values("unit")
            .distinct()
            .count()
        )
        pending_approvals = ResidentProfile.objects.filter(is_approved=False).count()
        open_complaints = Complaint.objects.exclude(
            status__in=["RESOLVED", "CLOSED", "REJECTED"]
        ).count()

        fees_this_month = MonthlyFee.objects.filter(
            period_year=now.year,
            period_month=now.month,
        )
        total_fees = fees_this_month.count()

        paid_payments = Payment.objects.filter(
            monthly_fee__period_year=now.year,
            monthly_fee__period_month=now.month,
            status__in=[Payment.Status.PAID, Payment.Status.MANUAL],
        )
        paid_count = paid_payments.count()
        revenue = paid_payments.aggregate(total=Sum("amount"))["total"] or 0

        return Response({
            "total_units": total_units,
            "pending_approvals": pending_approvals,
            "open_complaints": open_complaints,
            "total_fees_this_month": total_fees,
            "paid_this_month": paid_count,
            "revenue_this_month": float(revenue),
        })
