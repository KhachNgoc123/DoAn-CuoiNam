import { Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import LoadingState from "../components/common/Loading/Loading";

export default function ProtectedRoute({ user, onUserChange, authChecking }) {
  if (authChecking) return <LoadingState label="Đang kiểm tra đăng nhập..." />
  if (!user) return <Navigate to="/login" replace />
  return <MainLayout user={user} onUserChange={onUserChange} />
}
