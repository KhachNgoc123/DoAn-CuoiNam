<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->dedupeAndAddAutoIncrement('allergies', 'allergy_id', 'BIGINT UNSIGNED');
        $this->dedupeAndAddAutoIncrement('chronic_diseases', 'chronic_disease_id', 'BIGINT UNSIGNED');
        $this->dedupeAndAddAutoIncrement('medical_record_symptoms', 'medical_record_symptom_id', 'BIGINT UNSIGNED');
        $this->dedupeAndAddAutoIncrement('patient_allergies', 'patient_allergy_id', 'BIGINT UNSIGNED');
    }

    public function down(): void
    {
        // No-op: keeps imported lookup/pivot tables writable by Eloquent.
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
