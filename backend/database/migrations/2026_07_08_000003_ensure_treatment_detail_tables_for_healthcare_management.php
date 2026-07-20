<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('prescriptions')) {
            Schema::create('prescriptions', function (Blueprint $table) {
                $table->increments('prescription_id');
                $table->unsignedInteger('record_id');
                $table->date('prescription_date')->nullable();
                $table->date('start_date')->nullable();
                $table->date('end_date')->nullable();
                $table->unsignedInteger('duration_days')->nullable();
                $table->text('note')->nullable();
                $table->string('status', 50)->nullable()->default('Đang sử dụng');
                $table->timestamps();

                $table->index(['record_id', 'status'], 'idx_prescriptions_record_status');
            });
        }

        if (! Schema::hasTable('prescription_details')) {
            Schema::create('prescription_details', function (Blueprint $table) {
                $table->increments('prescription_detail_id');
                $table->unsignedInteger('prescription_id');
                $table->unsignedInteger('medicine_id');
                $table->string('dosage', 100)->nullable();
                $table->unsignedInteger('frequency_type_id')->nullable();
                $table->unsignedInteger('meal_time_id')->nullable();
                $table->unsignedInteger('quantity')->default(1);
                $table->text('instructions')->nullable();
                $table->text('note')->nullable();
                $table->timestamps();

                $table->index('prescription_id', 'idx_prescription_details_prescription_id');
                $table->index('medicine_id', 'idx_prescription_details_medicine_id');
            });
        }

        if (! Schema::hasTable('schedule_times')) {
            Schema::create('schedule_times', function (Blueprint $table) {
                $table->increments('schedule_time_id');
                $table->unsignedInteger('schedule_id');
                $table->time('time_take');

                $table->index('schedule_id', 'idx_schedule_times_schedule_id');
            });
        }

        if (! Schema::hasTable('patient_chronic_diseases')) {
            Schema::create('patient_chronic_diseases', function (Blueprint $table) {
                $table->increments('id');
                $table->unsignedInteger('patient_id');
                $table->unsignedInteger('chronic_disease_id');
                $table->timestamps();

                $table->index('patient_id', 'idx_patient_chronic_patient_id');
                $table->index('chronic_disease_id', 'idx_patient_chronic_disease_id');
            });
        }
    }

    public function down(): void
    {
        // No-op: this migration only restores missing tables in an existing database.
    }
};
