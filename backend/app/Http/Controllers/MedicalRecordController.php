<?php

namespace App\Http\Controllers;

use App\Services\MedicalRecordService;
use App\Models\MedicalRecord;

class MedicalRecordController extends Controller
{
    protected MedicalRecordService $medicalRecordService;

    public function __construct(MedicalRecordService $medicalRecordService)
    {
        $this->medicalRecordService = $medicalRecordService;
    }
    //hiển thị danh sách hồ sơ bệnh án

    public function index()
    {
        $records = $this->medicalRecordService->getAllMedicalRecord();

        return response()->json([
            'success' => true,
            'data' => $records
        ]);
    }
    //thêm hồ sơ bệnh án 
    public function store(Request $request){
        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,patient_id',
            'doctor_id' => 'required|exists:doctors,doctor_id',
            'diagnosis_id' => 'nullable|exists:diagnoses,diagnosis_id',
            'note' => 'nullable|string',
            'status' => 'nullable|string',
        ]);
        //nếu không truyề status thì mặc định lf đang diều trị 
        if(!isset($validated['status'])){
            $validated['status']=MedicalRecord::DEFAULT_STATUS;
        }
        $records = this->medicalRecordService->createMedicalRecord($validated);
        return response()->json([
            'success'  =>true,
            'message'=>'Thêm hồ sơ bệnh án thành công',
            'data'   =>$records
        ],201);

    }
    //cập nhật hồ sơ bệnh án 
    public function update(Request $request,$id){
        //validate
        $request->validate([
        'diagnosis_id' => 'nullable|exists:diagnoses,diagnosis_id',
        'doctor_note' => 'nullable|string',
        'status' => 'required|in:Đang điều trị,Tạm ngưng, Đã hoàn thành',
    ]);
        $records = this->medicalRecordService->updateMedicalRecord($id,$request);
        return response()->json([
            'success'=>true,
            'message'=>'Cập nhật hồ sơ thành công',
            'data'=>$records
        ]);
    }
    
    //xem chi tiết hồ sơ bệnh án 
    public function show(Request $request,$id){
        $records = $this->medicalRecordService->getMedicalRecordById($id);
        return response()->json([
            'success'=>true,
            'data'=>$records
        ]);
    }
}