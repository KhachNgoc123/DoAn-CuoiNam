<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MedicationReminderLog;
use App\Models\MedicationSchedule;
use App\Models\ScheduleTime;
use App\Services\DoctorRecordScope;
use App\Services\SmsNotifier;
use Illuminate\Support\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MedicationReminderLogController extends Controller
{
    private const REMINDER_OPEN_AFTER_MINUTES = 15;
    private const REMINDER_CLOSE_AFTER_MINUTES = 60;

    public function __construct(
        private readonly DoctorRecordScope $scope,
        private readonly SmsNotifier $smsNotifier,
    ) {}

    public function index(Request $request)
    {
        $data = $request->validate([
            'from_date' => ['nullable', 'date_format:Y-m-d'],
            'to_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from_date'],
            'schedule_id' => ['nullable', 'integer'],
        ]);

        $query = MedicationReminderLog::query()
            ->select([
                'id',
                'schedule_id',
                'schedule_time_id',
                'patient_id',
                'doctor_id',
                'reminder_date',
                'reminder_time',
                'reminded_at',
                'taken_at',
                'missed_at',
                'status',
                'note',
            ])
            ->with([
                'patient:patient_id,full_name,phone',
                'schedule:schedule_id,prescription_detail_id,start_date,end_date,status',
                'schedule.prescriptionDetail:prescription_detail_id,prescription_id,medicine_id,dosage,meal_time_id,note',
                'schedule.prescriptionDetail.medicine:medicine_id,medicine_name',
                'schedule.prescriptionDetail.mealTime:meal_time_id,meal_time_name',
            ])
            ->where('doctor_id', $request->user()->doctor_id)
            ->when($data['from_date'] ?? null, fn ($q, $date) => $q->whereDate('reminder_date', '>=', $date))
            ->when($data['to_date'] ?? null, fn ($q, $date) => $q->whereDate('reminder_date', '<=', $date))
            ->when($data['schedule_id'] ?? null, fn ($q, $id) => $q->where('schedule_id', $id));

        $paginator = $query
            ->orderByDesc('reminded_at')
            ->orderByDesc('id')
            ->paginate($this->perPage($request, 50, 200));

        $paginator->getCollection()->transform(fn (MedicationReminderLog $log) => $this->item($log));

        return response()->json($paginator);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'schedule_id' => ['required', 'integer', 'exists:medicine_schedules,schedule_id'],
            'schedule_time_id' => ['nullable', 'integer', 'exists:schedule_times,schedule_time_id'],
            'reminder_date' => ['required', 'date_format:Y-m-d'],
            'reminder_time' => ['nullable', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'note' => ['nullable', 'string'],
        ]);

        $schedule = MedicationSchedule::with([
            'prescriptionDetail.prescription.medicalRecord.patient',
            'prescriptionDetail.medicine',
            'prescriptionDetail.mealTime',
        ])->findOrFail($data['schedule_id']);

        $record = $schedule->prescriptionDetail->prescription->medicalRecord;
        $this->scope->assertRecord($request->user(), $record);

        if (! empty($data['schedule_time_id'])) {
            ScheduleTime::query()
                ->where('schedule_time_id', $data['schedule_time_id'])
                ->where('schedule_id', $schedule->schedule_id)
                ->firstOrFail();
        }

        if (! $this->isReminderDue($data['reminder_date'], $data['reminder_time'] ?? null)) {
            return response()->json([
                'message' => 'Chỉ được nhắc sau giờ uống thuốc 15 phút và trong vòng 1 giờ.',
            ], 422);
        }

        $lookup = MedicationReminderLog::query()
            ->where('doctor_id', $request->user()->doctor_id)
            ->where('schedule_id', $schedule->schedule_id)
            ->where('reminder_date', $data['reminder_date'])
            ->where('reminder_time', $data['reminder_time'] ?? null);

        if (! empty($data['schedule_time_id'])) {
            $lookup->where('schedule_time_id', $data['schedule_time_id']);
        } else {
            $lookup->whereNull('schedule_time_id');
        }

        $log = $lookup->first() ?: new MedicationReminderLog([
            'schedule_id' => $schedule->schedule_id,
            'schedule_time_id' => $data['schedule_time_id'] ?? null,
            'patient_id' => $record->patient_id,
            'doctor_id' => $request->user()->doctor_id,
            'reminder_date' => $data['reminder_date'],
            'reminder_time' => $data['reminder_time'] ?? null,
        ]);

        $log->fill([
            'patient_id' => $record->patient_id,
            'doctor_id' => $request->user()->doctor_id,
            'reminded_at' => now(),
            'status' => MedicationReminderLog::REMINDED_STATUS,
            'note' => $data['note'] ?? $log->note,
        ])->save();

        $patient = $record->patient;
        if ($patient?->phone) {
            $medicineName = $schedule->prescriptionDetail?->medicine?->medicine_name ?: 'thuốc';
            $timeText = isset($data['reminder_time']) ? substr((string) $data['reminder_time'], 0, 5) : 'hôm nay';
            $this->smsNotifier->sendMedicationReminder(
                $patient->phone,
                "Nhắc uống thuốc: {$patient->full_name}, vui lòng uống {$medicineName} lúc {$timeText} theo hướng dẫn của bác sĩ.",
            );
        }

        return response()->json($this->item($log->fresh()->load([
            'patient:patient_id,full_name,phone',
            'schedule.prescriptionDetail.medicine',
            'schedule.prescriptionDetail.mealTime',
        ])), $log->wasRecentlyCreated ? 201 : 200);
    }

    private function isReminderDue(string $date, ?string $time): bool
    {
        $reminderDate = Carbon::createFromFormat('Y-m-d', $date)->startOfDay();

        if (! $reminderDate->isSameDay(now())) {
            return false;
        }

        if (! $time) {
            return true;
        }

        $normalizedTime = strlen($time) === 5 ? "{$time}:00" : $time;
        $reminderAt = Carbon::createFromFormat('Y-m-d H:i:s', "{$date} {$normalizedTime}");

        $now = now();
        return $now->betweenIncluded(
            $reminderAt->copy()->addMinutes(self::REMINDER_OPEN_AFTER_MINUTES),
            $reminderAt->copy()->addMinutes(self::REMINDER_CLOSE_AFTER_MINUTES),
        );
    }

    public function updateStatus(Request $request, MedicationReminderLog $medicationReminderLog)
    {
        abort_unless((int) $medicationReminderLog->doctor_id === (int) $request->user()->doctor_id, 403);

        $data = $request->validate([
            'status' => ['required', Rule::in(MedicationReminderLog::STATUSES)],
            'note' => ['nullable', 'string'],
        ]);

        if (
            $medicationReminderLog->status === MedicationReminderLog::TAKEN_STATUS
            && $data['status'] === MedicationReminderLog::MISSED_STATUS
        ) {
            return response()->json([
                'message' => 'Người bệnh đã uống thuốc, không thể chuyển sang bỏ lỡ.',
            ], 422);
        }

        $updates = [
            'status' => $data['status'],
            'note' => $data['note'] ?? $medicationReminderLog->note,
        ];

        if ($data['status'] === MedicationReminderLog::TAKEN_STATUS) {
            $updates['taken_at'] = now();
            $updates['missed_at'] = null;
        }

        if ($data['status'] === MedicationReminderLog::MISSED_STATUS) {
            $updates['missed_at'] = now();
            $updates['taken_at'] = null;
        }

        if ($data['status'] === MedicationReminderLog::REMINDED_STATUS) {
            $updates['taken_at'] = null;
            $updates['missed_at'] = null;
        }

        $medicationReminderLog->update($updates);

        return response()->json($this->item($medicationReminderLog->fresh()->load([
            'patient:patient_id,full_name,phone',
            'schedule.prescriptionDetail.medicine',
            'schedule.prescriptionDetail.mealTime',
        ])));
    }

    private function item(MedicationReminderLog $log): array
    {
        $detail = $log->schedule?->prescriptionDetail;

        return [
            'id' => $log->id,
            'row_id' => $log->row_id,
            'schedule_id' => $log->schedule_id,
            'schedule_time_id' => $log->schedule_time_id,
            'patient_id' => $log->patient_id,
            'patient_name' => $log->patient?->full_name ?: 'Bệnh nhân',
            'phone' => $log->patient?->phone ?: '',
            'medicine_name' => $detail?->medicine?->medicine_name ?: 'Thuốc',
            'dosage' => $detail?->dosage ?: ($detail?->note ?: ''),
            'meal' => $detail?->mealTime?->meal_time_name ?: 'Chưa chọn bữa',
            'time' => $log->reminder_time,
            'dose_date' => $log->reminder_date?->toDateString(),
            'reminded_at' => $log->reminded_at?->toISOString(),
            'taken_at' => $log->taken_at?->toISOString(),
            'missed_at' => $log->missed_at?->toISOString(),
            'status' => $log->status ?: MedicationReminderLog::REMINDED_STATUS,
            'note' => $log->note,
        ];
    }
}
