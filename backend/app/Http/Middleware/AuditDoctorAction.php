<?php

namespace App\Http\Middleware;

use App\Models\AuditLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuditDoctorAction
{
    private const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! in_array($request->method(), self::MUTATING_METHODS, true)) {
            return $response;
        }

        if ($request->is('api/auth/login') || $request->is('api/auth/forgot-password')) {
            return $response;
        }

        try {
            AuditLog::create([
                'doctor_id' => $request->user()?->doctor_id,
                'method' => $request->method(),
                'path' => $request->path(),
                'action' => $request->route()?->getActionName(),
                'status_code' => $response->getStatusCode(),
                'ip_address' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 255),
                'payload_summary' => $this->payloadSummary($request),
            ]);
        } catch (\Throwable) {
            // Audit logging must never break the main medical workflow.
        }

        return $response;
    }

    private function payloadSummary(Request $request): array
    {
        return collect($request->except([
            'password',
            'password_confirmation',
            'current_password',
            'avatar',
            'file',
            'document',
        ]))
            ->map(fn ($value) => is_scalar($value) || $value === null ? $value : '[complex]')
            ->take(30)
            ->all();
    }
}
