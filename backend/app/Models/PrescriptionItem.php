<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PrescriptionItem extends Model
{
    protected $table = 'prescription_details';
    protected $primaryKey = 'prescription_detail_id';
    protected $fillable = ['prescription_id', 'medicine_id', 'dosage', 'frequency_type_id', 'meal_time_id', 'quantity', 'instructions', 'note'];
    protected $appends = ['id'];
    public function getIdAttribute(): int { return $this->prescription_detail_id; }

    public function prescription()
    {
        return $this->belongsTo(Prescription::class, 'prescription_id', 'prescription_id');
    }

    public function medicine()
    {
        return $this->belongsTo(Medicine::class, 'medicine_id', 'medicine_id');
    }

    public function frequencyType()
    {
        return $this->belongsTo(FrequencyType::class, 'frequency_type_id', 'frequency_type_id');
    }

    public function mealTime()
    {
        return $this->belongsTo(MealTime::class, 'meal_time_id', 'meal_time_id');
    }

    public function schedules()
    {
        return $this->hasMany(MedicationSchedule::class, 'prescription_detail_id', 'prescription_detail_id')
            ->distinct();
    }
}
