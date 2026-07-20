<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('patient', 'weight')) {
            Schema::table('patient', function (Blueprint $table) {
                $table->decimal('weight', 6, 2)->nullable()->after('address');
            });
        }

        if (! Schema::hasColumn('patient', 'height')) {
            Schema::table('patient', function (Blueprint $table) {
                $table->decimal('height', 6, 2)->nullable()->after('weight');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('patient', 'height')) {
            Schema::table('patient', function (Blueprint $table) {
                $table->dropColumn('height');
            });
        }

        if (Schema::hasColumn('patient', 'weight')) {
            Schema::table('patient', function (Blueprint $table) {
                $table->dropColumn('weight');
            });
        }
    }
};
