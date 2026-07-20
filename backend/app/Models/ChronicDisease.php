<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChronicDisease extends Model
{
    protected $table = 'chronic_diseases';
    protected $primaryKey = 'chronic_disease_id';
    public $timestamps = false;
    protected $fillable = ['disease_name', 'description'];
    protected $appends = ['id'];

    public function getIdAttribute(): int
    {
        return $this->chronic_disease_id;
    }

    public function patients()
    {
        return $this->belongsToMany(Patient::class, 'patient_chronic_diseases', 'chronic_disease_id', 'patient_id');
    }
}
