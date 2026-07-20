<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FrequencyType extends Model
{
    protected $table = 'frequency_types';
    protected $primaryKey = 'frequency_type_id';
    protected $fillable = ['frequency_id', 'frequency_name', 'times_per_day', 'description'];
    protected $appends = ['id', 'type_name'];

    public function getIdAttribute(): int
    {
        return $this->frequency_type_id;
    }

    public function getTypeNameAttribute(): string
    {
        return $this->frequency_name;
    }
}
