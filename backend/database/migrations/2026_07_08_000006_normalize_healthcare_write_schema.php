<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->dedupeAndAddAutoIncrement('patients', 'patient_id', 'BIGINT UNSIGNED');
        $this->dedupeAndAddAutoIncrement('doctors', 'doctor_id', 'BIGINT UNSIGNED');
        $this->dedupeAndAddAutoIncrement('medical_records', 'record_id', 'BIGINT UNSIGNED');
        $this->dedupeAndAddAutoIncrement('medicine_schedules', 'schedule_id', 'BIGINT UNSIGNED');
        $this->dedupeAndAddAutoIncrement('health_monitorings', 'health_monitoring_id', 'BIGINT UNSIGNED');
        $this->dedupeAndAddAutoIncrement('health_metrics', 'health_metric_id', 'BIGINT UNSIGNED');
        $this->dedupeAndAddAutoIncrement('medicines', 'medicine_id', 'BIGINT UNSIGNED');
        $this->dedupeAndAddAutoIncrement('medicine_categories', 'category_id', 'BIGINT UNSIGNED');
        $this->dedupeAndAddAutoIncrement('meal_times', 'meal_time_id', 'BIGINT UNSIGNED');
        $this->dedupeAndAddAutoIncrement('health_types', 'health_type_id', 'BIGINT UNSIGNED');
        $this->dedupeAndAddAutoIncrement('frequency_types', 'frequency_id', 'INT UNSIGNED');

        if (Schema::hasTable('health_metrics') && Schema::hasColumn('health_metrics', 'metric_value')) {
            DB::statement('ALTER TABLE `health_metrics` MODIFY `metric_value` DECIMAL(12,2) NULL');
        }
    }

    public function down(): void
    {
        // No-op: this migration makes the imported schema writable by the application.
    }

    private function dedupeAndAddAutoIncrement(string $table, string $idColumn, string $columnType): void
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $idColumn)) {
            return;
        }

        $this->ensureDuplicateIdsAreExactCopies($table, $idColumn);
        $this->removeExactDuplicates($table);

        if (! $this->hasPrimaryKey($table)) {
            DB::statement(sprintf(
                'ALTER TABLE `%s` MODIFY `%s` %s NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`%s`)',
                $table,
                $idColumn,
                $columnType,
                $idColumn,
            ));
        }
    }

    private function ensureDuplicateIdsAreExactCopies(string $table, string $idColumn): void
    {
        $hash = $this->rowHashExpression($table);
        $conflict = DB::table($table)
            ->select($idColumn)
            ->selectRaw('COUNT(*) AS total')
            ->selectRaw("COUNT(DISTINCT {$hash}) AS variants")
            ->groupBy($idColumn)
            ->having('total', '>', 1)
            ->having('variants', '>', 1)
            ->first();

        if ($conflict) {
            throw new RuntimeException("Cannot dedupe {$table}: {$idColumn} {$conflict->{$idColumn}} has different row values.");
        }
    }

    private function removeExactDuplicates(string $table): void
    {
        $columns = Schema::getColumnListing($table);
        $columnList = implode(', ', array_map(fn ($column) => "`{$column}`", $columns));
        $tmpTable = "tmp_{$table}_dedupe";

        DB::statement("DROP TEMPORARY TABLE IF EXISTS `{$tmpTable}`");
        DB::statement("CREATE TEMPORARY TABLE `{$tmpTable}` AS SELECT DISTINCT {$columnList} FROM `{$table}`");
        DB::statement("DELETE FROM `{$table}`");
        DB::statement("INSERT INTO `{$table}` ({$columnList}) SELECT {$columnList} FROM `{$tmpTable}`");
        DB::statement("DROP TEMPORARY TABLE IF EXISTS `{$tmpTable}`");
    }

    private function hasPrimaryKey(string $table): bool
    {
        return ! empty(DB::select("SHOW KEYS FROM `{$table}` WHERE Key_name = 'PRIMARY'"));
    }

    private function rowHashExpression(string $table): string
    {
        $parts = collect(Schema::getColumnListing($table))
            ->map(fn ($column) => "COALESCE(CAST(`{$column}` AS CHAR), CHAR(30))")
            ->implode(', ');

        return "MD5(CONCAT_WS(CHAR(31), {$parts}))";
    }
};
