<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('patient')) {
            return;
        }

        if (Schema::hasColumn('patient', 'medical_history') && ! Schema::hasColumn('patient', 'underlying_disease')) {
            Schema::table('patient', function (Blueprint $table) {
                $table->renameColumn('medical_history', 'underlying_disease');
            });
        } elseif (! Schema::hasColumn('patient', 'underlying_disease')) {
            Schema::table('patient', function (Blueprint $table) {
                $table->text('underlying_disease')->nullable()->after('address');
            });
        } elseif (Schema::hasColumn('patient', 'medical_history')) {
            DB::table('patient')
                ->whereNull('underlying_disease')
                ->whereNotNull('medical_history')
                ->update(['underlying_disease' => DB::raw('medical_history')]);
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('patient')) {
            return;
        }

        if (Schema::hasColumn('patient', 'underlying_disease') && ! Schema::hasColumn('patient', 'medical_history')) {
            Schema::table('patient', function (Blueprint $table) {
                $table->renameColumn('underlying_disease', 'medical_history');
            });
        }
    }
};
