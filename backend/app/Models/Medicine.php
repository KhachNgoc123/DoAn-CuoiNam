<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Medicine extends Model
{
    protected $table = 'medicines';
    protected $primaryKey = 'medicine_id';
    public $timestamps = false;
    protected $fillable = ['category_id', 'medicine_name', 'unit', 'quantity', 'expiry_date', 'description'];
    protected $appends = ['id'];
    protected $casts = ['expiry_date' => 'date'];
    public function getIdAttribute(): int { return $this->medicine_id; }

    public function prescriptionDetails()
    {
        return $this->hasMany(PrescriptionItem::class, 'medicine_id', 'medicine_id');
    }

    public function category()
    {
        return $this->belongsTo(MedicineCategory::class, 'category_id', 'category_id');
    }
}
