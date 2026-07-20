<?php

namespace App\Http\Controllers;

use Exception;
use Illuminate\Http\Request;
use App\Services\PasswordResetService;
//(b2)
class PasswordResetController extends Controller
{
    protected PasswordResetService $passwordResetService;

    public function __construct(PasswordResetService $passwordResetService)
    {
        $this->passwordResetService = $passwordResetService;
    }

    public function passwordReset(Request $request)
    {
       $request->validate([
    'current_password' => 'required',
    'new_password' => 'required|min:8|confirmed',
    
]);

        try {

            $doctor = $request->user();

            $this->passwordResetService->processPasswordReset(
                $doctor,
                $request->current_password,
                $request->new_password
            );

            return response()->json([
                'success' => true,
                'message' => 'Đổi mật khẩu thành công!'
            ]);

        } catch (Exception $e) {

            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);

        }
    }
}