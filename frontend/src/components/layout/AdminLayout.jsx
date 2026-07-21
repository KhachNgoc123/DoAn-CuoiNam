/**
 * File thuộc nhóm components, chứa các khối giao diện tái sử dụng hoặc giao diện theo từng chức năng.
 */

import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

/**
 * Hiển thị component AdminLayout trong giao diện frontend.
 * @param {Object} props Dữ liệu và hàm xử lý truyền từ component cha.
 * @param {*} props.user Giá trị user được dùng để render hoặc xử lý tương tác.
 * @param {*} props.onUserChange Giá trị onUserChange được dùng để render hoặc xử lý tương tác.
 */
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
