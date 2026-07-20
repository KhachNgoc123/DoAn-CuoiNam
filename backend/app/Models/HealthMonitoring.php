<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HealthMonitoring extends Model
{
    protected $table = 'health_monitorings';
    protected $primaryKey = 'health_monitoring_id';
    public const CREATED_AT = 'created_at';
    public const UPDATED_AT = null;
    protected $fillable = ['record_id', 'measured_at', 'note'];
    protected $appends = ['id'];
    protected $casts = ['measured_at' => 'datetime'];

    public function getIdAttribute(): int
    {
        return $this->health_monitoring_id;
    }

    public function medicalRecord()
    {
        return $this->belongsTo(MedicalRecord::class, 'record_id', 'record_id');
    }

    public function metrics()
    {
        return $this->hasMany(HealthMetric::class, 'health_monitoring_id', 'health_monitoring_id');
    }
}
