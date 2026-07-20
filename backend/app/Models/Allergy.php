<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Allergy extends Model
{
    protected $table = 'allergies';
    protected $primaryKey = 'allergy_id';
    public $timestamps = false;
    protected $fillable = ['allergy_name', 'description'];
    protected $appends = ['id'];

    public function getIdAttribute(): int
    {
        return $this->allergy_id;
    }

    public function patients()
    {
        return $this->belongsToMany(Patient::class, 'patient_allergies', 'allergy_id', 'patient_id');
    }
}
