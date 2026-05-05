from django.contrib.auth import get_user_model
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import ResidentProfile, StaffProfile
from ..permissions import IsManager
from ..serializers import CreateStaffSerializer, UserSerializer

User = get_user_model()


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
        users = (
            User.objects.filter(staff_profile__isnull=False)
            .select_related("staff_profile")
            .order_by("id")
        )
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
