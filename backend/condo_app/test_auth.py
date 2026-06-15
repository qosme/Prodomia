from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from .test_helpers import make_concierge, make_manager, make_resident, make_staff, make_user

User = get_user_model()


class RegisterViewTest(APITestCase):
    URL = "/api/auth/register/"

    def test_register_success_creates_user_and_unapproved_profile(self):
        response = self.client.post(self.URL, {
            "username": "newres",
            "email": "newres@example.com",
            "password": "pass1234!",
            "unit": "201",
            "phone": "987654321",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username="newres")
        self.assertFalse(user.resident_profile.is_approved)
        self.assertEqual(user.resident_profile.unit, "201")

    def test_register_duplicate_username_returns_400(self):
        make_user("dupuser")
        response = self.client.post(self.URL, {
            "username": "dupuser",
            "email": "other@example.com",
            "password": "pass1234!",
            "unit": "101",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_short_password_returns_400(self):
        response = self.client.post(self.URL, {
            "username": "shortpass",
            "email": "sp@example.com",
            "password": "abc",
            "unit": "101",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_missing_email_returns_400(self):
        response = self.client.post(self.URL, {
            "username": "noemail",
            "password": "pass1234!",
            "unit": "101",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TokenObtainViewTest(APITestCase):
    URL = "/api/auth/token/"

    def setUp(self):
        self.user = make_user("loginuser", email="login@example.com", password="pass1234!")

    def test_login_with_email_returns_access_and_refresh_tokens(self):
        response = self.client.post(self.URL, {
            "email": "login@example.com",
            "password": "pass1234!",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_wrong_password_returns_401(self):
        response = self.client.post(self.URL, {
            "email": "login@example.com",
            "password": "wrongpassword",
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_email_returns_401(self):
        response = self.client.post(self.URL, {
            "email": "ghost@example.com",
            "password": "pass1234!",
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MeViewTest(APITestCase):
    URL = "/api/me/"

    def test_unauthenticated_returns_401(self):
        self.assertEqual(self.client.get(self.URL).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unapproved_resident_has_resident_role_and_approved_false(self):
        user = make_resident("me_res_pending", approved=False)
        self.client.force_authenticate(user=user)
        data = self.client.get(self.URL).data
        self.assertEqual(data["role"], "resident")
        self.assertFalse(data["approved"])

    def test_approved_resident_has_approved_true(self):
        user = make_resident("me_res_ok", approved=True)
        self.client.force_authenticate(user=user)
        self.assertTrue(self.client.get(self.URL).data["approved"])

    def test_manager_has_manager_role_and_approved_true(self):
        user = make_manager("me_mgr")
        self.client.force_authenticate(user=user)
        data = self.client.get(self.URL).data
        self.assertEqual(data["role"], "manager")
        self.assertTrue(data["approved"])

    def test_staff_has_staff_role_and_approved_true(self):
        user = make_staff("me_staff")
        self.client.force_authenticate(user=user)
        data = self.client.get(self.URL).data
        self.assertEqual(data["role"], "staff")
        self.assertTrue(data["approved"])

    def test_concierge_has_concierge_role_and_approved_true(self):
        user = make_concierge("me_conc")
        self.client.force_authenticate(user=user)
        data = self.client.get(self.URL).data
        self.assertEqual(data["role"], "concierge")
        self.assertTrue(data["approved"])

    def test_patch_username_updates_user(self):
        user = make_user("me_patch")
        self.client.force_authenticate(user=user)
        response = self.client.patch(self.URL, {"username": "me_patch_new"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.username, "me_patch_new")

    def test_patch_duplicate_username_returns_400(self):
        user = make_user("me_dup")
        make_user("already_taken")
        self.client.force_authenticate(user=user)
        response = self.client.patch(self.URL, {"username": "already_taken"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_email_updates_user(self):
        user = make_user("me_email", email="before@example.com")
        self.client.force_authenticate(user=user)
        response = self.client.patch(self.URL, {"email": "after@example.com"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.email, "after@example.com")

    def test_patch_duplicate_email_returns_400(self):
        user = make_user("me_demail", email="mine@example.com")
        make_user("other_user", email="taken@example.com")
        self.client.force_authenticate(user=user)
        response = self.client.patch(self.URL, {"email": "taken@example.com"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ChangePasswordViewTest(APITestCase):
    URL = "/api/auth/change-password/"

    def setUp(self):
        self.user = make_user("chpass", password="oldpass1!")

    def test_unauthenticated_returns_401(self):
        response = self.client.post(self.URL, {
            "current_password": "oldpass1!",
            "new_password": "newpass123!",
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_change_password_success(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.URL, {
            "current_password": "oldpass1!",
            "new_password": "newpass123!",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("newpass123!"))

    def test_wrong_current_password_returns_400(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.URL, {
            "current_password": "wrongpassword",
            "new_password": "newpass123!",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_new_password_too_short_returns_400(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.URL, {
            "current_password": "oldpass1!",
            "new_password": "short",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_new_password_returns_400(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.URL, {"current_password": "oldpass1!"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
