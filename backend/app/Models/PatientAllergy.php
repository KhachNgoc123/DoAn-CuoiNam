<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PatientAllergy extends Model
{
    protected $table = 'patient_allergies';
    protected $primaryKey = 'patient_allergy_id';
    public $timestamps = false;
    protected $fillable = ['patient_id', 'allergy_id'];

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }

    public function allergy()
    {
        return $this->belongsTo(Allergy::class, 'allergy_id', 'allergy_id');
    }
}
