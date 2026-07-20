<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
class Doctor extends Authenticatable
{
   use HasApiTokens;

    protected $table = 'doctors';
    protected $primaryKey = 'doctor_id';
    public const CREATED_AT = 'created_at';
    public const UPDATED_AT = 'updated_at';

    protected $fillable = [
        'full_name',
        'email',
        'password',
        'avatar',
        'phone',
        'specialty',
        'gender',
        'date_of_birth',
        'address',
        'status',
        'failed_login_attempts',
        'locked_until',
        'last_failed_login_at',
    ];
    protected $hidden = ['password', 'failed_login_attempts', 'locked_until', 'last_failed_login_at'];
    protected $appends = ['id', 'name', 'role', 'is_active'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'date_of_birth' => 'date',
            'locked_until' => 'datetime',
            'last_failed_login_at' => 'datetime',
        ];
    }

    public function getNameAttribute(): string
    {
        return $this->full_name;
    }

    public function getIdAttribute(): int { return $this->doctor_id; }

    public function getRoleAttribute(): string
    {
        return 'doctor';
    }

    public function getIsActiveAttribute(): bool
    {
        return $this->status !== 'inactive';
    }

    public function medicalRecords()
    {
        return $this->hasMany(MedicalRecord::class, 'doctor_id', 'doctor_id');
    }

}
