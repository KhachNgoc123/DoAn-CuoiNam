<?php

namespace App\Services;
use App\Models\MedicalRecord;
class MedicalRecordService{
    //lấy bên controller
    public function getAllMedicalRecord(){
        return MedicalRecord::with([
            'patient',
            'doctor',
            'diagnosisInfo'
        ])->orderByDesc('visit_date')
        ->get();

    }
}