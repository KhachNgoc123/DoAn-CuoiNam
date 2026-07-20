<?php

namespace App\Services;

use App\Models\Doctor;
use App\Models\PasswordResetOtp;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Exception;

class ForgotPasswordService
{
    /**
     * Gửi mã OTP về email
     */
    public function sendOtp(string $email)
    {
        // Kiểm tra email có tồn tại không
        $doctor = Doctor::where('email', $email)->first();

        if (!$doctor) {
            throw new Exception('Email chưa được đăng ký.');
        }

        // Xóa OTP cũ nếu có
        PasswordResetOtp::where('email', $email)->delete();

        // Sinh OTP ngẫu nhiên
        $otp = random_int(100000, 999999);

        // Lưu OTP vào database
        PasswordResetOtp::create([
            'email' => $email,
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(5),
        ]);

        // Gửi email
        Mail::raw("Mã OTP đặt lại mật khẩu của bạn là: {$otp}", function ($message) use ($email) {
            $message->to($email)
                ->subject('Mã OTP đặt lại mật khẩu');
        });

        return true;
    }

    /**
     * Kiểm tra OTP
     */
    public function verifyOtp(string $email, string $otp)
    {
        $resetOtp = PasswordResetOtp::where('email', $email)
            ->latest('id')
            ->first();

        if (!$resetOtp) {
            throw new Exception('OTP không tồn tại.');
        }

        if ($resetOtp->expires_at->isPast()) {
            throw new Exception('OTP đã hết hạn.');
        }

        if (!Hash::check($otp, $resetOtp->otp_hash)) {
            throw new Exception('OTP không đúng.');
        }

        return true;
    }

    /**
     * Đặt lại mật khẩu
     */
    public function resetPassword(string $email, string $password)
    {
        $doctor = Doctor::where('email', $email)->first();

        if (!$doctor) {
            throw new Exception('Không tìm thấy tài khoản.');
        }

        // Không cho phép dùng lại mật khẩu cũ
        if (Hash::check($password, $doctor->password)) {
            throw new Exception('Mật khẩu mới không được trùng với mật khẩu cũ.');
        }

        // Cập nhật mật khẩu
        $doctor->password = Hash::make($password);
        $doctor->save();

        // Xóa OTP sau khi đổi thành công
        PasswordResetOtp::where('email', $email)->delete();

        return true;
    }
}