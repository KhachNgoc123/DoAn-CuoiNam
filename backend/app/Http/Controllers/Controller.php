<?php

namespace App\Http\Controllers;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

abstract class Controller
{
    protected function perPage(Request $request, int $default = 10, int $max = 50): int
    {
        return max(1, min($request->integer('per_page', $default), $max));
    }

    protected function cachedForUser(Request $request, string $prefix, Closure $resolver, int $seconds = 20): mixed
    {
        $doctorId = (int) ($request->user()?->doctor_id ?? 0);
        $version = Cache::get($this->userCacheVersionKey($doctorId), 1);
        $key = implode(':', [
            'api',
            $prefix,
            'doctor',
            $doctorId,
            'v',
            $version,
            md5($request->fullUrl()),
        ]);

        return Cache::remember($key, now()->addSeconds($seconds), $resolver);
    }

    protected function flushUserApiCache(Request $request): void
    {
        $key = $this->userCacheVersionKey((int) ($request->user()?->doctor_id ?? 0));
        Cache::forever($key, (int) Cache::get($key, 1) + 1);
    }

    private function userCacheVersionKey(int $doctorId): string
    {
        return "api-cache-version:doctor:{$doctorId}";
    }
}
