<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MedicalRecord extends Model
{
    public const DEFAULT_STATUS = 'Đang điều trị';
    public const PRESCRIBED_STATUS = 'Đang điều trị';
    public const COMPLETED_STATUS = 'Đã hoàn thành';
    public const IN_TREATMENT_STATUSES = ['Đang điều trị', 'dang_dieu_tri'];
    public const COMPLETED_STATUSES = ['Đã hoàn thành', 'Đã điều trị xong', 'da_hoan_thanh', 'da_dieu_tri_xong'];
    public const LEGACY_IN_TREATMENT_STATUSES = ['Đang theo dõi', 'Đã kê đơn', 'Đang khám'];
    public const LEGACY_COMPLETED_STATUSES = ['Đã khám', 'Đã khỏi', 'Hoàn tất', 'da_khoi'];

    protected $table = 'medical_records';
    protected $primaryKey = 'record_id';
    protected $fillable = ['patient_id', 'doctor_id', 'diagnosis_id', 'visit_date', 'chief_complaint', 'symptoms', 'diagnosis', 'medical_history', 'allergy', 'treatment_plan', 'doctor_note', 'next_visit_date', 'note', 'status'];
    protected $appends = ['id'];
    public function getIdAttribute(): int { return $this->record_id; }

    protected $casts = ['visit_date' => 'date', 'next_visit_date' => 'date'];

    public function isInTreatment(): bool
    {
        return self::normalizeStatus($this->status) === self::DEFAULT_STATUS;
    }

    public static function activeStatusValues(): array
    {
        return array_merge(self::IN_TREATMENT_STATUSES, self::LEGACY_IN_TREATMENT_STATUSES, ['active']);
    }

    public static function normalizeStatus(?string $status): string
    {
        if ($status === 'active') {
            return self::DEFAULT_STATUS;
        }

        if ($status === 'completed') {
            return self::COMPLETED_STATUS;
        }

        if ($status === null || $status === '' || in_array($status, self::IN_TREATMENT_STATUSES, true) || in_array($status, self::LEGACY_IN_TREATMENT_STATUSES, true)) {
            return self::DEFAULT_STATUS;
        }

        if (in_array($status, self::COMPLETED_STATUSES, true) || in_array($status, self::LEGACY_COMPLETED_STATUSES, true)) {
            return self::COMPLETED_STATUS;
        }

        return $status;
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id', 'doctor_id');
    }

    public function documents()
    {
        return $this->hasMany(MedicalRecordAttachment::class, 'record_id', 'record_id');
    }

    public function prescriptions()
    {
        return $this->hasMany(Prescription::class, 'record_id', 'record_id');
    }

    public function diagnosisInfo()
    {
        return $this->belongsTo(Diagnosis::class, 'diagnosis_id', 'diagnosis_id');
    }

    public function symptomDetails()
    {
        return $this->hasMany(MedicalRecordSymptom::class, 'record_id', 'record_id');
    }

    public function healthMonitorings()
    {
        return $this->hasMany(HealthMonitoring::class, 'record_id', 'record_id')->latest('measured_at');
    }
}
