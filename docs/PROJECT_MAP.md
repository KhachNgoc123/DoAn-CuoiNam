# Bản Đồ Project Và Đường Dẫn Chủ Chốt

Tài liệu này dùng để tra nhanh project khi bảo trì, demo đồ án hoặc sửa lỗi. Nội dung chỉ mô tả cấu trúc hiện tại, không thay đổi nghiệp vụ.

## 1. Tổng Quan

| Khu vực | Đường dẫn | Vai trò |
|---|---|---|
| Frontend | `frontend/` | Giao diện React + Vite cho bác sĩ |
| Backend | `backend/` | Laravel REST API |
| Database SQL | `healthcare_managament.sql` | Dữ liệu/schema tham chiếu |
| Tài liệu chính | `README.md` | Cách chạy và module tổng quan |

## 2. Frontend

### File khởi động

| File | Vai trò |
|---|---|
| `frontend/index.html` | HTML shell của Vite |
| `frontend/src/main.jsx` | Gắn React vào `#root`, bọc `BrowserRouter` |
| `frontend/src/App.jsx` | Render `AppRoutes` |
| `frontend/src/routes/AppRoutes.jsx` | Khai báo toàn bộ route frontend và bảo vệ route đăng nhập |
| `frontend/src/routes/ResourceRouteViews.jsx` | Route trung gian cho tạo/sửa đơn thuốc và lịch uống thuốc |

### Layout

| File | Vai trò |
|---|---|
| `frontend/src/components/layout/AdminLayout.jsx` | Khung chính sau đăng nhập |
| `frontend/src/components/layout/Sidebar.jsx` | Menu trái |
| `frontend/src/components/layout/Topbar.jsx` | Thanh trên cùng |
| `frontend/src/components/layout/menuItems.jsx` | Cấu hình các mục menu sidebar |

### API client và service

| File | Vai trò |
|---|---|
| `frontend/src/api/client.js` | Axios instance, base URL, token, xử lý lỗi 401 |
| `frontend/src/api/authApi.js` | Đăng nhập, quên mật khẩu, OTP, hồ sơ bác sĩ |
| `frontend/src/api/resources.js` | CRUD dùng chung cho nhiều resource |
| `frontend/src/api/patientApi.js` | API bệnh nhân |
| `frontend/src/api/medicalRecordApi.js` | API hồ sơ bệnh án |
| `frontend/src/api/provincesApi.js` | API tỉnh/thành nếu form cần chọn địa chỉ |
| `frontend/src/api/useResourceList.js` | Hook tải danh sách resource |

### Pages chính

| URL | Page | File |
|---|---|---|
| `/login` | Đăng nhập/quên mật khẩu | `frontend/src/pages/auth/LoginPage.jsx` |
| `/` | Dashboard | `frontend/src/pages/dashboard/DashboardPage.jsx` |
| `/patients` | Danh sách bệnh nhân | `frontend/src/pages/patients/PatientsPage.jsx` |
| `/patients/:id` | Chi tiết bệnh nhân | `frontend/src/pages/patients/PatientDetailPage.jsx` |
| `/medical-records` | Danh sách hồ sơ bệnh án | `frontend/src/pages/medical-records/MedicalRecordsPage.jsx` |
| `/medical-records/:id` | Chi tiết hồ sơ bệnh án | `frontend/src/pages/medical-records/MedicalRecordDetailPage.jsx` |
| `/prescriptions` | Danh sách đơn thuốc | `frontend/src/pages/prescriptions/PrescriptionsPage.jsx` |
| `/prescriptions/create` | Tạo đơn thuốc | `frontend/src/pages/prescriptions/PrescriptionFormPage.jsx` |
| `/prescriptions/:id/edit` | Sửa đơn thuốc | `frontend/src/pages/prescriptions/PrescriptionFormPage.jsx` |
| `/prescriptions/:id` | Chi tiết đơn thuốc | `frontend/src/pages/prescriptions/PrescriptionsPage.jsx` |
| `/medicines` | Quản lý thuốc | `frontend/src/pages/medicines/MedicinesPage.jsx` |
| `/schedules` | Danh sách lịch uống thuốc | `frontend/src/pages/schedules/MedicationSchedulesPage.jsx` |
| `/schedules/create` | Tạo lịch uống thuốc | `frontend/src/pages/schedules/MedicationScheduleFormPage.jsx` |
| `/schedules/:id` | Chi tiết lịch uống thuốc | `frontend/src/pages/schedules/MedicationScheduleDetailPage.jsx` |
| `/schedules/:id/edit` | Sửa lịch uống thuốc | `frontend/src/pages/schedules/MedicationScheduleFormPage.jsx` |
| `/health-metrics` | Theo dõi sức khỏe | `frontend/src/pages/health/HealthMetricsPage.jsx` |
| `/patient-feedbacks` | Phản hồi bệnh nhân | `frontend/src/pages/feedbacks/PatientFeedbacksPage.jsx` |
| `/accounts` | Hồ sơ bác sĩ | `frontend/src/pages/account/AccountsPage.jsx` |

