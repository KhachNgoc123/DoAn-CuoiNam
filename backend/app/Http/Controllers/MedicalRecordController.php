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

    public function index()
    {
        $records = $this->medicalRecordService->getAllMedicalRecord();

        return response()->json([
            'success' => true,
            'data' => $records
        ]);
    }
}