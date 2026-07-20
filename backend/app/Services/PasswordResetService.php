<?php

namespace App\Services;

use Illuminate\Support\Facades\Hash;
use Exception;

class PasswordResetService
{
    //(b3)
    public function processPasswordReset($doctor, $currentPassword, $newPassword)
    {
        // Kiểm tra mật khẩu hiện tại
        if (!Hash::check($currentPassword, $doctor->password)) {
            throw new Exception('Mật khẩu hiện tại không đúng.');
        }

        // Không cho phép trùng mật khẩu cũ
        if (Hash::check($newPassword, $doctor->password)) {
            throw new Exception('Mật khẩu mới không được trùng với mật khẩu cũ.');
        }

        // Cập nhật mật khẩu
        $doctor->password = Hash::make($newPassword);
        $doctor->save();

        return true;
    }
}