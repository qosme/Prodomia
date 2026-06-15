from django.test import TestCase

from .models import (
    Complaint,
    ConciergeProfile,
    Package,
    ResidentProfile,
    StaffProfile,
)
from .test_helpers import make_user


class ResidentProfileModelTest(TestCase):
    def setUp(self):
        self.user = make_user("res_model")
        self.profile = ResidentProfile.objects.create(user=self.user, unit="101", phone="123456789")

    def test_str_includes_user_id(self):
        self.assertIn(str(self.user.pk), str(self.profile))

    def test_default_is_approved_false(self):
        self.assertFalse(self.profile.is_approved)

    def test_blank_unit_and_phone_allowed(self):
        user2 = make_user("res_blank")
        profile = ResidentProfile.objects.create(user=user2)
        self.assertEqual(profile.unit, "")
        self.assertEqual(profile.phone, "")


class StaffProfileModelTest(TestCase):
    def setUp(self):
        self.user = make_user("staff_model")
        self.profile = StaffProfile.objects.create(user=self.user)

    def test_str_includes_user_id(self):
        self.assertIn(str(self.user.pk), str(self.profile))

    def test_default_is_active_staff_true(self):
        self.assertTrue(self.profile.is_active_staff)


class ConciergeProfileModelTest(TestCase):
    def setUp(self):
        self.user = make_user("conc_model")
        self.profile = ConciergeProfile.objects.create(user=self.user)

    def test_str_includes_user_id(self):
        self.assertIn(str(self.user.pk), str(self.profile))

    def test_default_is_active_concierge_true(self):
        self.assertTrue(self.profile.is_active_concierge)


class ComplaintModelTest(TestCase):
    def setUp(self):
        self.user = make_user("compl_user")
        self.complaint = Complaint.objects.create(
            resident=self.user,
            title="Water leak",
            description="Leak in bathroom",
        )

    def test_default_status_new(self):
        self.assertEqual(self.complaint.status, Complaint.Status.NEW)

    def test_uuid_primary_key(self):
        import uuid
        self.assertIsInstance(self.complaint.id, uuid.UUID)

    def test_str_includes_status(self):
        self.assertIn("NEW", str(self.complaint))

    def test_optional_fields_blank_by_default(self):
        self.assertEqual(self.complaint.location, "")
        self.assertEqual(self.complaint.category, "")


class PackageModelTest(TestCase):
    def setUp(self):
        self.resident = make_user("pkg_res")
        self.concierge = make_user("pkg_conc")
        self.package = Package.objects.create(
            resident=self.resident,
            received_by=self.concierge,
            description="Amazon box",
        )

    def test_default_status_pending(self):
        self.assertEqual(self.package.status, Package.Status.PENDING)

    def test_uuid_primary_key(self):
        import uuid
        self.assertIsInstance(self.package.id, uuid.UUID)

    def test_str_includes_status(self):
        self.assertIn("PENDING", str(self.package))

    def test_delivered_at_null_by_default(self):
        self.assertIsNone(self.package.delivered_at)

    def test_carrier_blank_by_default(self):
        self.assertEqual(self.package.carrier, "")
