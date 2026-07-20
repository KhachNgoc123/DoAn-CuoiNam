<?php

namespace App\Services;

class DoctorToken
{
    public static function issue(int $doctorId): string
    {
        $payload = self::encode(json_encode(['doctor_id' => $doctorId, 'expires_at' => now()->addHours(12)->timestamp]));
        $signature = self::encode(hash_hmac('sha256', $payload, config('app.key'), true));

        return $payload . '.' . $signature;
    }

    public static function doctorId(string $token): ?int
    {
        [$payload, $signature] = array_pad(explode('.', $token, 2), 2, null);
        if (! $payload || ! $signature) {
            return null;
        }

        $expected = self::encode(hash_hmac('sha256', $payload, config('app.key'), true));
        if (! hash_equals($expected, $signature)) {
            return null;
        }

        $data = json_decode(self::decode($payload), true);
        if (! is_array($data) || ($data['expires_at'] ?? 0) < now()->timestamp) {
            return null;
        }

        return isset($data['doctor_id']) ? (int) $data['doctor_id'] : null;
    }

    private static function encode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private static function decode(string $value): string
    {
        return base64_decode(strtr($value, '-_', '+/')) ?: '';
    }
}
