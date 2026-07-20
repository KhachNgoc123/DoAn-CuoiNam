<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PasswordResetOtp;
use App\Models\Doctor; //sưa cho này
use App\Services\DoctorToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        
        // 1 Tìm bác sĩ theo email
        $doctor = Doctor::where('email', $request->email)->first();

        // 2 Kiểm tra tài khoản
        if (!$doctor) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản không tồn tại'
            ], 401);
        }

        // 3 Kiểm tra mật khẩu
        if (!Hash::check($request->password, $doctor->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Sai mật khẩu'
            ], 401);
        }

        // 4 Tạo token
        $token = $doctor->createToken('authToken')->plainTextToken; //lưu ý chỗ này

        // 5 Trả kết quả
        return response()->json([
            'success' => true,
            'message' => 'Đăng nhập thành công',
            'token' => $token,
            'doctor' => [
                'doctor_id' => $doctor->getKey(),
                'full_name' => $doctor->full_name,
                'email' => $doctor->email,
                'phone' => $doctor->phone,
                'avatar' => $doctor->avatar
            ]
        ]);
    }
}