### Components theo module

| Thư mục | Vai trò |
|---|---|
| `frontend/src/components/auth/` | Form đăng nhập, OTP, quên mật khẩu |
| `frontend/src/components/patients/` | Form, tìm kiếm, danh sách bệnh nhân |
| `frontend/src/components/medical-records/` | Form, bảng, thẻ chi tiết hồ sơ bệnh án |
| `frontend/src/components/prescriptions/` | Danh sách và form đơn thuốc |
| `frontend/src/components/schedules/` | Danh sách và form lịch uống thuốc |
| `frontend/src/components/medicines/` | Giao diện quản lý thuốc |
| `frontend/src/components/feedbacks/` | Giao diện phản hồi bệnh nhân |
| `frontend/src/components/accounts/` | Hồ sơ bác sĩ, avatar, đổi mật khẩu |
| `frontend/src/components/ui/` | Component dùng chung: table, toast, loading, empty state, dialog |

### Styles

| File | Phạm vi |
|---|---|
| `frontend/src/index.css` | Import CSS nền và module |
| `frontend/src/styles/variables.css` | Biến màu, font, radius, shadow |
| `frontend/src/styles/global.css` | CSS toàn cục |
| `frontend/src/styles/layout.css` | Shell, sidebar, topbar |
| `frontend/src/styles/components.css` | Component dùng chung |
| `frontend/src/styles/dashboard.css` | Dashboard |
| `frontend/src/styles/patients.css` | Bệnh nhân |
| `frontend/src/styles/medical-record.css` | Hồ sơ bệnh án |
| `frontend/src/styles/prescription.css` | Đơn thuốc |
| `frontend/src/styles/schedule.css` | Lịch uống thuốc |
| `frontend/src/styles/health.css` | Theo dõi sức khỏe |
| `frontend/src/styles/account.css` | Tài khoản bác sĩ |
| `frontend/src/styles/login.css` | Đăng nhập/quên mật khẩu |
| `frontend/src/styles/overrides.css` | Override cuối để sửa xung đột giao diện |

## 3. Backend

### File đầu mối

| File | Vai trò |
|---|---|
| `backend/routes/api.php` | Toàn bộ API REST dùng bởi frontend |
| `backend/routes/web.php` | Route web mặc định |
| `backend/bootstrap/app.php` | Cấu hình route, middleware alias, scheduler |
| `backend/config/sanctum.php` | Cấu hình Laravel Sanctum |
| `backend/config/database.php` | Kết nối database |

### Controller chính

| Controller | Module |
|---|---|
| `backend/app/Http/Controllers/Api/AuthController.php` | Đăng nhập, hồ sơ bác sĩ, logout |
| `backend/app/Http/Controllers/ForgotPasswordController.php` | Quên mật khẩu, OTP |
| `backend/app/Http/Controllers/PasswordResetController.php` | Đổi mật khẩu trong tài khoản |
| `backend/app/Http/Controllers/PatientController.php` | Bệnh nhân |
| `backend/app/Http/Controllers/Api/MedicalRecordController.php` | Hồ sơ bệnh án |
| `backend/app/Http/Controllers/Api/PrescriptionController.php` | Đơn thuốc |
| `backend/app/Http/Controllers/Api/MedicationScheduleController.php` | Lịch uống thuốc |
| `backend/app/Http/Controllers/Api/MedicationReminderLogController.php` | Log nhắc/uống thuốc |
| `backend/app/Http/Controllers/Api/MedicineController.php` | Thuốc |
| `backend/app/Http/Controllers/Api/HealthMetricController.php` | Theo dõi sức khỏe |
| `backend/app/Http/Controllers/Api/DashboardController.php` | Dashboard |
| `backend/app/Http/Controllers/Api/ReportController.php` | Báo cáo |
| `backend/app/Http/Controllers/Api/PatientFeedbackController.php` | Phản hồi |

