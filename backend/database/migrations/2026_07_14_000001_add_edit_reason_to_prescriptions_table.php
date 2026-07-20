<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('prescriptions') || Schema::hasColumn('prescriptions', 'edit_reason')) {
            return;
        }

        Schema::table('prescriptions', function (Blueprint $table) {
            $table->text('edit_reason')->nullable()->after('note');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('prescriptions') || ! Schema::hasColumn('prescriptions', 'edit_reason')) {
            return;
        }

        Schema::table('prescriptions', function (Blueprint $table) {
            $table->dropColumn('edit_reason');
        });
    }
};
