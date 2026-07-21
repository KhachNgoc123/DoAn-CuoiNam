<?php

namespace App\Services;
use App\Models\MedicalRecord;
class MedicalRecordService{
    //1.lấy bên controller
    public function getAllMedicalRecord(){
        return MedicalRecord::with([
            'patient',
            'doctor',
            'diagnosisInfo'
        ])->orderByDesc('visit_date')
        ->get();

    }
    //2.hàm xem chi tiết
    public function getAllMedicalRecordById($id){
        return MedicalRecord::with([
            'patient',
            'doctor',
            'diagnosisInfo',
            'prescriptions.details.schedules',//
            'healthMonitorings.healthMetrics.healthType',//
        ])->findOrFail();
    } 
}