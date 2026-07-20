<?php

namespace App\Services;

use App\Models\DoctorNotification;
use App\Models\MedicationSchedule;
use App\Models\ScheduleTime;
use Carbon\Carbon;

class MedicationNotificationGenerator
{
    private const REMINDER_OPEN_AFTER_MINUTES = 15;

    public function generate(int $windowMinutes = 60): int
    {
        $window = max(self::REMINDER_OPEN_AFTER_MINUTES, min($windowMinutes, 120));
        $now = now();
        $start = $now->copy()->subMinutes($window);
        $end = $now->copy()->subMinutes(self::REMINDER_OPEN_AFTER_MINUTES);
        $today = $now->toDateString();
        $startTime = $start->format('H:i:s');
        $endTime = $end->format('H:i:s');

        $query = ScheduleTime::query()
            ->with([
                'schedule.prescriptionDetail.medicine:medicine_id,medicine_name',
                'schedule.prescriptionDetail.prescription.medicalRecord:record_id,patient_id,doctor_id',
                'schedule.prescriptionDetail.prescription.medicalRecord.patient:patient_id,full_name,phone',
            ])
            ->whereHas('schedule', function ($schedule) use ($today) {
                $schedule
                    ->whereDate('start_date', '<=', $today)
                    ->whereDate('end_date', '>=', $today)
                    ->whereIn('status', MedicationSchedule::ACTIVE_STATUSES);
            });

        if ($start->isSameDay($end)) {
            $query->whereBetween('time_take', [$startTime, $endTime]);
        } else {
            $query->where('time_take', '<=', $endTime);
        }

        $created = 0;

        $query->get()
            ->groupBy(function (ScheduleTime $time) use ($today) {
                $record = $time->schedule?->prescriptionDetail?->prescription?->medicalRecord;
                $patientId = $record?->patient_id ?: 0;
                $doctorId = $record?->doctor_id ?: 0;
                $doseTime = Carbon::parse($time->time_take)->format('H:i:s');

                return "{$doctorId}:{$patientId}:{$today}:{$doseTime}";
            })
            ->each(function ($times) use (&$created, $today) {
                /** @var \Illuminate\Support\Collection<int, ScheduleTime> $times */
                $firstTime = $times->first();
                $schedule = $firstTime?->schedule;
                $record = $schedule?->prescriptionDetail?->prescription?->medicalRecord;
                $patient = $record?->patient;

                if (! $firstTime || ! $schedule || ! $record || ! $patient) {
                    return;
                }

                $doseTime = Carbon::parse($firstTime->time_take)->format('H:i');
                $medicines = $times
                    ->map(function (ScheduleTime $time) {
                        $detail = $time->schedule?->prescriptionDetail;
                        $name = $detail?->medicine?->medicine_name ?: 'thuốc';

                        return trim($name.($detail?->dosage ? " - {$detail->dosage}" : ''));
                    })
                    ->filter()
                    ->unique()
                    ->values();

                $medicineText = $medicines->implode(', ');
                $message = "{$patient->full_name} cần uống thuốc lúc {$doseTime}";
                if ($medicineText !== '') {
                    $message .= ": {$medicineText}.";
                } else {
                    $message .= '.';
                }

                $notification = DoctorNotification::query()
                    ->where('doctor_id', $record->doctor_id)
                    ->where('patient_id', $record->patient_id)
                    ->whereDate('notification_date', $today)
                    ->where('notification_time', $firstTime->time_take)
                    ->first();

                if (! $notification) {
                    DoctorNotification::create([
                        'doctor_id' => $record->doctor_id,
                        'patient_id' => $record->patient_id,
                        'schedule_id' => $schedule->schedule_id,
                        'schedule_time_id' => $firstTime->schedule_time_id,
                        'notification_date' => $today,
                        'notification_time' => $firstTime->time_take,
                        'title' => 'Nhắc bệnh nhân uống thuốc',
                        'message' => $message,
                        'status' => DoctorNotification::PENDING_STATUS,
                    ]);
                    $created++;
                    return;
                }

                if ($notification->status === DoctorNotification::PENDING_STATUS && $notification->message !== $message) {
                    $notification->update([
                        'message' => $message,
                        'schedule_id' => $notification->schedule_id ?: $schedule->schedule_id,
                        'schedule_time_id' => $notification->schedule_time_id ?: $firstTime->schedule_time_id,
                    ]);
                }
            });

        return $created;
    }
}
