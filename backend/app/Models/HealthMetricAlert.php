<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HealthMetricAlert extends Model
{
    public const OPEN_STATUS = 'open';
    public const RESOLVED_STATUS = 'resolved';

    protected $table = 'health_metric_alerts';
    protected $fillable = [
        'health_metric_id',
        'patient_id',
        'doctor_id',
        'health_type_id',
        'alert_time',
        'metric_value',
        'min_value',
        'max_value',
        'severity',
        'status',
        'message',
        'resolved_at',
    ];
    protected $casts = [
        'alert_time' => 'datetime',
        'metric_value' => 'decimal:2',
        'min_value' => 'decimal:2',
        'max_value' => 'decimal:2',
        'resolved_at' => 'datetime',
    ];

    public function metric()
    {
        return $this->belongsTo(HealthMetric::class, 'health_metric_id', 'health_metric_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id', 'doctor_id');
    }

    public function healthType()
    {
        return $this->belongsTo(HealthType::class, 'health_type_id', 'health_type_id');
    }
}
