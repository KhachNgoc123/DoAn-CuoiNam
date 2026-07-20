<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MedicationSchedule extends Model
{
    public const ACTIVE_STATUS = 'Đang uống';
    public const COMPLETED_STATUS = 'Đã xong';
    public const PAUSED_STATUS = 'Tạm ngưng';
    public const CANCELLED_STATUS = 'Đã hủy';
    public const ACTIVE_STATUSES = ['Đang uống', 'active'];
    public const COMPLETED_STATUSES = ['Đã xong', 'Hoàn tất', 'Hoàn thành', 'Đã hoàn thành', 'completed'];
    public const PAUSED_STATUSES = ['Tạm ngưng', 'paused'];
    public const CANCELLED_STATUSES = ['Đã hủy', 'cancelled'];
    public const STATUSES = [
        self::ACTIVE_STATUS,
        self::COMPLETED_STATUS,
        self::PAUSED_STATUS,
        self::CANCELLED_STATUS,
        'active',
        'completed',
        'paused',
        'cancelled',
    ];

    protected $table = 'medicine_schedules';
    protected $primaryKey = 'schedule_id';
    protected $fillable = [
        'prescription_detail_id', 'start_date', 'end_date', 'frequency_type_id', 'meal_time_id', 'time_of_day', 'note', 'status',
    ];
    protected $appends = ['id'];
    public function getIdAttribute(): int { return $this->schedule_id; }
    protected $casts = ['start_date' => 'date', 'end_date' => 'date'];

    public static function normalizeStatus(?string $status): string
    {
        return match ($status) {
            'active', '1', 'true', null, '' => self::ACTIVE_STATUS,
            'completed', 'Hoàn tất', 'Hoàn thành', 'Đã hoàn thành' => self::COMPLETED_STATUS,
            'paused' => self::PAUSED_STATUS,
            'cancelled', '0', 'false' => self::CANCELLED_STATUS,
            default => $status,
        };
    }

    public function isActive(): bool
    {
        return in_array(self::normalizeStatus($this->status), self::ACTIVE_STATUSES, true);
    }

    public function isCancelled(): bool
    {
        return in_array(self::normalizeStatus($this->status), self::CANCELLED_STATUSES, true);
    }

    public function prescriptionDetail()
    {
        return $this->belongsTo(PrescriptionItem::class, 'prescription_detail_id', 'prescription_detail_id');
    }

    public function times()
    {
        return $this->hasMany(ScheduleTime::class, 'schedule_id', 'schedule_id');
    }

    public function frequencyType()
    {
        return $this->belongsTo(FrequencyType::class, 'frequency_type_id', 'frequency_type_id');
    }

    public function mealTime()
    {
        return $this->belongsTo(MealTime::class, 'meal_time_id', 'meal_time_id');
    }

    public function reminderLogs()
    {
        return $this->hasMany(MedicationReminderLog::class, 'schedule_id', 'schedule_id')
            ->latest('reminder_date')
            ->latest('reminder_time');
    }

}
