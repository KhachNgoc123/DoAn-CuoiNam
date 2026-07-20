<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Diagnosis extends Model
{
    protected $table = 'diagnoses';
    protected $primaryKey = 'diagnosis_id';
    public $timestamps = false;
    protected $fillable = ['diagnosis_code', 'diagnosis_name', 'description', 'status'];
    protected $appends = ['id'];

    public function getIdAttribute(): int
    {
        return $this->diagnosis_id;
    }

    public function medicalRecords()
    {
        return $this->hasMany(MedicalRecord::class, 'diagnosis_id', 'diagnosis_id');
    }
}
