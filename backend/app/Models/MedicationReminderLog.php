<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MedicationReminderLog extends Model
{
    public const REMINDED_STATUS = 'Đã nhắc';
    public const TAKEN_STATUS = 'Đã uống';
    public const MISSED_STATUS = 'Bỏ lỡ';
    public const STATUSES = [
        self::REMINDED_STATUS,
        self::TAKEN_STATUS,
        self::MISSED_STATUS,
    ];

    protected $table = 'medication_reminder_logs';
    public $timestamps = false;
    protected $fillable = [
        'schedule_id',
        'schedule_time_id',
        'patient_id',
        'doctor_id',
        'reminder_date',
        'reminder_time',
        'reminded_at',
        'taken_at',
        'missed_at',
        'status',
        'note',
    ];
    protected $casts = [
        'reminder_date' => 'date',
        'reminded_at' => 'datetime',
        'taken_at' => 'datetime',
        'missed_at' => 'datetime',
    ];
    protected $appends = ['row_id'];

    public function getRowIdAttribute(): string
    {
        $timeKey = $this->schedule_time_id ?: ($this->reminder_time ?: 'time');

        return "{$this->reminder_date?->toDateString()}-{$this->schedule_id}-{$timeKey}";
    }

    public function schedule()
    {
        return $this->belongsTo(MedicationSchedule::class, 'schedule_id', 'schedule_id');
    }

    public function scheduleTime()
    {
        return $this->belongsTo(ScheduleTime::class, 'schedule_time_id', 'schedule_time_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id', 'doctor_id');
    }
}
