<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Prescription extends Model
{
    public const ACTIVE_STATUS = 'Đang sử dụng';
    public const LEGACY_ACTIVE_STATUS = 'Đang dùng';
    public const COMPLETED_STATUS = 'Đã xong';
    public const LEGACY_COMPLETED_STATUS = 'Hoàn tất';
    public const CANCELLED_STATUS = 'Đã hủy';
    public const REPLACED_STATUS = 'Đã thay thế';
    public const STOPPED_STATUS = 'Ngừng';
    public const ACTIVE_STATUSES = ['Đang sử dụng', 'Đang dùng', 'active'];
    public const COMPLETED_STATUSES = ['Đã xong', 'Hoàn tất', 'Hoàn thành', 'Đã hoàn thành', 'completed'];
    public const INACTIVE_STATUSES = ['Đã thay thế', 'Ngừng', 'Đã hủy', 'cancelled'];

    protected $table = 'prescriptions';
    protected $primaryKey = 'prescription_id';
    public const CREATED_AT = 'created_at';
    public const UPDATED_AT = 'updated_at';
    protected $fillable = ['record_id', 'prescription_date', 'start_date', 'end_date', 'duration_days', 'note', 'edit_reason', 'status'];
    protected $appends = ['id'];
    protected $casts = ['prescription_date' => 'date', 'start_date' => 'date', 'end_date' => 'date'];

    public function getIdAttribute(): int
    {
        return $this->prescription_id;
    }

    public static function normalizeStatus(?string $status): string
    {
        return match ($status) {
            'active', null, '' => self::ACTIVE_STATUS,
            'completed', self::LEGACY_COMPLETED_STATUS, 'Hoàn thành', 'Đã hoàn thành' => self::COMPLETED_STATUS,
            'cancelled' => self::CANCELLED_STATUS,
            'replaced' => self::REPLACED_STATUS,
            'stopped' => self::STOPPED_STATUS,
            self::LEGACY_ACTIVE_STATUS => self::ACTIVE_STATUS,
            default => $status,
        };
    }

    public function isActive(): bool
    {
        return in_array(self::normalizeStatus($this->status), self::ACTIVE_STATUSES, true);
    }

    public function medicalRecord()
    {
        return $this->belongsTo(MedicalRecord::class, 'record_id', 'record_id');
    }

    public function details()
    {
        return $this->hasMany(PrescriptionItem::class, 'prescription_id', 'prescription_id');
    }
}
