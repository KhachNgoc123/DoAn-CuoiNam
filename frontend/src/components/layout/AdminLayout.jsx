import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AdminLayout({ user, onUserChange }) {
  return (
    <div className="app-shell">
      <Sidebar user={user} onUserChange={onUserChange} />
      <section className="main-area">
        <Topbar user={user} onUserChange={onUserChange} />
        <Outlet context={{ user, onUserChange }} />
      </section>
    </div>
  )
}
