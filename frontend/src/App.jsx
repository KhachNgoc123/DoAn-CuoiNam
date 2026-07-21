/**
 * Component gốc của frontend, chuyển quyền điều hướng cho AppRoutes.
 */

import AppRoutes from './routes/AppRoutes'

/**
 * Hiển thị component App trong giao diện frontend.
 */
function App() {
  // App chỉ giữ nhiệm vụ nối vào router chính, layout/page nằm trong AppRoutes.
  return <AppRoutes />
}

export default App
