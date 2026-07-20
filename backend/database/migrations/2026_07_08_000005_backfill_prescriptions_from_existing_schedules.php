<?php

use App\Models\MedicationSchedule;
use App\Models\Prescription;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('medicine_schedules')) {
            return;
        }

        $this->normalizeScheduleStatusColumn();
        $this->normalizeFrequencyTypes();
        $this->backfillPrescriptions();
        $this->backfillScheduleTimes();
    }

    public function down(): void
    {
        // Data baseline migration: do not delete existing treatment data on rollback.
    }

    private function normalizeScheduleStatusColumn(): void
    {
        if (! Schema::hasColumn('medicine_schedules', 'status')) {
            return;
        }

        $statusType = DB::selectOne("
            SELECT DATA_TYPE AS data_type
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'medicine_schedules'
              AND COLUMN_NAME = 'status'
        ")?->data_type;

        if ($statusType !== 'varchar') {
            DB::statement("ALTER TABLE medicine_schedules MODIFY status VARCHAR(30) NOT NULL DEFAULT 'Đang uống'");
        }

        DB::table('medicine_schedules')->whereIn('status', ['1', 'active'])->update([
            'status' => MedicationSchedule::ACTIVE_STATUS,
        ]);
        DB::table('medicine_schedules')->whereIn('status', ['0', 'cancelled'])->update([
            'status' => MedicationSchedule::CANCELLED_STATUS,
        ]);
    }

    private function normalizeFrequencyTypes(): void
    {
        if (! Schema::hasTable('frequency_types') || ! Schema::hasColumn('frequency_types', 'times_per_day')) {
            return;
        }

        DB::table('frequency_types')->whereIn('frequency_id', [1, 2, 3, 4])->update([
            'times_per_day' => DB::raw('frequency_id'),
        ]);

        DB::table('frequency_types')->where('frequency_name', 'like', '5 lần%')->update(['times_per_day' => 5]);
        DB::table('frequency_types')->where('frequency_name', 'like', '6 lần%')->update(['times_per_day' => 6]);
        DB::table('frequency_types')->where('frequency_name', 'like', 'Khi cần%')->update(['times_per_day' => 1]);
    }

    private function backfillPrescriptions(): void
    {
        if (
            ! Schema::hasTable('prescriptions') ||
            ! Schema::hasTable('prescription_details') ||
            ! Schema::hasTable('medical_records') ||
            ! Schema::hasTable('medicines')
        ) {
            return;
        }

        $firstMedicineId = (int) DB::table('medicines')->min('medicine_id');
        if ($firstMedicineId === 0) {
            return;
        }

        $scheduleGroups = DB::table('medicine_schedules')
            ->select([
                'prescription_detail_id',
                DB::raw('MIN(schedule_id) AS first_schedule_id'),
                DB::raw('MIN(frequency_type_id) AS frequency_type_id'),
                DB::raw('MIN(meal_time_id) AS meal_time_id'),
                DB::raw('MIN(note) AS note'),
            ])
            ->groupBy('prescription_detail_id')
            ->orderBy('prescription_detail_id')
            ->get();

        foreach ($scheduleGroups as $group) {
            $record = DB::table('medical_records')
                ->select('record_id', 'visit_date')
                ->where('record_id', $group->first_schedule_id)
                ->first()
                ?: DB::table('medical_records')->select('record_id', 'visit_date')->orderBy('record_id')->first();

            if (! $record) {
                continue;
            }

            $prescriptionId = (int) $group->prescription_detail_id;
            $startDate = $record->visit_date ? substr((string) $record->visit_date, 0, 10) : now()->toDateString();

            DB::table('prescriptions')->updateOrInsert(
                ['prescription_id' => $prescriptionId],
                [
                    'record_id' => $record->record_id,
                    'prescription_date' => $startDate,
                    'start_date' => $startDate,
                    'end_date' => $startDate,
                    'note' => $group->note,
                    'status' => Prescription::ACTIVE_STATUS,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            );

            $medicineId = DB::table('medicines')
                ->where('medicine_id', $prescriptionId)
                ->value('medicine_id') ?: $firstMedicineId;

            DB::table('prescription_details')->updateOrInsert(
                ['prescription_detail_id' => $prescriptionId],
                [
                    'prescription_id' => $prescriptionId,
                    'medicine_id' => $medicineId,
                    'dosage' => 'Theo chỉ định',
                    'frequency_type_id' => $group->frequency_type_id,
                    'meal_time_id' => $group->meal_time_id,
                    'quantity' => 1,
                    'instructions' => $group->note,
                    'note' => $group->note,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            );
        }

        DB::statement("
            UPDATE medicine_schedules ms
            JOIN prescription_details pd ON pd.prescription_detail_id = ms.prescription_detail_id
            JOIN prescriptions p ON p.prescription_id = pd.prescription_id
            SET ms.start_date = COALESCE(ms.start_date, p.start_date),
                ms.end_date = COALESCE(ms.end_date, p.end_date)
        ");
    }

    private function backfillScheduleTimes(): void
    {
        if (! Schema::hasTable('schedule_times')) {
            return;
        }

        $existingScheduleIds = DB::table('schedule_times')->pluck('schedule_id')->all();

        $schedules = DB::table('medicine_schedules')
            ->select(['schedule_id', 'time_of_day'])
            ->distinct()
            ->whereNotIn('schedule_id', $existingScheduleIds ?: [-1])
            ->orderBy('schedule_id')
            ->get();

        foreach ($schedules as $schedule) {
            DB::table('schedule_times')->insert([
                'schedule_id' => $schedule->schedule_id,
                'time_take' => $schedule->time_of_day ?: '08:00:00',
            ]);
        }
    }
};
