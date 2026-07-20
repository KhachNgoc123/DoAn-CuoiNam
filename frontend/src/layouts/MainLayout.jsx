import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function MainLayout({ user, onUserChange }) {
  return (
    <div className="app-shell">
      <Sidebar user={user} onUserChange={onUserChange} />
      <section className="main-area">
        <Header user={user} onUserChange={onUserChange} />
        <Outlet context={{ user, onUserChange }} />
      </section>
    </div>
  )
}
