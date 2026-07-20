<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->addIndexIfMissing('patient', ['full_name'], 'idx_patient_full_name');
        $this->addIndexIfMissing('patient', ['phone'], 'idx_patient_phone');
        $this->addIndexIfMissing('patient', ['created_at'], 'idx_patient_created_at');

        $this->addIndexIfMissing('medical_records', ['doctor_id', 'visit_date'], 'idx_records_doctor_visit_date');
        $this->addIndexIfMissing('medical_records', ['patient_id', 'visit_date'], 'idx_records_patient_visit_date');
        $this->addIndexIfMissing('medical_records', ['patient_id', 'status'], 'idx_records_patient_status');
        $this->addIndexIfMissing('medical_records', ['doctor_id', 'status'], 'idx_records_doctor_status');

        $this->addIndexIfMissing('prescriptions', ['record_id', 'status'], 'idx_prescriptions_record_status');
        $this->addIndexIfMissing('prescriptions', ['status'], 'idx_prescriptions_status');

        $this->addIndexIfMissing('medicine_schedules', ['status'], 'idx_schedules_status');
        $this->addIndexIfMissing('medicine_schedules', ['start_date'], 'idx_schedules_start_date');
        $this->addIndexIfMissing('medicine_schedules', ['end_date'], 'idx_schedules_end_date');

        $this->addIndexIfMissing('health_metrics', ['patient_id', 'measure_time'], 'idx_health_patient_measure_time');
        $this->addIndexIfMissing('health_metrics', ['measure_time'], 'idx_health_measure_time');

        $this->addIndexIfMissing('medicines', ['medicine_name'], 'idx_medicines_name');
        $this->addIndexIfMissing('allergies', ['allergy_name'], 'idx_allergies_name');
        $this->addIndexIfMissing('chronic_diseases', ['disease_name'], 'idx_chronic_diseases_name');
    }

    public function down(): void
    {
        $this->dropIndexIfExists('chronic_diseases', 'idx_chronic_diseases_name');
        $this->dropIndexIfExists('allergies', 'idx_allergies_name');
        $this->dropIndexIfExists('medicines', 'idx_medicines_name');

        $this->dropIndexIfExists('health_metrics', 'idx_health_measure_time');
        $this->dropIndexIfExists('health_metrics', 'idx_health_patient_measure_time');

        $this->dropIndexIfExists('medicine_schedules', 'idx_schedules_end_date');
        $this->dropIndexIfExists('medicine_schedules', 'idx_schedules_start_date');
        $this->dropIndexIfExists('medicine_schedules', 'idx_schedules_status');

        $this->dropIndexIfExists('prescriptions', 'idx_prescriptions_status');
        $this->dropIndexIfExists('prescriptions', 'idx_prescriptions_record_status');

        $this->dropIndexIfExists('medical_records', 'idx_records_doctor_status');
        $this->dropIndexIfExists('medical_records', 'idx_records_patient_status');
        $this->dropIndexIfExists('medical_records', 'idx_records_patient_visit_date');
        $this->dropIndexIfExists('medical_records', 'idx_records_doctor_visit_date');

        $this->dropIndexIfExists('patient', 'idx_patient_created_at');
        $this->dropIndexIfExists('patient', 'idx_patient_phone');
        $this->dropIndexIfExists('patient', 'idx_patient_full_name');
    }

    private function addIndexIfMissing(string $table, array $columns, string $index): void
    {
        if (! Schema::hasTable($table) || $this->indexExists($table, $index)) {
            return;
        }

        foreach ($columns as $column) {
            if (! Schema::hasColumn($table, $column)) {
                return;
            }
        }

        Schema::table($table, function (Blueprint $blueprint) use ($columns, $index) {
            $blueprint->index($columns, $index);
        });
    }

    private function dropIndexIfExists(string $table, string $index): void
    {
        if (! Schema::hasTable($table) || ! $this->indexExists($table, $index)) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use ($index) {
            $blueprint->dropIndex($index);
        });
    }

    private function indexExists(string $table, string $index): bool
    {
        $table = str_replace('`', '``', $table);

        return DB::select("SHOW INDEX FROM `{$table}` WHERE Key_name = ?", [$index]) !== [];
    }
};
