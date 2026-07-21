<?php

namespace App\Http\Controllers;

use App\Services\MedicalRecordService;

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
    //xem chi tiết hồ sơ bệnh án 
    public function show(Request $request,$id){
        $records = $this->medicalRecordService->getMedicalRecordById($id);
        return response()->json([
            'success'=>true,
            'data'=>$records
        ]);
    }
}