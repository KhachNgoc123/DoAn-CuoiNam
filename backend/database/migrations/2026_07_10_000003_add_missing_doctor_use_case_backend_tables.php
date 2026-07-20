<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->syncHealthTypes();
        $this->createHealthMetricAlerts();
        $this->createMedicationReactions();
    }

    public function down(): void
    {
        $this->dropIndexIfExists('medication_reactions', 'idx_medication_reactions_doctor_date');
        $this->dropIndexIfExists('medication_reactions', 'idx_medication_reactions_patient_date');
        $this->dropIndexIfExists('health_metric_alerts', 'idx_health_alerts_doctor_status_date');
        $this->dropIndexIfExists('health_metric_alerts', 'idx_health_alerts_patient_date');
    }

    private function syncHealthTypes(): void
    {
        if (! Schema::hasTable('health_types')) {
            return;
        }

        Schema::table('health_types', function (Blueprint $table) {
            if (! Schema::hasColumn('health_types', 'min_value')) {
                $table->decimal('min_value', 10, 2)->nullable()->after('unit');
            }
            if (! Schema::hasColumn('health_types', 'max_value')) {
                $table->decimal('max_value', 10, 2)->nullable()->after('min_value');
            }
            if (! Schema::hasColumn('health_types', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('max_value');
            }
            if (! Schema::hasColumn('health_types', 'note')) {
                $table->text('note')->nullable()->after('is_active');
            }
            if (! Schema::hasColumn('health_types', 'created_at')) {
                $table->timestamp('created_at')->nullable();
            }
            if (! Schema::hasColumn('health_types', 'updated_at')) {
                $table->timestamp('updated_at')->nullable();
            }
        });
    }

    private function createHealthMetricAlerts(): void
    {
        if (! Schema::hasTable('health_metric_alerts')) {
            Schema::create('health_metric_alerts', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('health_metric_id')->nullable();
                $table->unsignedBigInteger('patient_id');
                $table->unsignedBigInteger('doctor_id')->nullable();
                $table->unsignedBigInteger('health_type_id')->nullable();
                $table->dateTime('alert_time')->nullable();
                $table->decimal('metric_value', 12, 2)->nullable();
                $table->decimal('min_value', 10, 2)->nullable();
                $table->decimal('max_value', 10, 2)->nullable();
                $table->string('severity', 30)->default('warning');
                $table->string('status', 30)->default('open');
                $table->text('message')->nullable();
                $table->dateTime('resolved_at')->nullable();
                $table->timestamps();
            });
        } else {
            $this->addColumnIfMissing('health_metric_alerts', 'health_metric_id', fn (Blueprint $table) => $table->unsignedBigInteger('health_metric_id')->nullable());
            $this->addColumnIfMissing('health_metric_alerts', 'patient_id', fn (Blueprint $table) => $table->unsignedBigInteger('patient_id')->nullable());
            $this->addColumnIfMissing('health_metric_alerts', 'doctor_id', fn (Blueprint $table) => $table->unsignedBigInteger('doctor_id')->nullable());
            $this->addColumnIfMissing('health_metric_alerts', 'health_type_id', fn (Blueprint $table) => $table->unsignedBigInteger('health_type_id')->nullable());
            $this->addColumnIfMissing('health_metric_alerts', 'alert_time', fn (Blueprint $table) => $table->dateTime('alert_time')->nullable());
            $this->addColumnIfMissing('health_metric_alerts', 'metric_value', fn (Blueprint $table) => $table->decimal('metric_value', 12, 2)->nullable());
            $this->addColumnIfMissing('health_metric_alerts', 'min_value', fn (Blueprint $table) => $table->decimal('min_value', 10, 2)->nullable());
            $this->addColumnIfMissing('health_metric_alerts', 'max_value', fn (Blueprint $table) => $table->decimal('max_value', 10, 2)->nullable());
            $this->addColumnIfMissing('health_metric_alerts', 'severity', fn (Blueprint $table) => $table->string('severity', 30)->default('warning'));
            $this->addColumnIfMissing('health_metric_alerts', 'status', fn (Blueprint $table) => $table->string('status', 30)->default('open'));
            $this->addColumnIfMissing('health_metric_alerts', 'message', fn (Blueprint $table) => $table->text('message')->nullable());
            $this->addColumnIfMissing('health_metric_alerts', 'resolved_at', fn (Blueprint $table) => $table->dateTime('resolved_at')->nullable());
            $this->addColumnIfMissing('health_metric_alerts', 'created_at', fn (Blueprint $table) => $table->timestamp('created_at')->nullable());
            $this->addColumnIfMissing('health_metric_alerts', 'updated_at', fn (Blueprint $table) => $table->timestamp('updated_at')->nullable());
        }

        $this->addIndexIfMissing('health_metric_alerts', ['doctor_id', 'status', 'alert_time'], 'idx_health_alerts_doctor_status_date');
        $this->addIndexIfMissing('health_metric_alerts', ['patient_id', 'alert_time'], 'idx_health_alerts_patient_date');
    }

    private function createMedicationReactions(): void
    {
        if (! Schema::hasTable('medication_reactions')) {
            Schema::create('medication_reactions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('patient_id');
                $table->unsignedBigInteger('doctor_id');
                $table->unsignedBigInteger('schedule_id')->nullable();
                $table->unsignedBigInteger('reminder_log_id')->nullable();
                $table->dateTime('reaction_time')->nullable();
                $table->string('reaction_type', 120)->nullable();
                $table->string('severity', 30)->default('mild');
                $table->text('description')->nullable();
                $table->text('action_taken')->nullable();
                $table->timestamps();
            });
        } else {
            $this->addColumnIfMissing('medication_reactions', 'patient_id', fn (Blueprint $table) => $table->unsignedBigInteger('patient_id')->nullable());
            $this->addColumnIfMissing('medication_reactions', 'doctor_id', fn (Blueprint $table) => $table->unsignedBigInteger('doctor_id')->nullable());
            $this->addColumnIfMissing('medication_reactions', 'schedule_id', fn (Blueprint $table) => $table->unsignedBigInteger('schedule_id')->nullable());
            $this->addColumnIfMissing('medication_reactions', 'reminder_log_id', fn (Blueprint $table) => $table->unsignedBigInteger('reminder_log_id')->nullable());
            $this->addColumnIfMissing('medication_reactions', 'reaction_time', fn (Blueprint $table) => $table->dateTime('reaction_time')->nullable());
            $this->addColumnIfMissing('medication_reactions', 'reaction_type', fn (Blueprint $table) => $table->string('reaction_type', 120)->nullable());
            $this->addColumnIfMissing('medication_reactions', 'severity', fn (Blueprint $table) => $table->string('severity', 30)->default('mild'));
            $this->addColumnIfMissing('medication_reactions', 'description', fn (Blueprint $table) => $table->text('description')->nullable());
            $this->addColumnIfMissing('medication_reactions', 'action_taken', fn (Blueprint $table) => $table->text('action_taken')->nullable());
            $this->addColumnIfMissing('medication_reactions', 'created_at', fn (Blueprint $table) => $table->timestamp('created_at')->nullable());
            $this->addColumnIfMissing('medication_reactions', 'updated_at', fn (Blueprint $table) => $table->timestamp('updated_at')->nullable());
        }

        $this->addIndexIfMissing('medication_reactions', ['doctor_id', 'reaction_time'], 'idx_medication_reactions_doctor_date');
        $this->addIndexIfMissing('medication_reactions', ['patient_id', 'reaction_time'], 'idx_medication_reactions_patient_date');
    }

    private function addColumnIfMissing(string $table, string $column, callable $callback): void
    {
        if (! Schema::hasTable($table) || Schema::hasColumn($table, $column)) {
            return;
        }

        Schema::table($table, fn (Blueprint $blueprint) => $callback($blueprint));
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

    private function dropIndexIfExists(string $table, string $index): void
    {
        if (! Schema::hasTable($table) || ! $this->indexExists($table, $index)) {
            return;
        }

        Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropIndex($index));
    }

    private function indexExists(string $table, string $index): bool
    {
        $table = str_replace('`', '``', $table);

        return DB::select("SHOW INDEX FROM `{$table}` WHERE Key_name = ?", [$index]) !== [];
    }
};
