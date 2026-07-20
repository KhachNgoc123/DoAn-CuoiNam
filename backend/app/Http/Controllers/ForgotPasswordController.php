<?php

namespace App\Http\Controllers;
use Exception;
use Illuminate\Http\Request;
use App\Services\ForgotPasswordService;
class ForgotPasswordController extends Controller
{
    protected ForgotPasswordService $forgotPasswordService;

    public function __construct(ForgotPasswordService $forgotPasswordService){
        $this->forgotPasswordService = $forgotPasswordService;

    }
    //Gửi OTP
    public function forgotPassword(Request $request){
        $request->validate([
            'email' => 'required|email'
        ]);

        try{
            $this->forgotPasswordService->sendOtp($request->email);
            return response()->json([
                'success' =>true,
                'message' =>"'Otp đã được gửi."
            ]);

        }catch (Exception $e){
            return response()->json([
                'success'=>false,
                'message'=>$e->getMessage()
            ],400);
        }
    }
//xác thựuc OTP
public function verifyOtp(Request $request){
    $request->validate([
        'email'=>'required|email',
        'otp'=>'required'
    ]);

    try{
        $this->forgotPasswordService->verifyOtp(
            $request->email,
            $request->otp
        );
        return response()->json([
            'success'=>true,
            'message'=> 'OTP hợp lệ.'
        ]);
    }catch(Exception $e){
        return response()->json([
            'success'=>false,
            'message'=>$e->getMessage()
        ],400);
    }
}
//đổi mk 
public function resetPassword(Request $request){
    $request->validate([
        'email'=>'required|email',
        'otp'=>'required',
        'password'=>'required|min:8|confirmed'
    ]);
    try{
        $this->forgotPasswordService->verifyOtp(
            $request->email,
            $request->otp
        );

        $this->forgotPasswordService->resetPassword(
            $request->email,
            $request->password
        );

        return response()->json([
            'success'=>true,
            'message'=>'Đổi mật khẩu thành công.'

        ]);
    }catch(Exception $e){
        return response()->json([
            'success'=>false,
            'message'=>$e->getMessage()
        ],400);
    }
}
}
