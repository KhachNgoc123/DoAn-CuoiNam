<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MedicalRecordSymptom extends Model
{
    protected $table = 'medical_record_symptoms';
    protected $primaryKey = 'medical_record_symptom_id';
    public $timestamps = false;
    protected $fillable = ['record_id', 'symptom_id', 'description'];
    protected $appends = ['id'];

    public function getIdAttribute(): int
    {
        return $this->medical_record_symptom_id;
    }

    public function medicalRecord()
    {
        return $this->belongsTo(MedicalRecord::class, 'record_id', 'record_id');
    }
}
