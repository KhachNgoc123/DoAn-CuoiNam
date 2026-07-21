/**
 * ?i?m kh?i ??ng React, g?n App v?o #root v? b?c BrowserRouter cho to?n b? route.
 */

import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// Điểm khởi động frontend: BrowserRouter xử lý toàn bộ URL trong AppRoutes.
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
