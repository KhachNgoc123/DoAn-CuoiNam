<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->addIndex('patients', ['full_name'], 'idx_patients_full_name');
        $this->addIndex('patients', ['phone'], 'idx_patients_phone');
        $this->addIndex('patients', ['date_of_birth'], 'idx_patients_dob');

        $this->addIndex('medical_records', ['doctor_id', 'visit_date'], 'idx_records_doctor_visit');
        $this->addIndex('medical_records', ['doctor_id', 'patient_id'], 'idx_records_doctor_patient');
        $this->addIndex('medical_records', ['patient_id', 'visit_date'], 'idx_records_patient_visit');
        $this->addIndex('medical_records', ['status'], 'idx_records_status');

        $this->addIndex('prescriptions', ['record_id'], 'idx_prescriptions_record');
        $this->addIndex('prescriptions', ['start_date'], 'idx_prescriptions_start');
        $this->addIndex('prescriptions', ['end_date'], 'idx_prescriptions_end');
        $this->addIndex('prescriptions', ['status'], 'idx_prescriptions_status');

        $this->addIndex('prescription_details', ['prescription_id'], 'idx_details_prescription');
        $this->addIndex('prescription_details', ['medicine_id'], 'idx_details_medicine');

        $this->addIndex('medicine_schedules', ['prescription_detail_id'], 'idx_schedules_detail');
        $this->addIndex('medicine_schedules', ['start_date', 'end_date'], 'idx_schedules_date_range');
        $this->addIndex('medicine_schedules', ['status'], 'idx_schedules_status');

        $this->addIndex('schedule_times', ['schedule_id', 'time_take'], 'idx_schedule_times_schedule_time');

        $this->addIndex('medication_reminder_logs', ['doctor_id', 'reminder_date'], 'idx_reminders_doctor_date');
        $this->addIndex('medication_reminder_logs', ['schedule_id', 'reminder_date'], 'idx_reminders_schedule_date');
        $this->addIndex('medication_reminder_logs', ['status'], 'idx_reminders_status');

        $this->addIndex('health_metrics', ['patient_id', 'measure_time'], 'idx_health_patient_time');
        $this->addIndex('health_metrics', ['health_type_id'], 'idx_health_type');

        $this->addIndex('health_metric_alerts', ['doctor_id', 'status', 'alert_time'], 'idx_alerts_doctor_status_time');

        $this->addIndex('patient_allergies', ['patient_id', 'allergy_id'], 'idx_patient_allergies_patient_allergy');
        $this->addIndex('patient_chronic_diseases', ['patient_id', 'chronic_disease_id'], 'idx_patient_chronic_patient_disease');
    }

    public function down(): void
    {
        foreach ([
            'patients' => ['idx_patients_full_name', 'idx_patients_phone', 'idx_patients_dob'],
            'medical_records' => ['idx_records_doctor_visit', 'idx_records_doctor_patient', 'idx_records_patient_visit', 'idx_records_status'],
            'prescriptions' => ['idx_prescriptions_record', 'idx_prescriptions_start', 'idx_prescriptions_end', 'idx_prescriptions_status'],
            'prescription_details' => ['idx_details_prescription', 'idx_details_medicine'],
            'medicine_schedules' => ['idx_schedules_detail', 'idx_schedules_date_range', 'idx_schedules_status'],
            'schedule_times' => ['idx_schedule_times_schedule_time'],
            'medication_reminder_logs' => ['idx_reminders_doctor_date', 'idx_reminders_schedule_date', 'idx_reminders_status'],
            'health_metrics' => ['idx_health_patient_time', 'idx_health_type'],
            'health_metric_alerts' => ['idx_alerts_doctor_status_time'],
            'patient_allergies' => ['idx_patient_allergies_patient_allergy'],
            'patient_chronic_diseases' => ['idx_patient_chronic_patient_disease'],
        ] as $table => $indexes) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) use ($table, $indexes) {
                foreach ($indexes as $index) {
                    if ($this->hasIndex($table, $index)) {
                        $blueprint->dropIndex($index);
                    }
                }
            });
        }
    }

    private function addIndex(string $table, array $columns, string $indexName): void
    {
        if (! Schema::hasTable($table) || $this->hasIndex($table, $indexName)) {
            return;
        }

        foreach ($columns as $column) {
            if (! Schema::hasColumn($table, $column)) {
                return;
            }
        }

        Schema::table($table, function (Blueprint $blueprint) use ($columns, $indexName) {
            $blueprint->index($columns, $indexName);
        });
    }

    private function hasIndex(string $table, string $indexName): bool
    {
        $database = DB::getDatabaseName();
        $indexes = DB::select(
            'select 1 from information_schema.statistics where table_schema = ? and table_name = ? and index_name = ? limit 1',
            [$database, $table, $indexName],
        );

        return ! empty($indexes);
    }
};
