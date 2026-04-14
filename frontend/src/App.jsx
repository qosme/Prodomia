import { NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ComplaintDetailPage from './pages/ComplaintDetailPage.jsx'
import ManagerDashboardPage from './pages/ManagerDashboardPage.jsx'
import ManagerApprovalsPage from './pages/ManagerApprovalsPage.jsx'
import ManagerAssignPage from './pages/ManagerAssignPage.jsx'
import ManagerStaffPage from './pages/ManagerStaffPage.jsx'
import StaffAssignedPage from './pages/StaffAssignedPage.jsx'
import AnnouncementsPage from './pages/AnnouncementsPage.jsx'
import ResidentPaymentsPage from './pages/ResidentPaymentsPage.jsx'
import AdminDashboardLayout from './pages/admin/AdminDashboardLayout.jsx'
import AdminOverviewPage from './pages/admin/AdminOverviewPage.jsx'
import AdminResidentsPage from './pages/admin/AdminResidentsPage.jsx'
import AdminStaffPage from './pages/admin/AdminStaffPage.jsx'
import AdminFeesPage from './pages/admin/AdminFeesPage.jsx'
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage.jsx'
import AdminAnnouncementsPage from './pages/admin/AdminAnnouncementsPage.jsx'
import AdminComplaintsPage from './pages/admin/AdminComplaintsPage.jsx'

function Guarded({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="container"><div className="card">Loading…</div></div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppNav() {
  const { user, logout } = useAuth()
  const role = user?.role

  return (
    <div className="nav">
      <div className="container nav-inner">
        <NavLink className="brand" to="/">
          Prodomia
        </NavLink>
        <div className="tabs">
          {user ? (
            <>
              <NavLink className={({ isActive }) => `tab ${isActive ? 'active' : ''}`} to="/">
                Dashboard
              </NavLink>
              {role === 'manager' && (
                <NavLink className={({ isActive }) => `tab ${isActive ? 'active' : ''}`} to="/admin-dashboard">
                  Admin
                </NavLink>
              )}
              {role === 'staff' && (
                <NavLink className={({ isActive }) => `tab ${isActive ? 'active' : ''}`} to="/staff/assigned">
                  Assigned
                </NavLink>
              )}
              {role === 'resident' && (
                <NavLink className={({ isActive }) => `tab ${isActive ? 'active' : ''}`} to="/payments">
                  Payments
                </NavLink>
              )}
              <NavLink className={({ isActive }) => `tab ${isActive ? 'active' : ''}`} to="/announcements">
                Announcements
              </NavLink>
              <span className="pill">{user.username}</span>
              <button className="btn danger" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink className={({ isActive }) => `tab ${isActive ? 'active' : ''}`} to="/login">
                Login
              </NavLink>
              <NavLink className={({ isActive }) => `tab ${isActive ? 'active' : ''}`} to="/register">
                Registrarse
              </NavLink>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <>
      <AppNav />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/" element={<Guarded><DashboardPage /></Guarded>} />
        <Route path="/complaints/:id" element={<Guarded><ComplaintDetailPage /></Guarded>} />

        {/* Legacy manager routes (kept for backwards compat) */}
        <Route path="/manager/approvals" element={<Guarded><ManagerApprovalsPage /></Guarded>} />
        <Route path="/manager" element={<Guarded><ManagerDashboardPage /></Guarded>} />
        <Route path="/manager/assign" element={<Guarded><ManagerAssignPage /></Guarded>} />
        <Route path="/manager/staff" element={<Guarded><ManagerStaffPage /></Guarded>} />

        <Route path="/staff/assigned" element={<Guarded><StaffAssignedPage /></Guarded>} />

        {/* Resident pages */}
        <Route path="/payments" element={<Guarded><ResidentPaymentsPage /></Guarded>} />
        <Route path="/announcements" element={<Guarded><AnnouncementsPage /></Guarded>} />

        {/* Admin dashboard (nested routes with sidebar layout) */}
        <Route
          path="/admin-dashboard"
          element={<Guarded><AdminDashboardLayout /></Guarded>}
        >
          <Route index element={<AdminOverviewPage />} />
          <Route path="residents" element={<AdminResidentsPage />} />
          <Route path="staff" element={<AdminStaffPage />} />
          <Route path="fees" element={<AdminFeesPage />} />
          <Route path="payments" element={<AdminPaymentsPage />} />
          <Route path="announcements" element={<AdminAnnouncementsPage />} />
          <Route path="complaints" element={<AdminComplaintsPage />} />
        </Route>
      </Routes>
    </>
  )
}
