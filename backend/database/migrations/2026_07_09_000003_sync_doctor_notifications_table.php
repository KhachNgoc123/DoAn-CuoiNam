<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('doctor_notifications')) {
            Schema::create('doctor_notifications', function (Blueprint $table) {
                $table->bigIncrements('notification_id');
                $table->unsignedBigInteger('doctor_id');
                $table->unsignedBigInteger('patient_id');
                $table->unsignedBigInteger('schedule_id');
                $table->unsignedBigInteger('schedule_time_id')->nullable();
                $table->date('notification_date');
                $table->time('notification_time')->nullable();
                $table->string('title', 180)->nullable();
                $table->text('message')->nullable();
                $table->string('status', 30)->default('pending');
                $table->dateTime('snoozed_until')->nullable();
                $table->dateTime('sent_at')->nullable();
                $table->dateTime('dismissed_at')->nullable();
                $table->timestamps();
            });
        } else {
            $this->addColumnIfMissing('doctor_notifications', 'doctor_id', fn (Blueprint $table) => $table->unsignedBigInteger('doctor_id')->nullable());
            $this->addColumnIfMissing('doctor_notifications', 'patient_id', fn (Blueprint $table) => $table->unsignedBigInteger('patient_id')->nullable());
            $this->addColumnIfMissing('doctor_notifications', 'schedule_id', fn (Blueprint $table) => $table->unsignedBigInteger('schedule_id')->nullable());
            $this->addColumnIfMissing('doctor_notifications', 'schedule_time_id', fn (Blueprint $table) => $table->unsignedBigInteger('schedule_time_id')->nullable());
            $this->addColumnIfMissing('doctor_notifications', 'notification_date', fn (Blueprint $table) => $table->date('notification_date')->nullable());
            $this->addColumnIfMissing('doctor_notifications', 'notification_time', fn (Blueprint $table) => $table->time('notification_time')->nullable());
            $this->addColumnIfMissing('doctor_notifications', 'title', fn (Blueprint $table) => $table->string('title', 180)->nullable());
            $this->addColumnIfMissing('doctor_notifications', 'message', fn (Blueprint $table) => $table->text('message')->nullable());
            $this->addColumnIfMissing('doctor_notifications', 'status', fn (Blueprint $table) => $table->string('status', 30)->default('pending'));
            $this->addColumnIfMissing('doctor_notifications', 'snoozed_until', fn (Blueprint $table) => $table->dateTime('snoozed_until')->nullable());
            $this->addColumnIfMissing('doctor_notifications', 'sent_at', fn (Blueprint $table) => $table->dateTime('sent_at')->nullable());
            $this->addColumnIfMissing('doctor_notifications', 'dismissed_at', fn (Blueprint $table) => $table->dateTime('dismissed_at')->nullable());
            $this->addColumnIfMissing('doctor_notifications', 'created_at', fn (Blueprint $table) => $table->timestamp('created_at')->nullable());
            $this->addColumnIfMissing('doctor_notifications', 'updated_at', fn (Blueprint $table) => $table->timestamp('updated_at')->nullable());
        }

        $this->addIndexIfMissing('doctor_notifications', ['doctor_id', 'status', 'notification_date'], 'idx_doctor_notifications_doctor_status_date');
        $this->addIndexIfMissing('doctor_notifications', ['schedule_id', 'schedule_time_id', 'notification_date'], 'idx_doctor_notifications_schedule_time_date');
        $this->addIndexIfMissing('doctor_notifications', ['patient_id', 'notification_date'], 'idx_doctor_notifications_patient_date');
    }

    public function down(): void
    {
        $this->dropIndexIfExists('doctor_notifications', 'idx_doctor_notifications_patient_date');
        $this->dropIndexIfExists('doctor_notifications', 'idx_doctor_notifications_schedule_time_date');
        $this->dropIndexIfExists('doctor_notifications', 'idx_doctor_notifications_doctor_status_date');
    }

    private function addColumnIfMissing(string $table, string $column, callable $callback): void
    {
        if (! Schema::hasTable($table) || Schema::hasColumn($table, $column)) {
            return;
        }

        Schema::table($table, fn (Blueprint $blueprint) => $callback($blueprint));
    }

    private function addIndexIfMissing(string $table, array $columns, string $index): void
    {
        if (! Schema::hasTable($table) || $this->indexExists($table, $index)) {
            return;
        }

        foreach ($columns as $column) {
            if (! Schema::hasColumn($table, $column)) {
                return;
            }
        }

        Schema::table($table, function (Blueprint $blueprint) use ($columns, $index) {
            $blueprint->index($columns, $index);
        });
    }

    private function dropIndexIfExists(string $table, string $index): void
    {
        if (! Schema::hasTable($table) || ! $this->indexExists($table, $index)) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use ($index) {
            $blueprint->dropIndex($index);
        });
    }

    private function indexExists(string $table, string $index): bool
    {
        $table = str_replace('`', '``', $table);

        return DB::select("SHOW INDEX FROM `{$table}` WHERE Key_name = ?", [$index]) !== [];
    }
};
