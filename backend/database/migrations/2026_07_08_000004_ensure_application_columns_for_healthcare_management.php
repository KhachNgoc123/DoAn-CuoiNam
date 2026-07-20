<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('patients')) {
            Schema::table('patients', function (Blueprint $table) {
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

        if (Schema::hasTable('medical_records')) {
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
            });

            if (Schema::hasColumn('medical_records', 'note')) {
                if (Schema::hasColumn('medical_records', 'doctor_note')) {
                    DB::table('medical_records')
                        ->whereNull('doctor_note')
                        ->whereNotNull('note')
                        ->update(['doctor_note' => DB::raw('note')]);
                }
            }
        }

        if (Schema::hasTable('health_metrics')) {
            Schema::table('health_metrics', function (Blueprint $table) {
                if (! Schema::hasColumn('health_metrics', 'measure_time')) {
                    $table->dateTime('measure_time')->nullable()->after('health_type_id');
                }
                if (! Schema::hasColumn('health_metrics', 'value')) {
                    $table->string('value', 100)->nullable()->after('measure_time');
                }
            });

            if (Schema::hasColumn('health_metrics', 'metric_value')) {
                DB::table('health_metrics')
                    ->whereNull('value')
                    ->update(['value' => DB::raw('metric_value')]);
            }
            DB::table('health_metrics')
                ->whereNull('measure_time')
                ->update(['measure_time' => now()]);
        }

        if (Schema::hasTable('medicines')) {
            Schema::table('medicines', function (Blueprint $table) {
                if (! Schema::hasColumn('medicines', 'expiry_date')) {
                    $table->date('expiry_date')->nullable()->after('quantity');
                }
            });
        }
    }

    public function down(): void
    {
        // No-op: these columns are required by the current application code.
    }
};
