<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Patient extends Model
{
    protected $table = 'patients';
    protected $primaryKey = 'patient_id';
    protected $fillable = ['full_name', 'gender', 'date_of_birth', 'phone', 'email', 'address'];
    protected $appends = ['id'];
    public function getIdAttribute(): int { return $this->patient_id; }

    protected $casts = ['date_of_birth' => 'date', 'weight' => 'decimal:2', 'height' => 'decimal:2'];

    public function medicalRecords()
    {
        return $this->hasMany(MedicalRecord::class, 'patient_id', 'patient_id')->latest('visit_date');
    }

    public function prescriptions()
    {
        return $this->hasManyThrough(Prescription::class, MedicalRecord::class, 'patient_id', 'record_id', 'patient_id', 'record_id');
    }

    public function healthMetrics()
    {
        return $this->hasMany(HealthMetric::class, 'patient_id', 'patient_id')->latest('measure_time');
    }

    public function allergies()
    {
        return $this->belongsToMany(Allergy::class, 'patient_allergies', 'patient_id', 'allergy_id');
    }

    public function chronicDiseases()
    {
        return $this->belongsToMany(ChronicDisease::class, 'patient_chronic_diseases', 'patient_id', 'chronic_disease_id');
    }
}
