# Clinic Doctor Web

Hệ thống quản trị dành cho bác sĩ, gồm Laravel REST API và React + Vite.

## Database

Ứng dụng chỉ sử dụng database MySQL có sẵn: `clinic_db`.

Các bảng đang được ánh xạ:

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

Không chạy migration hoặc seeder để thay đổi dữ liệu `clinic_db`. Backend sử dụng trực tiếp tên bảng, cột, khóa chính và khóa ngoại hiện hữu.

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

## Module hiện có

- Danh sách và hồ sơ bệnh nhân theo bác sĩ điều trị
- Hồ sơ bệnh án và tài liệu đính kèm
- Toa thuốc và chi tiết thuốc
- Lịch uống thuốc theo tần suất, bữa ăn, ngày trong tuần và giờ uống
- Chỉ số sức khỏe
- Tài khoản bác sĩ

Không có module tủ thuốc bệnh nhân hoặc phân công ca riêng vì `clinic_db` không có các bảng tương ứng. Tồn kho thuốc được đọc từ `medicines.quantity`.
