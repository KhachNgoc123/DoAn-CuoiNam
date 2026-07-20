<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PatientChronicDisease extends Model
{
    protected $table = 'patient_chronic_diseases';
    protected $primaryKey = 'id';
    protected $fillable = ['patient_id', 'chronic_disease_id'];

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }

    public function chronicDisease()
    {
        return $this->belongsTo(ChronicDisease::class, 'chronic_disease_id', 'chronic_disease_id');
    }
}
