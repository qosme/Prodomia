from rest_framework import status
from rest_framework.test import APITestCase

from .models import (
    Complaint,
    ComplaintAssignment,
    ComplaintComment,
    ComplaintPhoto,
    ComplaintStatusHistory,
)
from .test_helpers import make_manager, make_resident, make_staff


class ComplaintViewSetTest(APITestCase):
    LIST_URL = "/api/complaints/"

    def _detail(self, pk):
        return f"/api/complaints/{pk}/"

    def _action(self, pk, action_name):
        return f"/api/complaints/{pk}/{action_name}/"

    def setUp(self):
        self.manager = make_manager("c_mgr")
        self.staff1 = make_staff("c_staff1")
        self.staff2 = make_staff("c_staff2")
        self.resident1 = make_resident("c_res1", unit="101", approved=True)
        self.resident2 = make_resident("c_res2", unit="102", approved=True)
        self.pending_res = make_resident("c_pend", unit="103", approved=False)

    def _complaint(self, resident, title="Test complaint"):
        return Complaint.objects.create(
            resident=resident, title=title, description="Description"
        )

    # List / queryset filtering

    def test_list_unauthenticated_returns_401(self):
        self.assertEqual(self.client.get(self.LIST_URL).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_manager_sees_all_complaints(self):
        self._complaint(self.resident1)
        self._complaint(self.resident2)
        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.LIST_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_list_resident_sees_own_complaints_only(self):
        self._complaint(self.resident1)
        self._complaint(self.resident2)
        self.client.force_authenticate(user=self.resident1)
        response = self.client.get(self.LIST_URL)
        self.assertEqual(len(response.data), 1)

    def test_list_staff_sees_only_assigned_complaints(self):
        c1 = self._complaint(self.resident1, "Assigned to staff1")
        self._complaint(self.resident2, "Not assigned to anyone")
        ComplaintAssignment.objects.create(
            complaint=c1, assigned_to=self.staff1, assigned_by=self.manager
        )
        self.client.force_authenticate(user=self.staff1)
        response = self.client.get(self.LIST_URL)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Assigned to staff1")

    # Create

    def test_create_as_approved_resident_returns_201(self):
        self.client.force_authenticate(user=self.resident1)
        response = self.client.post(self.LIST_URL, {
            "title": "Noise complaint",
            "description": "Too loud at night",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Complaint.objects.filter(resident=self.resident1).count(), 1)

    def test_create_as_unapproved_resident_returns_403(self):
        self.client.force_authenticate(user=self.pending_res)
        response = self.client.post(self.LIST_URL, {
            "title": "Noise complaint",
            "description": "Too loud",
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_unauthenticated_returns_401(self):
        response = self.client.post(self.LIST_URL, {"title": "x", "description": "y"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_sets_new_status_by_default(self):
        self.client.force_authenticate(user=self.resident1)
        self.client.post(self.LIST_URL, {"title": "Leaking pipe", "description": "Bathroom"})
        complaint = Complaint.objects.get(resident=self.resident1)
        self.assertEqual(complaint.status, Complaint.Status.NEW)

    # add_comment

    def test_add_comment_creates_comment(self):
        complaint = self._complaint(self.resident1)
        self.client.force_authenticate(user=self.manager)
        response = self.client.post(
            self._action(complaint.pk, "add_comment"), {"body": "Looking into this."}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(ComplaintComment.objects.filter(complaint=complaint).count(), 1)

    # upload_photo

    def test_upload_photo_adds_photo_to_complaint(self):
        complaint = self._complaint(self.resident1)
        self.client.force_authenticate(user=self.resident1)
        response = self.client.post(
            self._action(complaint.pk, "upload_photo"),
            {"image_url": "https://example.com/img.jpg"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(ComplaintPhoto.objects.filter(complaint=complaint).count(), 1)

    def test_upload_photo_without_url_returns_400(self):
        complaint = self._complaint(self.resident1)
        self.client.force_authenticate(user=self.resident1)
        response = self.client.post(self._action(complaint.pk, "upload_photo"), {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # assign

    def test_assign_as_manager_creates_assignment_and_sets_status_assigned(self):
        complaint = self._complaint(self.resident1)
        self.client.force_authenticate(user=self.manager)
        response = self.client.post(
            self._action(complaint.pk, "assign"), {"assigned_to": self.staff1.pk}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, Complaint.Status.ASSIGNED)
        self.assertEqual(complaint.assignment.assigned_to, self.staff1)

    def test_assign_does_not_downgrade_status_if_already_past_new(self):
        complaint = self._complaint(self.resident1)
        complaint.status = Complaint.Status.IN_PROGRESS
        complaint.save()
        self.client.force_authenticate(user=self.manager)
        self.client.post(self._action(complaint.pk, "assign"), {"assigned_to": self.staff1.pk})
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, Complaint.Status.IN_PROGRESS)

    def test_assign_as_resident_returns_403(self):
        complaint = self._complaint(self.resident1)
        self.client.force_authenticate(user=self.resident1)
        response = self.client.post(
            self._action(complaint.pk, "assign"), {"assigned_to": self.staff1.pk}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_assign_to_non_staff_user_returns_400(self):
        complaint = self._complaint(self.resident1)
        self.client.force_authenticate(user=self.manager)
        response = self.client.post(
            self._action(complaint.pk, "assign"), {"assigned_to": self.resident1.pk}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # set_status

    def test_set_status_as_manager_updates_complaint_status(self):
        complaint = self._complaint(self.resident1)
        self.client.force_authenticate(user=self.manager)
        response = self.client.post(
            self._action(complaint.pk, "set_status"), {"status": "IN_PROGRESS"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, Complaint.Status.IN_PROGRESS)

    def test_set_status_creates_history_entry_with_note(self):
        complaint = self._complaint(self.resident1)
        self.client.force_authenticate(user=self.manager)
        self.client.post(
            self._action(complaint.pk, "set_status"),
            {"status": "RESOLVED", "note": "Fixed the leak"},
        )
        entry = ComplaintStatusHistory.objects.get(complaint=complaint)
        self.assertEqual(entry.from_status, Complaint.Status.NEW)
        self.assertEqual(entry.to_status, Complaint.Status.RESOLVED)
        self.assertEqual(entry.note, "Fixed the leak")

    def test_set_status_same_value_does_not_create_history_entry(self):
        complaint = self._complaint(self.resident1)
        self.client.force_authenticate(user=self.manager)
        self.client.post(self._action(complaint.pk, "set_status"), {"status": "NEW"})
        self.assertEqual(
            ComplaintStatusHistory.objects.filter(complaint=complaint).count(), 0
        )

    def test_set_status_as_assigned_staff_is_allowed(self):
        complaint = self._complaint(self.resident1)
        ComplaintAssignment.objects.create(
            complaint=complaint, assigned_to=self.staff1, assigned_by=self.manager
        )
        self.client.force_authenticate(user=self.staff1)
        response = self.client.post(
            self._action(complaint.pk, "set_status"), {"status": "IN_PROGRESS"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_set_status_as_resident_on_own_complaint_returns_403(self):
        complaint = self._complaint(self.resident1)
        self.client.force_authenticate(user=self.resident1)
        response = self.client.post(
            self._action(complaint.pk, "set_status"), {"status": "IN_PROGRESS"}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_set_status_on_another_staffs_complaint_returns_404(self):
        complaint = self._complaint(self.resident1)
        ComplaintAssignment.objects.create(
            complaint=complaint, assigned_to=self.staff1, assigned_by=self.manager
        )
        self.client.force_authenticate(user=self.staff2)
        response = self.client.post(
            self._action(complaint.pk, "set_status"), {"status": "IN_PROGRESS"}
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
