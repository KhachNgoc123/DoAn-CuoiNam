<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\PatientService;
use Illuminate\Http\Request;

class PatientController extends Controller
{
    protected PatientService $patientService;

    public function __construct(PatientService $patientService)
    {
        $this->patientService = $patientService;
    }
//1. hiển thị ds bệnh nhân
    public function index()
    {
        $patients = $this->patientService->getAllPatients();

        return response()->json([
            'success' => true,
            'data' => $patients
        ]);
    }
//2. thêm bệnh nhân
   public function store(Request $request){
     $request->validate([
      'full_name'=>'required|max:100',
      'gender'   =>'required',
      'date_of_birth'=>'required|date',
      'phone'=>'required',
      'email'=>'nullable|email',
      'address'=>'nullable',
     ]);
     try{
      $patient = $this->patientService->createPatient($request->all());

      return response()->json([
         'success'=>true,
         'message'=>'Thêm bệnh nhân thành công.',
         'data'=>$patient,
      ]);
     }catch(\Exception $e){
      return response()->json([
         'success'=>false,
         'message'=>$e->getMessage()
      ],400);

     }
   }
}