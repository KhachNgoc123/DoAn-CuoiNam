<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MealTime extends Model
{
    protected $table = 'meal_times';
    protected $primaryKey = 'meal_time_id';
    protected $fillable = ['meal_time_name', 'description'];
    protected $appends = ['id'];

    public function getIdAttribute(): int
    {
        return $this->meal_time_id;
    }
}
