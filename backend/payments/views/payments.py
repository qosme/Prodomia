import uuid

from django.conf import settings
from django.http import HttpResponseRedirect
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from drf_spectacular.utils import extend_schema, extend_schema_view, inline_serializer
from rest_framework import mixins, serializers as drf_serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from condo_app.models import ResidentProfile
from condo_app.permissions import IsManager, is_approved_resident, is_manager

from ..models import MonthlyFee, Payment
from ..serializers import PaymentMarkPaidSerializer, PaymentSerializer, WebpayInitSerializer
from ..services.transbank import confirm_transaction, init_transaction


@extend_schema(tags=["Pagos"])
@extend_schema_view(
    list=extend_schema(
        summary="Listar pagos",
        description="El **administrador** ve todos los pagos del condominio; el **residente** ve únicamente los suyos.",
    ),
    retrieve=extend_schema(
        summary="Obtener pago",
        description="Retorna los detalles de un pago específico.",
    ),
)
class PaymentViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    queryset = Payment.objects.none()  # deja que spectacular resuelva el tipo de PK; los datos reales vienen de get_queryset

    def get_queryset(self):
        user = self.request.user
        qs = Payment.objects.select_related("resident", "monthly_fee", "marked_paid_by").order_by(
            "-created_at"
        )
        if is_manager(user):
            return qs
        return qs.filter(resident=user)

    @extend_schema(
        tags=["Pagos"],
        summary="Mis pagos",
        description="Retorna el historial completo de pagos del **residente autenticado**, ordenado por fecha descendente.",
    )
    @action(detail=False, methods=["get"], url_path="my_payments")
    def my_payments(self, request):
        qs = (
            Payment.objects.filter(resident=request.user)
            .select_related("monthly_fee")
            .order_by("-created_at")
        )
        return Response(PaymentSerializer(qs, many=True).data)

    @extend_schema(
        tags=["Pagos"],
        summary="Registrar pago manual",
        description="El **administrador** registra un pago sin pasar por WebPay, buscando automáticamente al residente aprobado de la unidad. Retorna `409` si la cuota ya está pagada.",
    )
    @action(detail=False, methods=["post"], url_path="create_manual")
    def create_manual(self, request):
        if not is_manager(request.user):
            return Response({"detail": "Solo los administradores pueden registrar pagos manuales."}, status=403)

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

        profile = ResidentProfile.objects.filter(
            unit=fee.unit, is_approved=True
        ).select_related("user").first()
        if not profile:
            return Response(
                {"detail": "No se encontró un residente aprobado para esta unidad."}, status=404
            )

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

    @extend_schema(
        tags=["Pagos"],
        summary="Marcar pago como pagado",
        description="El **administrador** marca manualmente un pago existente como pagado (`MANUAL`), opcionalmente con notas adicionales.",
    )
    @action(detail=True, methods=["post"], url_path="mark_paid")
    def mark_paid(self, request, pk=None):
        if not is_manager(request.user):
            return Response({"detail": "Solo los administradores pueden marcar pagos como pagados."}, status=403)
        payment = self.get_object()
        ser = PaymentMarkPaidSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        payment.status = Payment.Status.MANUAL
        payment.marked_paid_by = request.user
        payment.notes = ser.validated_data.get("notes", "")
        payment.save(update_fields=["status", "marked_paid_by", "notes", "updated_at"])
        return Response(PaymentSerializer(payment).data)


@extend_schema_view(
    post=extend_schema(
        tags=["Pagos"],
        summary="Iniciar pago WebPay",
        description=(
            "Inicia una transacción en **Transbank WebPay Plus** para pagar una cuota mensual. "
            "Retorna la `redirect_url` a la que se debe redirigir al usuario y el `token` de la transacción. "
            "Solo **residentes aprobados** pueden realizar pagos."
        ),
        request=WebpayInitSerializer,
        responses={200: inline_serializer(
            name="WebpayInitResponse",
            fields={
                "redirect_url": drf_serializers.URLField(),
                "token": drf_serializers.CharField(),
            },
        )},
    )
)
class WebpayInitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not is_approved_resident(request.user):
            return Response({"detail": "Solo los residentes aprobados pueden realizar pagos."}, status=403)

        ser = WebpayInitSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        fee_id = ser.validated_data["monthly_fee_id"]

        try:
            fee = MonthlyFee.objects.get(pk=fee_id)
        except MonthlyFee.DoesNotExist:
            return Response({"detail": "Cuota mensual no encontrada."}, status=404)

        profile = request.user.resident_profile
        if fee.unit != profile.unit:
            return Response({"detail": "Esta cuota no pertenece a tu unidad."}, status=403)

        existing_paid = Payment.objects.filter(
            resident=request.user,
            monthly_fee=fee,
            status__in=[Payment.Status.PAID, Payment.Status.MANUAL],
        ).exists()
        if existing_paid:
            return Response({"detail": "Esta cuota ya está pagada."}, status=400)

        buy_order = f"BO-{uuid.uuid4().hex[:16]}"
        session_id = f"SID-{request.user.id}-{fee.id}"

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

        tbk_token = request.GET.get("TBK_TOKEN") or request.POST.get("TBK_TOKEN")
        if tbk_token:
            Payment.objects.filter(token=tbk_token).update(status=Payment.Status.FAILED)
            return HttpResponseRedirect(f"{frontend_url}/payments?result=cancelled")

        token_ws = request.POST.get("token_ws") or request.GET.get("token_ws")
        if not token_ws:
            return HttpResponseRedirect(f"{frontend_url}/payments?result=failed")

        try:
            response = confirm_transaction(token_ws)
        except Exception:
            Payment.objects.filter(token=token_ws).update(status=Payment.Status.FAILED)
            return HttpResponseRedirect(f"{frontend_url}/payments?result=failed")

        try:
            payment = Payment.objects.get(token=token_ws)
        except Payment.DoesNotExist:
            return HttpResponseRedirect(f"{frontend_url}/payments?result=failed")

        response_code = (
            response.get("response_code")
            if isinstance(response, dict)
            else getattr(response, "response_code", None)
        )

        if response_code == 0:
            payment.status = Payment.Status.PAID
            payment.authorization_code = (
                response.get("authorization_code", "")
                if isinstance(response, dict)
                else getattr(response, "authorization_code", "")
            )
            payment.payment_type_code = (
                response.get("payment_type_code", "")
                if isinstance(response, dict)
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
