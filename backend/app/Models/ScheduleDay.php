<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ScheduleDay extends Model
{
    protected $table = 'schedule_days';
    protected $primaryKey = 'schedule_day_id';
    protected $fillable = ['day_name'];
    protected $appends = ['id'];

    public function getIdAttribute(): int
    {
        return $this->schedule_day_id;
    }
}
