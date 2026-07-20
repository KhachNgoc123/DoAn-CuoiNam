<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\PatientService;
use Illuminate\Http\Request;
use App\Models\Allergy;
use App\Models\ChronicDisease;
use App\Models\Patient;

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
   //sửa bệnh nhân
   public function update(Request $request , $id){
    $patient = Patient::findOrFail($id);
    $validated = $request->validate([
        'full_name'=>'required|max:100',
        'gender'   =>'required',
        'date_of_birth'=>'required|date',
        'phone'=>'required',
        'email'=>'nullable|email',
        'address'=>'nullable',
        'underlying_disease' => 'nullable',
        'allergy' => 'nullable',
    ]);
    $patient->update($validated);
    return response()->json([
        'message'=>'Cập nhật thành công',
        'data'=>$patient
    ]);
   }
   //danh sách bệnh nền và dị ứng 
   public function patientSuggestions()//phải giống bên api.php
    {
        return response()->json([
            'success' => true,
            'chronic_diseases' => ChronicDisease::select(
             'chronic_disease_id',
                   'disease_name'
            )->get(),

            'allergies' => Allergy::select(
                'allergy_id',
                'allergy_name'
            )->get(),
        ]);
    }
    //xem chi tiết 
    public function show($id){
        $patient=$this->patientService->getPatientById($id);
        return response()->json([
            'success'=>true,
            'data'=>$patient
        ]);
    }

}
