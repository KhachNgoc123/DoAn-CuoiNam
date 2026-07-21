<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Console\Scheduling\Schedule;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        // Điểm nối route chính của Laravel. Frontend gọi API qua routes/api.php.
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withSchedule(function (Schedule $schedule): void {
        // Tự sinh thông báo nhắc thuốc định kỳ cho các lịch sắp đến giờ uống.
        $schedule->command('medication:generate-notifications --window=10')->everyFiveMinutes();
    })
    ->withMiddleware(function (Middleware $middleware): void {
        // Alias middleware tùy chỉnh nếu cần dùng ngoài Sanctum mặc định.
        $middleware->alias([
            'auth.doctor' => \App\Http\Middleware\AuthenticateDoctorToken::class,
            'audit.doctor' => \App\Http\Middleware\AuditDoctorAction::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
