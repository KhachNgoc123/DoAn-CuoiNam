<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PatientFeedback extends Model
{
    protected $table = 'patient_feedbacks';
    protected $primaryKey = 'feedback_id';
    protected $fillable = [
        'doctor_id',
        'patient_id',
        'patient_name',
        'patient_phone',
        'title',
        'content',
        'status',
        'feedback_date',
    ];
    protected $appends = ['id'];
    protected $casts = ['feedback_date' => 'date'];

    public function getIdAttribute(): int
    {
        return $this->feedback_id;
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id', 'doctor_id');
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }
}
