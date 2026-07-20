<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    protected $table = 'audit_logs';
    public const UPDATED_AT = null;

    protected $fillable = [
        'doctor_id',
        'method',
        'path',
        'action',
        'status_code',
        'ip_address',
        'user_agent',
        'payload_summary',
    ];

    protected function casts(): array
    {
        return [
            'payload_summary' => 'array',
        ];
    }
}
