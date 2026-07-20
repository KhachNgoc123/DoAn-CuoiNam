<?php

namespace App\Services;

use App\Models\Patient;
class PatientService{
    //lấy bên controller
    public function getAllPatients(){
        return Patient::orderby('patient_id','desc')->get();

    }
    //thêm bệnh nhân
    public function createPatient(array $data){
        return Patient::create($data);
    }
    //sửa bệnh nhân
    //xem chi tiết 
   public function getPatientById($id)
{
    return Patient::with([
        'medicalRecords.prescriptions.details.schedules',
        'healthMetrics.healthType',
        'allergies',
        'chronicDiseases'
    ])->findOrFail($id);
}
    
}