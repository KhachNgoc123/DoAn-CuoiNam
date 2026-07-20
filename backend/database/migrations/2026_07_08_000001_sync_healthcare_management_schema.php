<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->ensureSystemTables();
        $this->syncPatientsTable();
        $this->syncMedicalRecordsTable();
        $this->syncMedicalDocumentsTable();
        $this->syncMedicineSchedulesTable();
        $this->syncHealthMetricsTable();
        $this->syncPrescriptionsTable();
        $this->syncPrescriptionDetailsTable();
        $this->ensurePerformanceIndexes();
    }

    public function down(): void
    {
        // Intentionally no-op: this migration baselines an existing database without deleting data.
    }

    private function ensureSystemTables(): void
    {
        if (! Schema::hasTable('cache')) {
            Schema::create('cache', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->mediumText('value');
                $table->integer('expiration')->index();
            });
        }

        if (! Schema::hasTable('cache_locks')) {
            Schema::create('cache_locks', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->string('owner');
                $table->integer('expiration')->index();
            });
        }

        if (! Schema::hasTable('jobs')) {
            Schema::create('jobs', function (Blueprint $table) {
                $table->id();
                $table->string('queue')->index();
                $table->longText('payload');
                $table->unsignedTinyInteger('attempts');
                $table->unsignedInteger('reserved_at')->nullable();
                $table->unsignedInteger('available_at');
                $table->unsignedInteger('created_at');
            });
        }

        if (! Schema::hasTable('job_batches')) {
            Schema::create('job_batches', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->string('name');
                $table->integer('total_jobs');
                $table->integer('pending_jobs');
                $table->longText('failed_job_ids');
                $table->mediumText('options')->nullable();
                $table->integer('cancelled_at')->nullable();
                $table->integer('created_at');
                $table->integer('finished_at')->nullable();
            });
        }

        if (! Schema::hasTable('failed_jobs')) {
            Schema::create('failed_jobs', function (Blueprint $table) {
                $table->id();
                $table->string('uuid')->unique();
                $table->text('connection');
                $table->text('queue');
                $table->longText('payload');
                $table->longText('exception');
                $table->timestamp('failed_at')->useCurrent();
            });
        }
    }

    private function syncPatientsTable(): void
    {
        if (! Schema::hasTable('patients')) {
            return;
        }

        Schema::table('patients', function (Blueprint $table) {
            if (! Schema::hasColumn('patients', 'email')) {
                $table->string('email', 100)->nullable()->after('phone');
            }
            if (! Schema::hasColumn('patients', 'weight')) {
                $table->decimal('weight', 5, 2)->nullable()->after('address');
            }
            if (! Schema::hasColumn('patients', 'height')) {
                $table->decimal('height', 5, 2)->nullable()->after('weight');
            }
            if (! Schema::hasColumn('patients', 'underlying_disease')) {
                $table->text('underlying_disease')->nullable()->after('height');
            }
            if (! Schema::hasColumn('patients', 'allergy')) {
                $table->text('allergy')->nullable()->after('underlying_disease');
            }
        });
    }

    private function syncMedicalRecordsTable(): void
    {
        if (! Schema::hasTable('medical_records')) {
            return;
        }

        Schema::table('medical_records', function (Blueprint $table) {
            if (! Schema::hasColumn('medical_records', 'chief_complaint')) {
                $table->text('chief_complaint')->nullable()->after('visit_date');
            }
            if (! Schema::hasColumn('medical_records', 'symptoms')) {
                $table->text('symptoms')->nullable()->after('chief_complaint');
            }
            if (! Schema::hasColumn('medical_records', 'diagnosis')) {
                $table->text('diagnosis')->nullable()->after('symptoms');
            }
            if (! Schema::hasColumn('medical_records', 'medical_history')) {
                $table->text('medical_history')->nullable()->after('diagnosis');
            }
            if (! Schema::hasColumn('medical_records', 'allergy')) {
                $table->text('allergy')->nullable()->after('medical_history');
            }
            if (! Schema::hasColumn('medical_records', 'treatment_plan')) {
                $table->text('treatment_plan')->nullable()->after('allergy');
            }
            if (! Schema::hasColumn('medical_records', 'doctor_note')) {
                $table->text('doctor_note')->nullable()->after('treatment_plan');
            }
            if (! Schema::hasColumn('medical_records', 'next_visit_date')) {
                $table->date('next_visit_date')->nullable()->after('doctor_note');
            }
            if (! Schema::hasColumn('medical_records', 'created_at')) {
                $table->timestamp('created_at')->nullable();
            }
            if (! Schema::hasColumn('medical_records', 'updated_at')) {
                $table->timestamp('updated_at')->nullable();
            }
        });
    }

    private function syncMedicalDocumentsTable(): void
    {
        if (! Schema::hasTable('medical_documents')) {
            return;
        }

        Schema::table('medical_documents', function (Blueprint $table) {
            if (! Schema::hasColumn('medical_documents', 'visit_date')) {
                $table->date('visit_date')->nullable()->after('record_id');
            }
            if (! Schema::hasColumn('medical_documents', 'created_at')) {
                $table->timestamp('created_at')->nullable();
            }
            if (! Schema::hasColumn('medical_documents', 'updated_at')) {
                $table->timestamp('updated_at')->nullable();
            }
        });
    }

    private function syncMedicineSchedulesTable(): void
    {
        if (Schema::hasTable('medicine_schedules')) {
            Schema::table('medicine_schedules', function (Blueprint $table) {
                if (! Schema::hasColumn('medicine_schedules', 'start_date')) {
                    $table->date('start_date')->nullable()->after('prescription_detail_id');
                }
                if (! Schema::hasColumn('medicine_schedules', 'end_date')) {
                    $table->date('end_date')->nullable()->after('start_date');
                }
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

        if (Schema::hasTable('medicine_schedules') && Schema::hasColumn('medicine_schedules', 'time_of_day')) {
            DB::statement("
                INSERT INTO schedule_times (schedule_id, time_take)
                SELECT ms.schedule_id, ms.time_of_day
                FROM medicine_schedules ms
                WHERE ms.time_of_day IS NOT NULL
                  AND NOT EXISTS (
                    SELECT 1 FROM schedule_times st WHERE st.schedule_id = ms.schedule_id
                  )
            ");
        }
    }

    private function syncHealthMetricsTable(): void
    {
        if (! Schema::hasTable('health_metrics')) {
            return;
        }

        Schema::table('health_metrics', function (Blueprint $table) {
            if (! Schema::hasColumn('health_metrics', 'measure_time')) {
                $table->dateTime('measure_time')->nullable()->after('health_type_id');
            }
            if (! Schema::hasColumn('health_metrics', 'value')) {
                $table->string('value', 100)->nullable()->after('measure_time');
            }
            if (! Schema::hasColumn('health_metrics', 'created_at')) {
                $table->timestamp('created_at')->nullable();
            }
            if (! Schema::hasColumn('health_metrics', 'updated_at')) {
                $table->timestamp('updated_at')->nullable();
            }
        });

        if (Schema::hasColumn('health_metrics', 'metric_value')) {
            DB::table('health_metrics')->whereNull('value')->update(['value' => DB::raw('metric_value')]);
        }
        DB::table('health_metrics')->whereNull('measure_time')->update(['measure_time' => now()]);
    }

    private function syncPrescriptionsTable(): void
    {
        if (! Schema::hasTable('prescriptions')) {
            return;
        }

        Schema::table('prescriptions', function (Blueprint $table) {
            if (! Schema::hasColumn('prescriptions', 'end_date')) {
                $table->date('end_date')->nullable()->after('start_date');
            }
            if (! Schema::hasColumn('prescriptions', 'note')) {
                $table->text('note')->nullable()->after('end_date');
            }
        });

        if (Schema::hasColumn('prescriptions', 'duration_days')) {
            DB::statement("
                UPDATE prescriptions
                SET end_date = DATE_ADD(start_date, INTERVAL GREATEST(duration_days - 1, 0) DAY)
                WHERE end_date IS NULL
                  AND start_date IS NOT NULL
                  AND duration_days IS NOT NULL
            ");
        }
    }

    private function syncPrescriptionDetailsTable(): void
    {
        if (! Schema::hasTable('prescription_details')) {
            return;
        }

        Schema::table('prescription_details', function (Blueprint $table) {
            if (! Schema::hasColumn('prescription_details', 'frequency_type_id')) {
                $table->unsignedInteger('frequency_type_id')->nullable()->after('dosage');
            }
            if (! Schema::hasColumn('prescription_details', 'meal_time_id')) {
                $table->unsignedInteger('meal_time_id')->nullable()->after('frequency_type_id');
            }
            if (! Schema::hasColumn('prescription_details', 'quantity')) {
                $table->unsignedInteger('quantity')->default(1)->after('meal_time_id');
            }
            if (! Schema::hasColumn('prescription_details', 'created_at')) {
                $table->timestamp('created_at')->nullable();
            }
            if (! Schema::hasColumn('prescription_details', 'updated_at')) {
                $table->timestamp('updated_at')->nullable();
            }
        });
    }

    private function ensurePerformanceIndexes(): void
    {
        $this->addIndexIfMissing('patients', ['full_name'], 'idx_patients_full_name');
        $this->addIndexIfMissing('patients', ['phone'], 'idx_patients_phone');
        $this->addIndexIfMissing('patients', ['created_at'], 'idx_patients_created_at');
        $this->addIndexIfMissing('patients', ['full_name', 'date_of_birth'], 'idx_patients_name_birth_date');

        $this->addIndexIfMissing('medical_records', ['doctor_id', 'visit_date'], 'idx_records_doctor_visit_date');
        $this->addIndexIfMissing('medical_records', ['patient_id', 'visit_date'], 'idx_records_patient_visit_date');
        $this->addIndexIfMissing('medical_records', ['patient_id', 'status'], 'idx_records_patient_status');
        $this->addIndexIfMissing('medical_records', ['doctor_id', 'status'], 'idx_records_doctor_status');

        $this->addIndexIfMissing('health_metrics', ['patient_id', 'measure_time'], 'idx_health_patient_measure_time');
        $this->addIndexIfMissing('prescriptions', ['record_id', 'status'], 'idx_prescriptions_record_status');
        $this->addIndexIfMissing('medicine_schedules', ['status'], 'idx_schedules_status');
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

        Schema::table($table, fn (Blueprint $blueprint) => $blueprint->index($columns, $index));
    }

    private function indexExists(string $table, string $index): bool
    {
        return collect(DB::select("SHOW INDEX FROM `{$table}`"))
            ->contains(fn ($row) => ($row->Key_name ?? null) === $index);
    }
};
