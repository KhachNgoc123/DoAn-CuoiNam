<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('health_types') && ! Schema::hasColumn('health_types', 'health_type_name')) {
            Schema::table('health_types', function (Blueprint $table) {
                $table->string('health_type_name', 150)->nullable()->after('type_name');
            });

            if (Schema::hasColumn('health_types', 'type_name')) {
                DB::table('health_types')
                    ->whereNull('health_type_name')
                    ->update(['health_type_name' => DB::raw('type_name')]);
            }
        }

        if (Schema::hasTable('frequency_types')) {
            Schema::table('frequency_types', function (Blueprint $table) {
                if (! Schema::hasColumn('frequency_types', 'frequency_id')) {
                    $table->unsignedInteger('frequency_id')->nullable()->after('frequency_type_id');
                }
                if (! Schema::hasColumn('frequency_types', 'times_per_day')) {
                    $table->unsignedTinyInteger('times_per_day')->default(1)->after('frequency_name');
                }
            });

            if (Schema::hasColumn('frequency_types', 'frequency_type_id')) {
                DB::table('frequency_types')
                    ->whereNull('frequency_id')
                    ->update(['frequency_id' => DB::raw('frequency_type_id')]);
            }
        }
    }

    public function down(): void
    {
        // No-op: these alias columns preserve compatibility with the existing app code.
    }
};
