<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MedicineCategory extends Model
{
    protected $table = 'medicine_categories';
    protected $primaryKey = 'category_id';
    public const CREATED_AT = 'created_at';
    public const UPDATED_AT = 'updated_at';
    protected $fillable = ['category_name', 'description', 'status'];
    protected $appends = ['id'];

    public function getIdAttribute(): int
    {
        return $this->category_id;
    }

    public function medicines()
    {
        return $this->hasMany(Medicine::class, 'category_id', 'category_id');
    }
}
