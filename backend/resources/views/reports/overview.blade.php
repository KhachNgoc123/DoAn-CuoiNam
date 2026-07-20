<!doctype html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Be Vietnam Pro', Arial, sans-serif; font-size: 13px; color: #111827; }
        h1 { font-size: 20px; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; margin-top: 18px; }
        th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        th { background: #f3f4f6; }
    </style>
</head>
<body>
    <h1>Báo cáo y tế</h1>
    <div>Từ ngày: {{ $report['from_date'] }} - Đến ngày: {{ $report['to_date'] }}</div>
    <div>Thời gian tạo: {{ $report['generated_at'] }}</div>

    <table>
        <thead>
            <tr>
                <th>Chỉ tiêu</th>
                <th>Giá trị</th>
            </tr>
        </thead>
        <tbody>
            <tr><td>Tổng bệnh nhân</td><td>{{ $report['total_patients'] }}</td></tr>
            <tr><td>Hồ sơ bệnh án</td><td>{{ $report['total_medical_records'] }}</td></tr>
            <tr><td>Toa thuốc</td><td>{{ $report['total_prescriptions'] }}</td></tr>
            <tr><td>Lịch uống thuốc</td><td>{{ $report['total_medication_schedules'] }}</td></tr>
            <tr><td>Đã nhắc uống thuốc</td><td>{{ $report['medication_reminders_sent'] }}</td></tr>
            <tr><td>Đã uống</td><td>{{ $report['medication_reminders_taken'] }}</td></tr>
            <tr><td>Bỏ lỡ</td><td>{{ $report['medication_reminders_missed'] }}</td></tr>
            <tr><td>Cảnh báo sức khỏe đang mở</td><td>{{ $report['open_health_alerts'] }}</td></tr>
            <tr><td>Phản ứng sau dùng thuốc</td><td>{{ $report['medication_reactions'] }}</td></tr>
        </tbody>
    </table>
</body>
</html>
