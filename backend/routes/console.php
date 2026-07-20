<?php

use App\Services\MedicationNotificationGenerator;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('medication:generate-notifications {--window=60}', function () {
    $created = app(MedicationNotificationGenerator::class)->generate((int) $this->option('window'));

    $this->info("Đã tạo {$created} thông báo nhắc thuốc.");
})->purpose('Generate pending doctor notifications for due medication schedules');
