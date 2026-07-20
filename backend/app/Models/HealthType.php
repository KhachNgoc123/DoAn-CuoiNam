<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HealthType extends Model
{
    protected $table = 'health_types';
    protected $primaryKey = 'health_type_id';
    protected $fillable = ['health_type_name', 'unit', 'min_value', 'max_value', 'is_active', 'note'];
    protected $appends = ['id'];
    protected $casts = [
        'min_value' => 'decimal:2',
        'max_value' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function getIdAttribute(): int { return $this->health_type_id; }

    public function metrics()
    {
        return $this->hasMany(HealthMetric::class, 'health_type_id', 'health_type_id');
    }
}
