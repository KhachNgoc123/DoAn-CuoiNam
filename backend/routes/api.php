<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DoctorNotificationController;
use App\Http\Controllers\Api\HealthMetricController;
use App\Http\Controllers\Api\MedicalRecordAttachmentController;
use App\Http\Controllers\Api\MedicalRecordController;
use App\Http\Controllers\Api\MedicationReminderLogController;
use App\Http\Controllers\Api\MedicationScheduleController;
use App\Http\Controllers\Api\MedicationReactionController;
use App\Http\Controllers\Api\MedicineController;
use App\Http\Controllers\Api\PatientFeedbackController;
use App\Http\Controllers\Api\PrescriptionController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\ForgotPasswordController;
use Illuminate\Support\Facades\Route;
//login-ngoc
Route::post('auth/login', [AuthController::class, 'login']);
//quên mật khẩu

Route::post('auth/forgot-password', [ForgotPasswordController::class, 'forgotPassword']);

Route::post('auth/verify-reset-otp', [ForgotPasswordController::class, 'verifyOtp']);
//dooir mk trong queen mk
Route::post('auth/change-password', [ForgotPasswordController::class, 'resetPassword']);


Route::middleware(['auth:sanctum'])->group(function () { 
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/me', [AuthController::class, 'update']);
    Route::post('auth/logout', [AuthController::class, 'logout']);
    //đổi mật khẩu-ngoc (b1) 
    Route::post('/auth/reset-password',[PasswordResetController::class,'passwordReset']);



    Route::get('dashboard', DashboardController::class);
    Route::get('doctor-notifications', [DoctorNotificationController::class, 'index']);
    Route::post('doctor-notifications/{doctorNotification}/action', [DoctorNotificationController::class, 'action']);

    //hiển thị ds bệnh nhân
    Route::get('patients', [PatientController::class, 'index']);
    //thêm bệnh nhân
    Route::post('patients', [PatientController::class, 'store']);
    //sửa bệnh nhân
    Route::post('patients/{id}', [PatientController::class, 'update']);
    

    Route::get('patient-suggestions', [PatientController::class, 'suggestions']);
    
    Route::get('patients/{patient}', [PatientController::class, 'show']);
  
    Route::post('patients/{patient}/delete', [PatientController::class, 'destroy']);

    Route::get('medical-records', [MedicalRecordController::class, 'index']);
    Route::get('medical-record-suggestions', [MedicalRecordController::class, 'suggestions']);
    Route::post('medical-records', [MedicalRecordController::class, 'store']);
    Route::get('medical-records/{medicalRecord}', [MedicalRecordController::class, 'show']);
    Route::post('medical-records/{medicalRecord}', [MedicalRecordController::class, 'update']);
    Route::post('medical-records/{medicalRecord}/delete', [MedicalRecordController::class, 'destroy']);
    Route::get('medical-records/{medicalRecord}/documents', [MedicalRecordAttachmentController::class, 'index']);
    Route::post('medical-records/{medicalRecord}/documents', [MedicalRecordAttachmentController::class, 'store']);
    Route::get('medical-documents/{attachment}/download', [MedicalRecordAttachmentController::class, 'download']);
    Route::post('medical-documents/{attachment}/delete', [MedicalRecordAttachmentController::class, 'destroy']);

    Route::get('prescriptions', [PrescriptionController::class, 'index']);
    Route::post('prescriptions', [PrescriptionController::class, 'store']);
    Route::get('prescriptions/{prescription}', [PrescriptionController::class, 'show']);
    Route::post('prescriptions/{prescription}', [PrescriptionController::class, 'update']);
    Route::post('prescriptions/{prescription}/delete', [PrescriptionController::class, 'destroy']);

    Route::get('medicine-schedules', [MedicationScheduleController::class, 'index']);
    Route::post('medicine-schedules', [MedicationScheduleController::class, 'store']);
    Route::get('medicine-schedules/{medicationSchedule}', [MedicationScheduleController::class, 'show']);
    Route::post('medicine-schedules/{medicationSchedule}', [MedicationScheduleController::class, 'update']);
    Route::post('medicine-schedules/{medicationSchedule}/delete', [MedicationScheduleController::class, 'destroy']);
    Route::get('medication-reminder-logs', [MedicationReminderLogController::class, 'index']);
    Route::post('medication-reminder-logs', [MedicationReminderLogController::class, 'store']);
    Route::post('medication-reminder-logs/{medicationReminderLog}/status', [MedicationReminderLogController::class, 'updateStatus']);
    Route::get('medication-reactions', [MedicationReactionController::class, 'index']);
    Route::post('medication-reactions', [MedicationReactionController::class, 'store']);
    Route::post('medication-reactions/{medicationReaction}', [MedicationReactionController::class, 'update']);
    Route::post('medication-reactions/{medicationReaction}/delete', [MedicationReactionController::class, 'destroy']);
    Route::get('medicine-categories', [MedicineController::class, 'categories']);
    Route::get('medicines', [MedicineController::class, 'index']);
    Route::post('medicines', [MedicineController::class, 'store']);
    Route::get('medicines/{medicine}', [MedicineController::class, 'show']);
    Route::post('medicines/{medicine}', [MedicineController::class, 'update']);
    Route::post('medicines/{medicine}/delete', [MedicineController::class, 'destroy']);

    Route::get('health-metrics', [HealthMetricController::class, 'index']);
    Route::post('health-metrics', [HealthMetricController::class, 'store']);
    Route::get('health-metrics/patients/{patient}/active-prescriptions', [HealthMetricController::class, 'activePrescriptions']);
    Route::get('health-metrics/{healthMetric}', [HealthMetricController::class, 'show']);
    Route::post('health-metrics/{healthMetric}', [HealthMetricController::class, 'update']);
    Route::post('health-metrics/{healthMetric}/delete', [HealthMetricController::class, 'destroy']);
    Route::get('health-metric-alerts', [HealthMetricController::class, 'alerts']);
    Route::post('health-metric-alerts/{healthMetricAlert}/resolve', [HealthMetricController::class, 'resolveAlert']);
    Route::get('health-types', [HealthMetricController::class, 'types']);
    Route::post('health-types', [HealthMetricController::class, 'storeType']);
    Route::post('health-types/{healthType}', [HealthMetricController::class, 'updateType']);
    Route::post('health-types/{healthType}/delete', [HealthMetricController::class, 'destroyType']);
    Route::get('frequency-types', [MedicationScheduleController::class, 'frequencyTypes']);
    Route::get('meal-times', [MedicationScheduleController::class, 'mealTimes']);
    Route::get('schedule-days', [MedicationScheduleController::class, 'scheduleDays']);

    Route::get('reports/overview', [ReportController::class, 'overview']);
    Route::get('reports/export', [ReportController::class, 'export']);
    Route::get('backups/export', [BackupController::class, 'export']);

    Route::get('patient-feedbacks', [PatientFeedbackController::class, 'index']);
    Route::post('patient-feedbacks', [PatientFeedbackController::class, 'store']);
    Route::post('patient-feedbacks/{patientFeedback}', [PatientFeedbackController::class, 'update']);
    Route::post('patient-feedbacks/{patientFeedback}/delete', [PatientFeedbackController::class, 'destroy']);
});
