<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('medicine_schedules') || Schema::hasColumn('medicine_schedules', 'status')) {
            return;
        }

        Schema::table('medicine_schedules', function (Blueprint $table) {
            $table->string('status', 50)->default('Đang uống')->after('note');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('medicine_schedules') || ! Schema::hasColumn('medicine_schedules', 'status')) {
            return;
        }

        Schema::table('medicine_schedules', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
