<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MedicalRecordAttachment extends Model
{
    protected $table = 'medical_documents';
    protected $primaryKey = 'document_id';
    protected $fillable = ['record_id', 'visit_date', 'document_type', 'file_name', 'file_path', 'description', 'uploaded_at'];
    protected $appends = ['id', 'description', 'uploaded_at'];
    public function getIdAttribute(): int { return $this->document_id; }
    public function getDescriptionAttribute(): string { return basename((string) $this->file_path); }
    public function getUploadedAtAttribute() { return $this->created_at; }
    protected $casts = ['visit_date' => 'datetime', 'created_at' => 'datetime', 'updated_at' => 'datetime'];

    public function medicalRecord()
    {
        return $this->belongsTo(MedicalRecord::class, 'record_id', 'record_id');
    }
}
