<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\DoctorToken;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateDoctorToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $doctorId = DoctorToken::doctorId($request->bearerToken() ?? '');
        $doctor = $doctorId
            ? User::query()
                ->select(['doctor_id', 'full_name', 'email', 'avatar', 'phone', 'specialty', 'status'])
                ->find($doctorId)
            : null;

        if (! $doctor || $doctor->status === 'inactive') {
            return response()->json(['message' => 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'], 401);
        }

        $request->setUserResolver(fn () => $doctor);

        return $next($request);
    }
}
