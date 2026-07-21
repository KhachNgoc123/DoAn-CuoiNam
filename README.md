# Clinic Doctor Web

Hệ thống quản trị dành cho bác sĩ, gồm:

- `frontend/`: React + Vite.
- `backend/`: Laravel REST API.
- `healthcare_managament.sql`: file database MySQL tham chiếu.

## Chạy ứng dụng

Backend:

```powershell
cd backend
php artisan serve
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

## Đường dẫn quan trọng

- Frontend entry: `frontend/src/main.jsx`
- Frontend router: `frontend/src/routes/AppRoutes.jsx`
- Frontend layout: `frontend/src/components/layout/AdminLayout.jsx`
- Frontend API client: `frontend/src/api/client.js`
- Backend API routes: `backend/routes/api.php`
- Backend scheduler/middleware: `backend/bootstrap/app.php`
- Tài liệu bản đồ project: `docs/PROJECT_MAP.md`

## Module hiện có

- Đăng nhập, đăng xuất, quên mật khẩu và OTP.
- Dashboard tổng quan.
- Quản lý bệnh nhân.
- Hồ sơ bệnh án và tài liệu đính kèm.
- Thuốc và đơn thuốc.
- Lịch uống thuốc và nhắc thuốc.
- Theo dõi sức khỏe.
- Phản hồi bệnh nhân.
- Hồ sơ/tài khoản bác sĩ.
- Báo cáo, xuất Excel/PDF theo phần đang hỗ trợ.

## Database

Ứng dụng dùng database MySQL `clinic_db`. Backend đang ánh xạ trực tiếp theo các bảng/cột hiện có, vì vậy cần kiểm tra migration và model trước khi đổi cấu trúc dữ liệu.

Các bảng nghiệp vụ chính:

- `doctor`
- `patient`
- `medical_records`
- `medical_document`
- `prescriptions`
- `prescription_details`
- `medicines`
- `medicine_schedules`
- `schedule_times`
- `schedule_days`
- `frequency_type`
- `meal_times`
- `health_types`
- `health_metrics`

Không tự ý chạy migration/seeder trên database thật nếu chưa sao lưu dữ liệu.
