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
            return;
        }

        Schema::table('medication_reminder_logs', function (Blueprint $table) {
            if (! Schema::hasColumn('medication_reminder_logs', 'taken_at')) {
                $table->dateTime('taken_at')->nullable()->after('reminded_at');
            }
            if (! Schema::hasColumn('medication_reminder_logs', 'missed_at')) {
                $table->dateTime('missed_at')->nullable()->after('taken_at');
            }
        });

        $this->addIndexIfMissing('medication_reminder_logs', ['doctor_id', 'status', 'reminder_date'], 'idx_reminder_logs_doctor_status_date');
    }

    public function down(): void
    {
        $this->dropIndexIfExists('medication_reminder_logs', 'idx_reminder_logs_doctor_status_date');
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
