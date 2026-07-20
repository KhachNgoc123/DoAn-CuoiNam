<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('password_reset_otps')) {
            Schema::create('password_reset_otps', function (Blueprint $table) {
                $table->id();
                $table->string('email', 150);
                $table->string('otp_hash');
                $table->timestamp('expires_at');
                $table->timestamp('used_at')->nullable();
                $table->timestamps();

                $table->index('email', 'idx_password_reset_otps_email');
                $table->index('expires_at', 'idx_password_reset_otps_expires_at');
            });

            return;
        }

        Schema::table('password_reset_otps', function (Blueprint $table) {
            if (! Schema::hasColumn('password_reset_otps', 'email')) {
                $table->string('email', 150)->index('idx_password_reset_otps_email');
            }
            if (! Schema::hasColumn('password_reset_otps', 'otp_hash')) {
                $table->string('otp_hash');
            }
            if (! Schema::hasColumn('password_reset_otps', 'expires_at')) {
                $table->timestamp('expires_at')->index('idx_password_reset_otps_expires_at');
            }
            if (! Schema::hasColumn('password_reset_otps', 'used_at')) {
                $table->timestamp('used_at')->nullable();
            }
            if (! Schema::hasColumn('password_reset_otps', 'created_at')) {
                $table->timestamp('created_at')->nullable();
            }
            if (! Schema::hasColumn('password_reset_otps', 'updated_at')) {
                $table->timestamp('updated_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_otps');
    }
};
