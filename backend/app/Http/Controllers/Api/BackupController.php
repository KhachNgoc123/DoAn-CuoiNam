<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class BackupController extends Controller
{
    private const TABLES = [
        'doctors',
        'patients',
        'chronic_diseases',
        'patient_chronic_diseases',
        'allergies',
        'patient_allergies',
        'diagnoses',
        'medical_records',
        'medical_record_symptoms',
        'medical_documents',
        'medicine_categories',
        'medicines',
        'prescriptions',
        'prescription_details',
        'frequency_types',
        'meal_times',
        'medicine_schedules',
        'schedule_times',
        'doctor_notifications',
        'medication_reminder_logs',
        'medication_reactions',
        'health_types',
        'health_metrics',
        'health_metric_alerts',
        'patient_feedbacks',
        'audit_logs',
    ];

    public function export()
    {
        $data = collect(self::TABLES)
            ->filter(fn (string $table) => Schema::hasTable($table))
            ->mapWithKeys(fn (string $table) => [$table => DB::table($table)->get()])
            ->all();

        $filename = 'healthcare-backup-'.now()->format('Ymd-His').'.json';

        return response()->json([
            'generated_at' => now()->toISOString(),
            'database' => config('database.connections.mysql.database'),
            'tables' => $data,
        ])->withHeaders([
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
