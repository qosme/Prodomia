from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APITestCase

from .models import Package
from .test_helpers import make_concierge, make_manager, make_resident


class PackageViewSetTest(APITestCase):
    LIST_URL = "/api/packages/"

    def _action(self, pk, action_name):
        return f"/api/packages/{pk}/{action_name}/"

    def setUp(self):
        self.manager = make_manager("p_mgr")
        self.concierge = make_concierge("p_conc")
        self.resident1 = make_resident("p_res1", unit="101", approved=True)
        self.resident2 = make_resident("p_res2", unit="102", approved=True)

    def _package(self, resident, description="Box"):
        return Package.objects.create(
            resident=resident, received_by=self.concierge, description=description
        )

    @patch("condo_app.views.packages.notify_package_received")
    def test_create_as_concierge_records_package_and_notifies(self, mock_notify):
        self.client.force_authenticate(user=self.concierge)
        response = self.client.post(self.LIST_URL, {
            "resident": self.resident1.pk,
            "description": "DHL box",
            "carrier": "DHL",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Package.objects.count(), 1)
        pkg = Package.objects.first()
        self.assertEqual(pkg.received_by, self.concierge)
        mock_notify.assert_called_once()

    def test_create_as_resident_returns_403(self):
        self.client.force_authenticate(user=self.resident1)
        response = self.client.post(self.LIST_URL, {
            "resident": self.resident1.pk,
            "description": "Box",
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_unauthenticated_returns_401(self):
        response = self.client.post(self.LIST_URL, {
            "resident": self.resident1.pk,
            "description": "Box",
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_as_concierge_sees_all_packages(self):
        self._package(self.resident1)
        self._package(self.resident2)
        self.client.force_authenticate(user=self.concierge)
        response = self.client.get(self.LIST_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_list_as_manager_sees_all_packages(self):
        self._package(self.resident1)
        self._package(self.resident2)
        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.LIST_URL)
        self.assertEqual(len(response.data), 2)

    def test_list_as_resident_sees_own_packages_only(self):
        self._package(self.resident1, "Mine")
        self._package(self.resident2, "Not mine")
        self.client.force_authenticate(user=self.resident1)
        response = self.client.get(self.LIST_URL)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["description"], "Mine")

    def test_mark_delivered_updates_status_and_sets_timestamp(self):
        pkg = self._package(self.resident1)
        self.client.force_authenticate(user=self.concierge)
        response = self.client.post(self._action(pkg.pk, "mark_delivered"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        pkg.refresh_from_db()
        self.assertEqual(pkg.status, Package.Status.DELIVERED)
        self.assertIsNotNone(pkg.delivered_at)

    def test_mark_delivered_already_delivered_returns_400(self):
        pkg = self._package(self.resident1)
        pkg.status = Package.Status.DELIVERED
        pkg.save()
        self.client.force_authenticate(user=self.concierge)
        response = self.client.post(self._action(pkg.pk, "mark_delivered"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_my_packages_returns_authenticated_residents_packages_only(self):
        self._package(self.resident1, "Mine")
        self._package(self.resident2, "Not mine")
        self.client.force_authenticate(user=self.resident1)
        response = self.client.get(f"{self.LIST_URL}my_packages/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["description"], "Mine")
