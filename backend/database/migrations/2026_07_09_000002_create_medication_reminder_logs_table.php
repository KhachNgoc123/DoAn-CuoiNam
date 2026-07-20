<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('medication_reminder_logs')) {
            Schema::create('medication_reminder_logs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('schedule_id');
                $table->unsignedBigInteger('schedule_time_id')->nullable();
                $table->unsignedBigInteger('patient_id');
                $table->unsignedBigInteger('doctor_id');
                $table->date('reminder_date');
                $table->time('reminder_time')->nullable();
                $table->dateTime('reminded_at')->nullable();
                $table->string('status', 30)->default('Đã nhắc');
                $table->text('note')->nullable();
            });
        } else {
            $this->addColumnIfMissing('medication_reminder_logs', 'schedule_id', fn (Blueprint $table) => $table->unsignedBigInteger('schedule_id')->nullable());
            $this->addColumnIfMissing('medication_reminder_logs', 'schedule_time_id', fn (Blueprint $table) => $table->unsignedBigInteger('schedule_time_id')->nullable());
            $this->addColumnIfMissing('medication_reminder_logs', 'patient_id', fn (Blueprint $table) => $table->unsignedBigInteger('patient_id')->nullable());
            $this->addColumnIfMissing('medication_reminder_logs', 'doctor_id', fn (Blueprint $table) => $table->unsignedBigInteger('doctor_id')->nullable());
            $this->addColumnIfMissing('medication_reminder_logs', 'reminder_date', fn (Blueprint $table) => $table->date('reminder_date')->nullable());
            $this->addColumnIfMissing('medication_reminder_logs', 'reminder_time', fn (Blueprint $table) => $table->time('reminder_time')->nullable());
            $this->addColumnIfMissing('medication_reminder_logs', 'reminded_at', fn (Blueprint $table) => $table->dateTime('reminded_at')->nullable());
            $this->addColumnIfMissing('medication_reminder_logs', 'status', fn (Blueprint $table) => $table->string('status', 30)->default('Đã nhắc'));
            $this->addColumnIfMissing('medication_reminder_logs', 'note', fn (Blueprint $table) => $table->text('note')->nullable());
        }

        $this->addIndexIfMissing('medication_reminder_logs', ['doctor_id', 'reminder_date'], 'idx_reminder_logs_doctor_date');
        $this->addIndexIfMissing('medication_reminder_logs', ['schedule_id', 'reminder_date'], 'idx_reminder_logs_schedule_date');
        $this->addIndexIfMissing('medication_reminder_logs', ['patient_id', 'reminder_date'], 'idx_reminder_logs_patient_date');
    }

    public function down(): void
    {
        $this->dropIndexIfExists('medication_reminder_logs', 'idx_reminder_logs_patient_date');
        $this->dropIndexIfExists('medication_reminder_logs', 'idx_reminder_logs_schedule_date');
        $this->dropIndexIfExists('medication_reminder_logs', 'idx_reminder_logs_doctor_date');
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
