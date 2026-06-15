from django.test import TestCase

from .permissions import (
    is_approved_resident,
    is_concierge_user,
    is_manager,
    is_staff_user,
)
from .test_helpers import make_concierge, make_resident, make_staff, make_user


class PermissionHelpersTest(TestCase):
    def test_is_manager_with_superuser(self):
        self.assertTrue(is_manager(make_user("super_perm", is_superuser=True)))

    def test_is_manager_with_staff_flag(self):
        self.assertTrue(is_manager(make_user("mgr_perm", is_staff=True)))

    def test_is_manager_with_regular_user(self):
        self.assertFalse(is_manager(make_user("reg_perm")))

    def test_is_manager_with_none(self):
        self.assertFalse(is_manager(None))

    def test_is_staff_user_with_profile(self):
        self.assertTrue(is_staff_user(make_staff("staff_perm")))

    def test_is_staff_user_without_profile(self):
        self.assertFalse(is_staff_user(make_user("no_staff_perm")))

    def test_is_concierge_user_active(self):
        self.assertTrue(is_concierge_user(make_concierge("conc_active_perm", active=True)))

    def test_is_concierge_user_inactive(self):
        self.assertFalse(is_concierge_user(make_concierge("conc_inactive_perm", active=False)))

    def test_is_concierge_user_no_profile(self):
        self.assertFalse(is_concierge_user(make_user("no_conc_perm")))

    def test_is_concierge_user_none(self):
        self.assertFalse(is_concierge_user(None))

    def test_is_approved_resident_approved(self):
        self.assertTrue(is_approved_resident(make_resident("res_ok_perm", approved=True)))

    def test_is_approved_resident_not_approved(self):
        self.assertFalse(is_approved_resident(make_resident("res_nok_perm", approved=False)))

    def test_is_approved_resident_no_profile(self):
        self.assertFalse(is_approved_resident(make_user("no_res_perm")))

    def test_is_approved_resident_none(self):
        self.assertFalse(is_approved_resident(None))