### Service chính

| Service | Vai trò |
|---|---|
| `backend/app/Services/DoctorToken.php` | Xử lý token bác sĩ |
| `backend/app/Services/DoctorRecordScope.php` | Giới hạn dữ liệu theo bác sĩ |
| `backend/app/Services/PatientService.php` | Logic bệnh nhân |
| `backend/app/Services/ForgotPasswordService.php` | Luồng quên mật khẩu |
| `backend/app/Services/PasswordResetService.php` | Đổi mật khẩu |
| `backend/app/Services/MedicationNotificationGenerator.php` | Sinh thông báo nhắc thuốc |
| `backend/app/Services/SmsNotifier.php` | Gửi thông báo SMS nếu được cấu hình |

## 4. Backend API

Base URL frontend đang dùng: `VITE_API_URL` hoặc mặc định `http://localhost:8000/api`.

### Public API

| Method | Endpoint | Controller |
|---|---|---|
| POST | `/api/auth/login` | `AuthController@login` |
| POST | `/api/auth/forgot-password` | `ForgotPasswordController@forgotPassword` |
| POST | `/api/auth/verify-reset-otp` | `ForgotPasswordController@verifyOtp` |
| POST | `/api/auth/change-password` | `ForgotPasswordController@resetPassword` |

### API cần đăng nhập

| Module | Endpoint chính |
|---|---|
| Tài khoản | `/api/auth/me`, `/api/auth/logout`, `/api/auth/reset-password` |
| Dashboard | `/api/dashboard` |
| Bệnh nhân | `/api/patients`, `/api/patients/{id}`, `/api/patients/{id}/delete`, `/api/patient-suggestions` |
| Hồ sơ bệnh án | `/api/medical-records`, `/api/medical-records/{id}`, `/api/medical-record-suggestions` |
| Tài liệu bệnh án | `/api/medical-records/{id}/documents`, `/api/medical-documents/{id}/download` |
| Đơn thuốc | `/api/prescriptions`, `/api/prescriptions/{id}`, `/api/prescriptions/{id}/delete` |
| Lịch uống thuốc | `/api/medicine-schedules`, `/api/medicine-schedules/{id}`, `/api/medicine-schedules/{id}/delete` |
| Log nhắc thuốc | `/api/medication-reminder-logs`, `/api/medication-reminder-logs/{id}/status` |
| Thuốc | `/api/medicines`, `/api/medicine-categories` |
| Theo dõi sức khỏe | `/api/health-metrics`, `/api/health-types`, `/api/health-metric-alerts` |
| Báo cáo | `/api/reports/overview`, `/api/reports/export` |
| Backup | `/api/backups/export` |
| Phản hồi | `/api/patient-feedbacks`, `/api/patient-feedbacks/{id}/delete` |

## 5. Luồng Chạy Chính

### Frontend

`index.html` → `src/main.jsx` → `BrowserRouter` → `App.jsx` → `AppRoutes.jsx` → `AdminLayout.jsx` → Page → Component con → API.

### Auth

1. Người dùng vào `/login`.
2. `LoginPage.jsx` gọi `authApi.login()`.
3. Token lưu bằng key `doctor_health_token`.
4. User lưu bằng key `doctor_health_user`.
5. `AppRoutes.jsx` kiểm tra token/user trước khi cho vào route bảo vệ.
6. `api/client.js` tự gắn token vào `Authorization: Bearer ...`.
7. Nếu API trả `401`, frontend xóa session và quay về `/login`.

### Backend

`public/index.php` → `bootstrap/app.php` → `routes/api.php` → Middleware Sanctum → Controller → Service/Model → Database → JSON response.

## 6. Ghi Chú Bảo Trì

- Khi đổi URL frontend, kiểm tra `frontend/src/routes/AppRoutes.jsx` và `frontend/src/components/layout/menuItems.jsx`.
- Khi đổi endpoint backend, kiểm tra đồng thời `backend/routes/api.php` và các file trong `frontend/src/api/`.
- Khi sửa giao diện, ưu tiên sửa CSS module tương ứng trong `frontend/src/styles/`, chỉ dùng `overrides.css` cho lỗi xung đột cuối cùng.
- Khi sửa database, kiểm tra migration, model, controller và response frontend trước.
- Không đổi key localStorage `doctor_health_token` và `doctor_health_user` nếu chưa cập nhật toàn bộ auth flow.
