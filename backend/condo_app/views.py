from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import (
    Complaint,
    ComplaintAssignment,
    ComplaintComment,
    ComplaintPhoto,
    ComplaintStatusHistory,
    ResidentProfile,
    StaffProfile,
)
from .permissions import IsManager, is_manager, is_staff_user, is_approved_resident
from .serializers import (
    AddCommentSerializer,
    AssignComplaintSerializer,
    ComplaintCreateSerializer,
    ComplaintSerializer,
    CreateStaffSerializer,
    RegisterSerializer,
    SetStatusSerializer,
    UserSerializer,
)

User = get_user_model()


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


class UserAdminViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, IsManager]
    serializer_class = UserSerializer

    def get_queryset(self):
        return User.objects.all().order_by("id")

    @action(detail=False, methods=["get"])
    def pending_residents(self, request):
        users = (
            User.objects.filter(resident_profile__is_approved=False)
            .select_related("resident_profile")
            .order_by("id")
        )
        return Response(UserSerializer(users, many=True).data)

    @action(detail=True, methods=["post"])
    def approve_resident(self, request, pk=None):
        user = self.get_object()
        profile, _ = ResidentProfile.objects.get_or_create(user=user)
        profile.is_approved = True
        profile.save(update_fields=["is_approved"])
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=["post"])
    def make_staff(self, request, pk=None):
        user = self.get_object()
        StaffProfile.objects.get_or_create(user=user)
        return Response(UserSerializer(user).data)

    @action(detail=False, methods=["get"])
    def staff(self, request):
        users = User.objects.filter(staff_profile__isnull=False).select_related("staff_profile").order_by("id")
        return Response(UserSerializer(users, many=True).data)

    @action(detail=False, methods=["post"])
    def create_staff(self, request):
        serializer = CreateStaffSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=["is_active"])
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=["post"])
    def deactivate_staff(self, request, pk=None):
        user = self.get_object()
        profile = getattr(user, "staff_profile", None)
        if profile:
            profile.is_active_staff = False
            profile.save(update_fields=["is_active_staff"])
        return Response(UserSerializer(user).data)


class ComplaintViewSet(viewsets.ModelViewSet):
    queryset = Complaint.objects.all().select_related("resident").order_by("-created_at")
    serializer_class = ComplaintSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_queryset(self):
        user = self.request.user
        qs = (
            Complaint.objects.all()
            .select_related("resident")
            .select_related("assignment__assigned_to")
            .prefetch_related("photos", "comments", "status_history")
            .order_by("-created_at")
        )
        if is_manager(user):
            return qs
        if is_staff_user(user):
            return qs.filter(assignment__assigned_to=user)
        return qs.filter(resident=user)

    def get_serializer_class(self):
        if self.action in {"create"}:
            return ComplaintCreateSerializer
        return ComplaintSerializer

    def create(self, request, *args, **kwargs):
        if not is_approved_resident(request.user):
            return Response(
                {"detail": "Resident not approved yet."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        complaint = serializer.save(resident=request.user)
        return Response(
            ComplaintSerializer(complaint, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def add_comment(self, request, pk=None):
        complaint = self.get_object()
        ser = AddCommentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ComplaintComment.objects.create(
            complaint=complaint,
            author=request.user,
            body=ser.validated_data["body"],
        )
        complaint.refresh_from_db()
        return Response(ComplaintSerializer(complaint, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def upload_photo(self, request, pk=None):
        complaint = self.get_object()
        image = request.FILES.get("image")
        if not image:
            return Response({"detail": "Missing file 'image'."}, status=400)
        ComplaintPhoto.objects.create(
            complaint=complaint,
            image=image,
            uploaded_by=request.user,
        )
        complaint.refresh_from_db()
        return Response(ComplaintSerializer(complaint, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        if not is_manager(request.user):
            return Response({"detail": "Only manager can assign."}, status=403)
        complaint = self.get_object()
        ser = AssignComplaintSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        assigned_to = ser.validated_data["assigned_to"]
        if not is_staff_user(assigned_to):
            return Response({"detail": "assigned_to must be a staff user."}, status=400)

        with transaction.atomic():
            ComplaintAssignment.objects.update_or_create(
                complaint=complaint,
                defaults={"assigned_to": assigned_to, "assigned_by": request.user},
            )
            if complaint.status == Complaint.Status.NEW:
                self._set_status(
                    complaint,
                    new_status=Complaint.Status.ASSIGNED,
                    changed_by=request.user,
                    note="Assigned to staff.",
                )

        complaint.refresh_from_db()
        return Response(ComplaintSerializer(complaint, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def set_status(self, request, pk=None):
        complaint = self.get_object()
        user = request.user

        allowed = False
        if is_manager(user):
            allowed = True
        elif is_staff_user(user) and getattr(complaint, "assignment", None) and complaint.assignment.assigned_to_id == user.id:
            allowed = True

        if not allowed:
            return Response({"detail": "Not allowed to change status."}, status=403)

        ser = SetStatusSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        self._set_status(
            complaint,
            new_status=ser.validated_data["status"],
            changed_by=user,
            note=ser.validated_data.get("note", ""),
        )
        complaint.refresh_from_db()
        return Response(ComplaintSerializer(complaint, context={"request": request}).data)

    def _set_status(self, complaint: Complaint, new_status: str, changed_by, note: str = ""):
        if complaint.status == new_status:
            return
        ComplaintStatusHistory.objects.create(
            complaint=complaint,
            from_status=complaint.status,
            to_status=new_status,
            changed_by=changed_by,
            note=note,
        )
        complaint.status = new_status
        complaint.save(update_fields=["status", "updated_at"])
