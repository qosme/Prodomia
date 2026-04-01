import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth.jsx'

export default function AdminDashboardLayout() {
  const { user } = useAuth()

  if (user?.role !== 'manager') return <Navigate to="/" replace />

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-title">Admin Panel</div>
        <nav className="admin-nav">
          <NavLink
            to="/admin-dashboard"
            end
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
          >
            Overview
          </NavLink>
          <NavLink
            to="/admin-dashboard/residents"
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
          >
            Residents
          </NavLink>
          <NavLink
            to="/admin-dashboard/staff"
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
          >
            Staff
          </NavLink>
          <NavLink
            to="/admin-dashboard/fees"
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
          >
            Monthly Fees
          </NavLink>
          <NavLink
            to="/admin-dashboard/payments"
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
          >
            Payments
          </NavLink>
          <NavLink
            to="/admin-dashboard/announcements"
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
          >
            Announcements
          </NavLink>
          <NavLink
            to="/admin-dashboard/complaints"
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
          >
            Complaints
          </NavLink>
        </nav>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
