<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ScheduleTime extends Model
{
    protected $table = 'schedule_times';
    protected $primaryKey = 'schedule_time_id';
    public $timestamps = false;
    protected $fillable = ['schedule_id', 'time_take'];
    protected $appends = ['id'];
    public function getIdAttribute(): int { return $this->schedule_time_id; }

    public function schedule()
    {
        return $this->belongsTo(MedicationSchedule::class, 'schedule_id', 'schedule_id');
    }
}
