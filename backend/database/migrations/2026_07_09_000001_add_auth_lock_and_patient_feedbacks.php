<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('doctors', function (Blueprint $table) {
            if (! Schema::hasColumn('doctors', 'failed_login_attempts')) {
                $table->unsignedTinyInteger('failed_login_attempts')->default(0)->after('status');
            }
            if (! Schema::hasColumn('doctors', 'locked_until')) {
                $table->timestamp('locked_until')->nullable()->after('failed_login_attempts');
            }
            if (! Schema::hasColumn('doctors', 'last_failed_login_at')) {
                $table->timestamp('last_failed_login_at')->nullable()->after('locked_until');
            }
        });

        if (! Schema::hasTable('patient_feedbacks')) {
            Schema::create('patient_feedbacks', function (Blueprint $table) {
                $table->id('feedback_id');
                $table->unsignedBigInteger('doctor_id');
                $table->unsignedBigInteger('patient_id')->nullable();
                $table->string('patient_name', 150)->nullable();
                $table->string('patient_phone', 20)->nullable();
                $table->string('title', 180);
                $table->text('content');
                $table->string('status', 30)->default('Mới');
                $table->date('feedback_date')->nullable();
                $table->timestamps();

                $table->index('doctor_id', 'idx_patient_feedbacks_doctor_id');
                $table->index('patient_id', 'idx_patient_feedbacks_patient_id');
                $table->index('feedback_date', 'idx_patient_feedbacks_feedback_date');
                $table->index('status', 'idx_patient_feedbacks_status');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_feedbacks');

        Schema::table('doctors', function (Blueprint $table) {
            foreach (['last_failed_login_at', 'locked_until', 'failed_login_attempts'] as $column) {
                if (Schema::hasColumn('doctors', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
