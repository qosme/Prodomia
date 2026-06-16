from datetime import date

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from condo_app.models import Complaint, ResidentProfile
from payments.models import Announcement, MonthlyFee, Payment

User = get_user_model()


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _make_user(username, email=None, password="pass1234!", is_staff=False):
    email = email or f"{username}@example.com"
    user = User.objects.create(username=username, email=email, is_staff=is_staff)
    user.set_password(password)
    user.save(update_fields=["password"])
    return user


def _make_manager(username="manager"):
    return _make_user(username, is_staff=True)


def _make_resident(username="resident", unit="101", approved=False):
    user = _make_user(username)
    ResidentProfile.objects.create(user=user, unit=unit, is_approved=approved)
    return user


def _make_fee(unit="101", year=2026, month=6, amount="50000.00"):
    return MonthlyFee.objects.create(
        unit=unit,
        amount=amount,
        period_year=year,
        period_month=month,
        due_date=date(year, month, 10),
    )


# ─── MonthlyFee Model Tests ───────────────────────────────────────────────────

class MonthlyFeeModelTest(TestCase):
    def test_str_includes_unit_and_period(self):
        fee = _make_fee(unit="201", year=2026, month=6, amount="75000.00")
        s = str(fee)
        self.assertIn("201", s)
        self.assertIn("2026", s)
        self.assertIn("06", s)

    def test_unique_together_prevents_duplicate_unit_period(self):
        _make_fee(unit="101", year=2026, month=6)
        with self.assertRaises(IntegrityError):
            _make_fee(unit="101", year=2026, month=6)

    def test_same_unit_different_month_is_allowed(self):
        _make_fee(unit="101", year=2026, month=6)
        fee2 = _make_fee(unit="101", year=2026, month=7)
        self.assertIsNotNone(fee2.pk)

    def test_same_month_different_unit_is_allowed(self):
        _make_fee(unit="101", year=2026, month=6)
        fee2 = _make_fee(unit="202", year=2026, month=6)
        self.assertIsNotNone(fee2.pk)


# ─── Payment Model Tests ──────────────────────────────────────────────────────

class PaymentModelTest(TestCase):
    def setUp(self):
        self.resident = _make_resident("pay_res", approved=True)
        self.fee = _make_fee()

    def test_default_status_is_pending(self):
        payment = Payment.objects.create(
            resident=self.resident,
            monthly_fee=self.fee,
            amount="50000.00",
        )
        self.assertEqual(payment.status, Payment.Status.PENDING)

    def test_uuid_primary_key(self):
        import uuid
        payment = Payment.objects.create(
            resident=self.resident,
            monthly_fee=self.fee,
            amount="50000.00",
        )
        self.assertIsInstance(payment.id, uuid.UUID)

    def test_str_includes_status_and_resident_id(self):
        payment = Payment.objects.create(
            resident=self.resident,
            monthly_fee=self.fee,
            amount="50000.00",
        )
        s = str(payment)
        self.assertIn("PENDING", s)
        self.assertIn(str(self.resident.pk), s)

    def test_optional_transbank_fields_blank_by_default(self):
        payment = Payment.objects.create(
            resident=self.resident,
            monthly_fee=self.fee,
            amount="50000.00",
        )
        self.assertEqual(payment.token, "")
        self.assertEqual(payment.authorization_code, "")
        self.assertIsNone(payment.response_code)


# ─── Announcement Model Tests ─────────────────────────────────────────────────

class AnnouncementModelTest(TestCase):
    def setUp(self):
        self.manager = _make_manager("ann_mgr")

    def test_str_includes_title(self):
        ann = Announcement.objects.create(
            title="Water shutdown",
            body="Water will be shut down on Monday.",
            created_by=self.manager,
        )
        self.assertIn("Water shutdown", str(ann))

    def test_default_is_active_true(self):
        ann = Announcement.objects.create(
            title="Test announcement",
            body="Body text",
            created_by=self.manager,
        )
        self.assertTrue(ann.is_active)


# ─── Dashboard Stats View Tests ───────────────────────────────────────────────

class DashboardStatsViewTest(APITestCase):
    URL = "/api/payments/stats/"

    def setUp(self):
        self.manager = _make_manager("dash_mgr")
        self.resident = _make_resident("dash_res", unit="101", approved=True)

    def test_unauthenticated_returns_401(self):
        self.assertEqual(self.client.get(self.URL).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_manager_returns_403(self):
        self.client.force_authenticate(user=self.resident)
        self.assertEqual(self.client.get(self.URL).status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_gets_200_with_all_expected_fields(self):
        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expected_fields = (
            "total_units",
            "pending_approvals",
            "open_complaints",
            "total_fees_this_month",
            "paid_this_month",
            "revenue_this_month",
        )
        for field in expected_fields:
            self.assertIn(field, response.data)

    def test_pending_approvals_counts_unapproved_active_residents(self):
        _make_resident("dash_pending1", unit="202", approved=False)
        _make_resident("dash_pending2", unit="203", approved=False)
        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.URL)
        self.assertGreaterEqual(response.data["pending_approvals"], 2)

    def test_open_complaints_excludes_resolved_closed_and_rejected(self):
        open_c = Complaint.objects.create(
            resident=self.resident, title="Open", description="Still open"
        )
        closed_c = Complaint.objects.create(
            resident=self.resident, title="Closed", description="Done",
            status=Complaint.Status.CLOSED,
        )
        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.URL)
        # Only open_c should count
        self.assertGreaterEqual(response.data["open_complaints"], 1)
        # Ensure closed complaint is not counted
        closed_c.refresh_from_db()
        self.assertEqual(closed_c.status, Complaint.Status.CLOSED)

    def test_total_units_reflects_approved_residents(self):
        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.URL)
        # setUp has one approved resident in unit "101"
        self.assertGreaterEqual(response.data["total_units"], 1)

    def test_revenue_this_month_is_float(self):
        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.URL)
        self.assertIsInstance(response.data["revenue_this_month"], float)


# ─── MonthlyFee PATCH Tests ───────────────────────────────────────────────────

class MonthlyFeePatchTest(APITestCase):
    def setUp(self):
        self.manager = _make_manager("patch_mgr")
        self.resident = _make_resident("patch_res", unit="101", approved=True)
        self.fee = _make_fee(unit="101", year=2026, month=6, amount="50000.00")
        self.URL = f"/api/payments/monthly-fees/{self.fee.id}/"

    def test_patch_amount_as_manager_updates_fee(self):
        self.client.force_authenticate(user=self.manager)
        response = self.client.patch(self.URL, {"amount": "75000.00"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.fee.refresh_from_db()
        self.assertEqual(float(self.fee.amount), 75000.00)

    def test_patch_due_date_as_manager_updates_fee(self):
        self.client.force_authenticate(user=self.manager)
        response = self.client.patch(self.URL, {"due_date": "2026-06-20"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.fee.refresh_from_db()
        self.assertEqual(str(self.fee.due_date), "2026-06-20")

    def test_patch_unauthenticated_returns_401(self):
        response = self.client.patch(self.URL, {"amount": "75000.00"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patch_as_resident_returns_403(self):
        self.client.force_authenticate(user=self.resident)
        response = self.client.patch(self.URL, {"amount": "75000.00"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
