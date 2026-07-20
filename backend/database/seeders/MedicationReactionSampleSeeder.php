<?php

namespace Database\Seeders;

use App\Models\MedicationReaction;
use App\Models\MedicationReminderLog;
use App\Models\MedicationSchedule;
use App\Models\Patient;
use App\Models\PatientFeedback;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class MedicationReactionSampleSeeder extends Seeder
{
    public function run(): void
    {
        $doctor = User::query()
            ->where('status', '!=', 'inactive')
            ->orderBy('doctor_id')
            ->first();

        if (! $doctor) {
            return;
        }

        $schedules = MedicationSchedule::query()
            ->with([
                'times',
                'prescriptionDetail.medicine',
                'prescriptionDetail.prescription.medicalRecord.patient',
            ])
            ->whereHas('prescriptionDetail.prescription.medicalRecord', fn ($query) => $query
                ->where('doctor_id', $doctor->doctor_id))
            ->orderByDesc('schedule_id')
            ->get()
            ->unique(fn (MedicationSchedule $schedule) => $schedule
                ->prescriptionDetail?->prescription?->medicalRecord?->patient_id)
            ->values();

        $patients = Patient::query()
            ->whereHas('medicalRecords', fn ($query) => $query->where('doctor_id', $doctor->doctor_id))
            ->orderBy('patient_id')
            ->limit(3)
            ->get();

        if ($patients->isEmpty() && $schedules->isEmpty()) {
            return;
        }

        $samples = [
            [
                'offset_hours' => 2,
                'minute' => 15,
                'severity' => 'moderate',
                'title' => 'Bệnh nhân báo phản ứng sau khi uống thuốc',
                'symptoms' => 'chóng mặt, buồn nôn nhẹ, nổi mẩn đỏ vùng tay',
                'description' => 'Chưa khó thở.',
                'action' => 'Bác sĩ cần gọi lại kiểm tra, dặn bệnh nhân tạm ngưng liều tiếp theo và đến cơ sở y tế nếu triệu chứng nặng hơn.',
                'status' => 'Mới',
            ],
            [
                'offset_hours' => 5,
                'minute' => 30,
                'severity' => 'mild',
                'title' => 'Người bệnh bị ngứa sau khi uống thuốc',
                'symptoms' => 'ngứa nhẹ, nổi mẩn li ti ở cổ và cánh tay',
                'description' => 'Bệnh nhân tỉnh táo, không sốt, không đau ngực.',
                'action' => 'Bác sĩ theo dõi thêm, hướng dẫn bệnh nhân chụp lại vùng mẩn đỏ và báo lại nếu lan rộng.',
                'status' => 'Mới',
            ],
            [
                'offset_hours' => 8,
                'minute' => 45,
                'severity' => 'severe',
                'title' => 'Bệnh nhân đau bụng và khó thở sau dùng thuốc',
                'symptoms' => 'đau bụng quặn, buồn nôn nhiều, tức ngực và khó thở nhẹ',
                'description' => 'Cần ưu tiên kiểm tra vì có dấu hiệu phản ứng nặng.',
                'action' => 'Bác sĩ cần liên hệ ngay, yêu cầu người bệnh đến cơ sở y tế gần nhất nếu triệu chứng không giảm.',
                'status' => 'Đang xử lý',
            ],
        ];

        foreach ($samples as $index => $sample) {
            $this->seedReaction($doctor, $sample, $index, $schedules, $patients);
        }

        $cacheVersionKey = "api-cache-version:doctor:{$doctor->doctor_id}";
        Cache::forever($cacheVersionKey, (int) Cache::get($cacheVersionKey, 1) + 1);
    }

    private function seedReaction(
        User $doctor,
        array $sample,
        int $index,
        Collection $schedules,
        Collection $patients,
    ): void {
        $schedule = $schedules->get($index);
        $record = $schedule?->prescriptionDetail?->prescription?->medicalRecord;
        $patient = $record?->patient ?: $patients->get($index) ?: $patients->first();

        if (! $patient) {
            return;
        }

        $reactionTime = Carbon::now()
            ->subHours($sample['offset_hours'])
            ->minute($sample['minute'])
            ->second(0);
        $medicineName = $schedule?->prescriptionDetail?->medicine?->medicine_name ?: 'thuốc đang sử dụng';
        $scheduleTime = $schedule?->times?->first();

        $log = null;
        if ($schedule) {
            $log = MedicationReminderLog::query()->updateOrCreate(
                [
                    'schedule_id' => $schedule->schedule_id,
                    'schedule_time_id' => $scheduleTime?->schedule_time_id,
                    'patient_id' => $patient->patient_id,
                    'doctor_id' => $doctor->doctor_id,
                    'reminder_date' => $reactionTime->toDateString(),
                    'reminder_time' => $scheduleTime?->time_take ?: $schedule->time_of_day ?: '08:00:00',
                ],
                [
                    'reminded_at' => $reactionTime->copy()->subMinutes(40),
                    'taken_at' => $reactionTime->copy()->subMinutes(25),
                    'missed_at' => null,
                    'status' => MedicationReminderLog::TAKEN_STATUS,
                    'note' => 'Dữ liệu mẫu: bệnh nhân đã uống thuốc, sau đó báo có phản ứng.',
                ],
            );
        }

        MedicationReaction::query()->updateOrCreate(
            [
                'patient_id' => $patient->patient_id,
                'doctor_id' => $doctor->doctor_id,
                'reaction_type' => 'Phản ứng sau dùng thuốc',
                'reaction_time' => $reactionTime,
            ],
            [
                'schedule_id' => $schedule?->schedule_id,
                'reminder_log_id' => $log?->id,
                'severity' => $sample['severity'],
                'description' => "Sau khi uống {$medicineName}, bệnh nhân báo {$sample['symptoms']}. {$sample['description']}",
                'action_taken' => $sample['action'],
            ],
        );

        PatientFeedback::query()->updateOrCreate(
            [
                'doctor_id' => $doctor->doctor_id,
                'patient_id' => $patient->patient_id,
                'title' => $sample['title'],
                'feedback_date' => $reactionTime->toDateString(),
            ],
            [
                'patient_name' => $patient->full_name,
                'patient_phone' => $patient->phone,
                'content' => "Bệnh nhân phản hồi sau khi uống {$medicineName}: {$sample['symptoms']}. {$sample['description']} Đề nghị bác sĩ kiểm tra và hướng dẫn xử lý.",
                'status' => $sample['status'],
            ],
        );
    }
}
