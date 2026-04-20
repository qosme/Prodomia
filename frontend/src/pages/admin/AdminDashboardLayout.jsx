import { NavLink, Navigate, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../../auth.jsx'

export default function AdminDashboardLayout() {
  const { user } = useAuth()

  if (user?.role !== 'manager') return <Navigate to="/" replace />

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-title">Panel Admin</div>
        <nav className="admin-nav">
          <NavLink
            to="/admin-dashboard"
            end
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
          >
            Resumen
          </NavLink>
          <NavLink
            to="/admin-dashboard/residents"
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
          >
            Residentes
          </NavLink>
          <NavLink
            to="/admin-dashboard/staff"
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
          >
            Personal
          </NavLink>
          <NavLink
            to="/admin-dashboard/fees"
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
          >
            Cuotas Mensuales
          </NavLink>
          <NavLink
            to="/admin-dashboard/payments"
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
          >
            Pagos
          </NavLink>
          <NavLink
            to="/admin-dashboard/announcements"
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
          >
            Anuncios
          </NavLink>
          <NavLink
            to="/admin-dashboard/complaints"
            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
          >
            Reclamos
          </NavLink>
          <Link to="/manager" className="admin-nav-link">
            Gestión de Reclamos
          </Link>
        </nav>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
