<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient', function (Blueprint $table) {
            if (! Schema::hasColumn('patient', 'underlying_disease')) {
                $table->text('underlying_disease')->nullable()->after('address');
            }
            if (! Schema::hasColumn('patient', 'allergy')) {
                $table->text('allergy')->nullable()->after('underlying_disease');
            }
        });
    }

    public function down(): void
    {
        Schema::table('patient', function (Blueprint $table) {
            if (Schema::hasColumn('patient', 'underlying_disease')) {
                $table->dropColumn('underlying_disease');
            }
            if (Schema::hasColumn('patient', 'allergy')) {
                $table->dropColumn('allergy');
            }
        });
    }
};
