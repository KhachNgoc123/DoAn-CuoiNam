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
    //2.Thêm hồ sơ bệnh án 
    public function createMedicalRecord(array $data){
        return MedicalRecord::create($data);

    }
    //3. Cập nhật hồ sơ bệnh án 
    public function updateMedicalRecord($id,Request $request){
        $records = MedicalRecord::FindOrFail($id);
        $records->update([
            'diagnosis_id'=>$request->diagnosis_id ?? $record->diagnosis_id,
            'note'=>$request->note ?? $record->note,
            'status'=>$request->status ?? $record->status
        ]);
        return $record->fresh([
            'patient',
            'doctor',
            'diagnosisInfo'
        ]);

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