<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HealthMetric extends Model
{
    protected $table = 'health_metrics';
    protected $primaryKey = 'health_metric_id';
    protected $fillable = ['health_monitoring_id', 'patient_id', 'health_type_id', 'measure_time', 'value', 'metric_value', 'note'];
    protected $appends = ['id'];
    public function getIdAttribute(): int { return $this->health_metric_id; }
    protected $casts = ['measure_time' => 'datetime'];

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }

    public function healthType()
    {
        return $this->belongsTo(HealthType::class, 'health_type_id', 'health_type_id');
    }

    public function monitoring()
    {
        return $this->belongsTo(HealthMonitoring::class, 'health_monitoring_id', 'health_monitoring_id');
    }

    public function alerts()
    {
        return $this->hasMany(HealthMetricAlert::class, 'health_metric_id', 'health_metric_id');
    }
}
