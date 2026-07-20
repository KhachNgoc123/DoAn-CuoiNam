<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MedicationReaction extends Model
{
    protected $table = 'medication_reactions';
    protected $fillable = [
        'patient_id',
        'doctor_id',
        'schedule_id',
        'reminder_log_id',
        'reaction_time',
        'reaction_type',
        'severity',
        'description',
        'action_taken',
    ];
    protected $casts = [
        'reaction_time' => 'datetime',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id', 'doctor_id');
    }

    public function schedule()
    {
        return $this->belongsTo(MedicationSchedule::class, 'schedule_id', 'schedule_id');
    }

    public function reminderLog()
    {
        return $this->belongsTo(MedicationReminderLog::class, 'reminder_log_id');
    }
}
