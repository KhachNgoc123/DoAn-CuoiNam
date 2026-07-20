<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DoctorNotification;
use App\Models\MedicationReminderLog;
use App\Models\MedicationSchedule;
use Illuminate\Support\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DoctorNotificationController extends Controller
{
    private const REMINDER_OPEN_AFTER_MINUTES = 15;
    private const REMINDER_CLOSE_AFTER_MINUTES = 60;

    public function index(Request $request)
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::in(DoctorNotification::STATUSES)],
            'from_date' => ['nullable', 'date_format:Y-m-d'],
            'to_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from_date'],
        ]);

        $status = $data['status'] ?? DoctorNotification::PENDING_STATUS;
        $query = DoctorNotification::query()
            ->select([
                'notification_id',
                'doctor_id',
                'patient_id',
                'schedule_id',
                'schedule_time_id',
                'notification_date',
                'notification_time',
                'title',
                'message',
                'status',
                'snoozed_until',
                'sent_at',
                'dismissed_at',
                'created_at',
                'updated_at',
            ])
            ->with([
                'patient:patient_id,full_name,phone',
                'schedule:schedule_id,prescription_detail_id,start_date,end_date,status',
                'schedule.prescriptionDetail:prescription_detail_id,prescription_id,medicine_id,dosage,meal_time_id,note',
                'schedule.prescriptionDetail.medicine:medicine_id,medicine_name',
                'schedule.prescriptionDetail.mealTime:meal_time_id,meal_time_name',
            ])
            ->where('doctor_id', $request->user()->doctor_id)
            ->when($data['from_date'] ?? null, fn ($q, $date) => $q->whereDate('notification_date', '>=', $date))
            ->when($data['to_date'] ?? null, fn ($q, $date) => $q->whereDate('notification_date', '<=', $date));

        if ($status === DoctorNotification::PENDING_STATUS) {
            $query->where(function ($inner) {
                $inner->where('status', DoctorNotification::PENDING_STATUS)
                    ->orWhere(function ($snoozed) {
                        $snoozed->where('status', DoctorNotification::SNOOZED_STATUS)
                            ->whereNotNull('snoozed_until')
                            ->where('snoozed_until', '<=', now());
                    });
            });
        } else {
            $query->where('status', $status);
        }

        $paginator = $query
            ->orderBy('notification_date')
            ->orderBy('notification_time')
            ->paginate($this->perPage($request, 50, 200));

        $paginator->getCollection()->transform(fn (DoctorNotification $notification) => $this->item($notification));

        return response()->json($paginator);
    }

    public function action(Request $request, DoctorNotification $doctorNotification)
    {
        abort_unless((int) $doctorNotification->doctor_id === (int) $request->user()->doctor_id, 403);

        $data = $request->validate([
            'action' => ['required', Rule::in(['sent', 'missed', 'dismissed', 'snooze'])],
            'minutes' => ['nullable', 'integer', 'min:1', 'max:1440'],
        ]);

        if ($data['action'] === 'snooze') {
            $doctorNotification->update([
                'status' => DoctorNotification::SNOOZED_STATUS,
                'snoozed_until' => now()->addMinutes($data['minutes'] ?? 10),
            ]);
        }

        if ($data['action'] === 'sent') {
            if (! $this->isNotificationDue($doctorNotification)) {
                return response()->json([
                    'message' => 'Chỉ được đánh dấu đã gửi sau giờ uống thuốc 15 phút và trong vòng 1 giờ.',
                ], 422);
            }

            $doctorNotification->update([
                'status' => DoctorNotification::SENT_STATUS,
                'sent_at' => now(),
                'snoozed_until' => null,
            ]);
            $this->logReminder($doctorNotification->fresh()->load('schedule.prescriptionDetail.prescription.medicalRecord'));
        }

        if ($data['action'] === 'missed') {
            $doctorNotification->update([
                'status' => DoctorNotification::MISSED_STATUS,
                'dismissed_at' => now(),
                'snoozed_until' => null,
            ]);
        }

        if ($data['action'] === 'dismissed') {
            $doctorNotification->update([
                'status' => DoctorNotification::DISMISSED_STATUS,
                'dismissed_at' => now(),
                'snoozed_until' => null,
            ]);
        }

        return response()->json($this->item($doctorNotification->fresh()->load([
            'patient:patient_id,full_name,phone',
            'schedule.prescriptionDetail.medicine',
            'schedule.prescriptionDetail.mealTime',
        ])));
    }

    private function isNotificationDue(DoctorNotification $notification): bool
    {
        $date = $notification->notification_date?->toDateString();
        if (! $date) {
            return true;
        }

        $notificationDate = Carbon::createFromFormat('Y-m-d', $date)->startOfDay();
        if (! $notificationDate->isSameDay(now())) {
            return false;
        }

        if (! $notification->notification_time) {
            return true;
        }

        $time = (string) $notification->notification_time;
        $normalizedTime = strlen($time) === 5 ? "{$time}:00" : $time;
        $notificationAt = Carbon::createFromFormat('Y-m-d H:i:s', "{$date} {$normalizedTime}");

        $now = now();
        return $now->betweenIncluded(
            $notificationAt->copy()->addMinutes(self::REMINDER_OPEN_AFTER_MINUTES),
            $notificationAt->copy()->addMinutes(self::REMINDER_CLOSE_AFTER_MINUTES),
        );
    }

    private function logReminder(DoctorNotification $notification): void
    {
        if (! $notification->patient_id || ! $notification->notification_date) {
            return;
        }

        $date = $notification->notification_date->toDateString();
        $time = $notification->notification_time;

        MedicationSchedule::query()
            ->with(['times', 'prescriptionDetail.prescription.medicalRecord'])
            ->whereHas('prescriptionDetail.prescription.medicalRecord', function ($record) use ($notification) {
                $record
                    ->where('doctor_id', $notification->doctor_id)
                    ->where('patient_id', $notification->patient_id);
            })
            ->whereDate('start_date', '<=', $date)
            ->whereDate('end_date', '>=', $date)
            ->whereIn('status', MedicationSchedule::ACTIVE_STATUSES)
            ->whereHas('times', fn ($query) => $query->where('time_take', $time))
            ->get()
            ->each(function (MedicationSchedule $schedule) use ($notification, $date, $time) {
                $schedule->times
                    ->where('time_take', $time)
                    ->each(function ($scheduleTime) use ($schedule, $notification, $date, $time) {
                        MedicationReminderLog::query()->updateOrCreate([
                            'doctor_id' => $notification->doctor_id,
                            'schedule_id' => $schedule->schedule_id,
                            'schedule_time_id' => $scheduleTime->schedule_time_id,
                            'reminder_date' => $date,
                            'reminder_time' => $time,
                        ], [
                            'patient_id' => $notification->patient_id,
                            'reminded_at' => now(),
                            'status' => MedicationReminderLog::REMINDED_STATUS,
                            'note' => 'Đánh dấu đã gửi từ thông báo bác sĩ.',
                        ]);
                    });
            });
    }

    private function item(DoctorNotification $notification): array
    {
        $detail = $notification->schedule?->prescriptionDetail;

        return [
            'id' => $notification->notification_id,
            'notification_id' => $notification->notification_id,
            'doctor_id' => $notification->doctor_id,
            'patient_id' => $notification->patient_id,
            'schedule_id' => $notification->schedule_id,
            'schedule_time_id' => $notification->schedule_time_id,
            'notification_date' => $notification->notification_date?->toDateString(),
            'notification_time' => $notification->notification_time,
            'title' => $notification->title,
            'message' => $notification->message,
            'status' => $notification->status,
            'snoozed_until' => $notification->snoozed_until?->toISOString(),
            'sent_at' => $notification->sent_at?->toISOString(),
            'dismissed_at' => $notification->dismissed_at?->toISOString(),
            'patient_name' => $notification->patient?->full_name ?: 'Bệnh nhân',
            'phone' => $notification->patient?->phone ?: '',
            'medicine_name' => $detail?->medicine?->medicine_name ?: 'Thuốc',
            'dosage' => $detail?->dosage ?: ($detail?->note ?: ''),
            'meal' => $detail?->mealTime?->meal_time_name ?: 'Chưa chọn bữa',
        ];
    }
}
