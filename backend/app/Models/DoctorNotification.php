<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DoctorNotification extends Model
{
    public const PENDING_STATUS = 'pending';
    public const SENT_STATUS = 'sent';
    public const MISSED_STATUS = 'missed';
    public const SNOOZED_STATUS = 'snoozed';
    public const DISMISSED_STATUS = 'dismissed';

    public const STATUSES = [
        self::PENDING_STATUS,
        self::SENT_STATUS,
        self::MISSED_STATUS,
        self::SNOOZED_STATUS,
        self::DISMISSED_STATUS,
    ];

    protected $table = 'doctor_notifications';
    protected $primaryKey = 'notification_id';
    protected $fillable = [
        'doctor_id',
        'patient_id',
        'schedule_id',
        'schedule_time_id',
        'notification_date',
        'notification_time',
        'title',
        'message',
        'status',
        'snoozed_until',
        'sent_at',
        'dismissed_at',
    ];
    protected $casts = [
        'notification_date' => 'date',
        'snoozed_until' => 'datetime',
        'sent_at' => 'datetime',
        'dismissed_at' => 'datetime',
    ];
    protected $appends = ['id'];

    public function getIdAttribute(): int
    {
        return $this->notification_id;
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id', 'doctor_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }

    public function schedule()
    {
        return $this->belongsTo(MedicationSchedule::class, 'schedule_id', 'schedule_id');
    }

    public function scheduleTime()
    {
        return $this->belongsTo(ScheduleTime::class, 'schedule_time_id', 'schedule_time_id');
    }
}
