<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HealthMetricAlert;
use App\Models\HealthMetric;
use App\Models\MedicalRecord;
use App\Models\MedicationReaction;
use App\Models\MedicationReminderLog;
use App\Models\MedicationSchedule;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\PatientFeedback;
use App\Models\Prescription;
use App\Models\ScheduleTime;
use Illuminate\Support\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class DashboardController extends Controller
{
    public function __invoke(Request $request)
    {
        $doctorId = $request->user()->doctor_id;
        $includeReport = $request->boolean('include_report');
        $period = $this->dashboardPeriod(
            $request->string('period')->toString(),
            $request->string('from_date')->toString(),
            $request->string('to_date')->toString(),
        );

        return response()->json($this->cachedForUser(
            $request,
            'dashboard:'.$period['key'].':'.$period['start']->toDateString().':'.$period['end']->toDateString().':report:'.(int) $includeReport,
            function () use ($doctorId, $includeReport, $period) {
        $start = $period['start'];
        $end = $period['end'];
        $allPatientIdsQuery = MedicalRecord::where('doctor_id', $doctorId)
            ->select('patient_id')
            ->distinct();
        $allMedicalRecordQuery = MedicalRecord::where('doctor_id', $doctorId);
        $allPrescriptionQuery = Prescription::whereHas('medicalRecord', fn ($record) => $record->where('doctor_id', $doctorId));
        $allScheduleQuery = MedicationSchedule::whereHas(
            'prescriptionDetail.prescription.medicalRecord',
            fn ($record) => $record->where('doctor_id', $doctorId),
        );
        $patientIds = MedicalRecord::where('doctor_id', $doctorId)
            ->whereBetween('visit_date', [$start->toDateString(), $end->toDateString()])
            ->select('patient_id');
        $patientIdList = (clone $patientIds)->distinct()->pluck('patient_id');
        $medicalRecordQuery = MedicalRecord::where('doctor_id', $doctorId)
            ->whereBetween('visit_date', [$start->toDateString(), $end->toDateString()]);
        $prescriptionQuery = Prescription::whereHas('medicalRecord', fn ($record) => $record->where('doctor_id', $doctorId))
            ->whereBetween('prescriptions.start_date', [$start->toDateString(), $end->toDateString()]);
        $scheduleQuery = MedicationSchedule::whereHas(
            'prescriptionDetail.prescription.medicalRecord',
            fn ($record) => $record->where('doctor_id', $doctorId),
        )
            ->whereDate('medicine_schedules.start_date', '<=', $end->toDateString())
            ->whereDate('medicine_schedules.end_date', '>=', $start->toDateString());
        $completedStatuses = array_merge(
            MedicalRecord::COMPLETED_STATUSES,
            MedicalRecord::LEGACY_COMPLETED_STATUSES,
        );
        $scheduleHasStatus = Schema::hasColumn('medicine_schedules', 'status');
        $reminderLogQuery = MedicationReminderLog::query()
            ->where('doctor_id', $doctorId)
            ->whereBetween('reminder_date', [$start->toDateString(), $end->toDateString()]);
        $totalReminderLogs = (clone $reminderLogQuery)->count();
        $takenReminderLogs = (clone $reminderLogQuery)->where('status', MedicationReminderLog::TAKEN_STATUS)->count();
        $missedReminderLogs = (clone $reminderLogQuery)->where('status', MedicationReminderLog::MISSED_STATUS)->count();
        $todayReminderLogQuery = MedicationReminderLog::query()
            ->where('doctor_id', $doctorId)
            ->whereDate('reminder_date', now()->toDateString());
        $data = [
            'generated_at' => now(),
            'period' => $period['key'],
            'period_label' => $period['label'],
            'period_start' => $start->toDateString(),
            'period_end' => $end->toDateString(),
            'total_patients' => (clone $allPatientIdsQuery)->count('patient_id'),
            'period_patients' => $patientIdList->count(),
            'total_medical_records' => (clone $allMedicalRecordQuery)->count(),
            'period_medical_records' => (clone $medicalRecordQuery)->count(),
            'active_medical_records' => (clone $allMedicalRecordQuery)
                ->whereIn('status', MedicalRecord::activeStatusValues())
                ->count(),
            'completed_medical_records' => (clone $allMedicalRecordQuery)
                ->whereIn('status', $completedStatuses)
                ->count(),
            'new_medical_records_this_month' => (clone $medicalRecordQuery)
                ->count(),
            'total_prescriptions' => (clone $allPrescriptionQuery)->count(),
            'period_prescriptions' => (clone $prescriptionQuery)->count(),
            'active_prescriptions' => (clone $allPrescriptionQuery)
                ->whereIn('status', Prescription::ACTIVE_STATUSES)
                ->count(),
            'completed_prescriptions' => (clone $allPrescriptionQuery)
                ->whereIn('status', Prescription::COMPLETED_STATUSES)
                ->count(),
            'low_stock_alerts' => Medicine::where('quantity', '<=', 10)->count(),
            'medicine_schedules' => (clone $allScheduleQuery)->count(),
            'period_medicine_schedules' => (clone $scheduleQuery)->count(),
            'active_medicine_schedules' => $scheduleHasStatus
                ? (clone $allScheduleQuery)->whereIn('status', MedicationSchedule::ACTIVE_STATUSES)->count()
                : (clone $allScheduleQuery)->count(),
            'paused_medicine_schedules' => $scheduleHasStatus
                ? (clone $allScheduleQuery)->whereIn('status', MedicationSchedule::PAUSED_STATUSES)->count()
                : 0,
            'cancelled_medicine_schedules' => $scheduleHasStatus
                ? (clone $allScheduleQuery)->whereIn('status', MedicationSchedule::CANCELLED_STATUSES)->count()
                : 0,
            'medication_reminders_sent' => $totalReminderLogs,
            'medication_reminders_taken' => $takenReminderLogs,
            'medication_reminders_missed' => $missedReminderLogs,
            'today_medication_reminders_sent' => (clone $todayReminderLogQuery)->count(),
            'today_medication_reminders_taken' => (clone $todayReminderLogQuery)->where('status', MedicationReminderLog::TAKEN_STATUS)->count(),
            'today_medication_reminders_missed' => (clone $todayReminderLogQuery)->where('status', MedicationReminderLog::MISSED_STATUS)->count(),
            'medication_compliance_rate' => $totalReminderLogs > 0
                ? (int) round(($takenReminderLogs / $totalReminderLogs) * 100)
                : 0,
            'patient_feedbacks' => PatientFeedback::where('doctor_id', $doctorId)
                ->whereBetween('feedback_date', [$start->toDateString(), $end->toDateString()])
                ->count(),
            'medication_reactions' => MedicationReaction::where('doctor_id', $doctorId)
                ->whereBetween('reaction_time', [$start, $end])
                ->count(),
            'open_health_alerts' => HealthMetricAlert::where('doctor_id', $doctorId)
                ->where('status', HealthMetricAlert::OPEN_STATUS)
                ->whereBetween('alert_time', [$start, $end])
                ->count(),
            'health_metrics' => HealthMetric::query()
                ->whereIn('patient_id', clone $allPatientIdsQuery)
                ->count(),
            'period_health_metrics' => HealthMetric::query()
                ->whereIn('patient_id', clone $allPatientIdsQuery)
                ->whereBetween('measure_time', [$start, $end])
                ->count(),
            'recent_health_metrics' => HealthMetric::query()
                ->select(['health_metric_id', 'patient_id', 'health_type_id', 'measure_time', 'value'])
                ->with([
                    'patient:patient_id,full_name',
                    'healthType:health_type_id,health_type_name',
                ])
                ->whereIn('patient_id', clone $allPatientIdsQuery)
                ->whereBetween('measure_time', [$start, $end])
                ->latest('measure_time')
                ->limit(8)
                ->get(),
            'patient_trend' => $this->patientTrend($doctorId, $start, $end),
            'today_schedules' => $this->todaySchedules($doctorId, $scheduleHasStatus),
            'today_medication_overview' => $this->todayMedicationOverview($doctorId, $scheduleHasStatus),
            'upcoming_appointments' => $this->upcomingAppointments($doctorId),
            'recent_notifications' => $this->recentNotifications($doctorId),
            'recent_activities' => $this->recentActivities($doctorId),
        ];

        if ($includeReport) {
            $activeRecordsByPatient = (clone $medicalRecordQuery)
                ->whereIn('status', MedicalRecord::activeStatusValues())
                ->selectRaw('patient_id, count(*) as total')
                ->groupBy('patient_id')
                ->pluck('total', 'patient_id');
            $schedulesByPatient = (clone $scheduleQuery)
                ->selectRaw('medical_records.patient_id as patient_id, count(*) as total')
                ->join('prescription_details', 'medicine_schedules.prescription_detail_id', '=', 'prescription_details.prescription_detail_id')
                ->join('prescriptions', 'prescription_details.prescription_id', '=', 'prescriptions.prescription_id')
                ->join('medical_records', 'prescriptions.record_id', '=', 'medical_records.record_id')
                ->where('medical_records.doctor_id', $doctorId)
                ->groupBy('medical_records.patient_id')
                ->pluck('total', 'patient_id');
            $data['report_patients'] = Patient::whereIn('patient_id', $patientIdList)
                ->withCount([
                    'medicalRecords as medical_records_count' => fn ($query) => $query
                        ->where('doctor_id', $doctorId)
                        ->whereBetween('visit_date', [$start->toDateString(), $end->toDateString()]),
                    'prescriptions as prescriptions_count' => fn ($query) => $query
                        ->whereHas('medicalRecord', fn ($record) => $record->where('doctor_id', $doctorId))
                        ->whereBetween('prescriptions.start_date', [$start->toDateString(), $end->toDateString()]),
                    'healthMetrics as health_metrics_count' => fn ($query) => $query->whereBetween('measure_time', [$start, $end]),
                ])
                ->orderBy('full_name')
                ->get(['patient_id', 'full_name', 'phone', 'gender', 'date_of_birth'])
                ->map(fn (Patient $patient) => [
                    'patient_id' => $patient->patient_id,
                    'full_name' => $patient->full_name,
                    'phone' => $patient->phone,
                    'gender' => $patient->gender,
                    'date_of_birth' => $patient->date_of_birth,
                    'medical_records_count' => $patient->medical_records_count,
                    'active_medical_records_count' => (int) ($activeRecordsByPatient[$patient->patient_id] ?? 0),
                    'prescriptions_count' => $patient->prescriptions_count,
                    'medicine_schedules_count' => (int) ($schedulesByPatient[$patient->patient_id] ?? 0),
                    'health_metrics_count' => $patient->health_metrics_count,
                ]);
        }

        return $data;
        }, $includeReport ? 120 : 45));
    }

    private function dashboardPeriod(?string $period, ?string $fromDate = null, ?string $toDate = null): array
    {
        if ($fromDate && $toDate) {
            $start = Carbon::createFromFormat('Y-m-d', $fromDate)->startOfDay();
            $end = Carbon::createFromFormat('Y-m-d', $toDate)->endOfDay();
            if ($end->greaterThanOrEqualTo($start)) {
                return [
                    'key' => 'custom',
                    'label' => 'Tùy chọn',
                    'start' => $start,
                    'end' => $end,
                ];
            }
        }

        $key = Str::of($period ?: 'month')->lower()->toString();
        if (! in_array($key, ['day', 'week', 'month', 'year'], true)) {
            $key = 'month';
        }

        $now = now();

        return match ($key) {
            'day' => [
                'key' => 'day',
                'label' => 'Hôm nay',
                'start' => $now->copy()->startOfDay(),
                'end' => $now->copy()->endOfDay(),
            ],
            'week' => [
                'key' => 'week',
                'label' => 'Tuần này',
                'start' => $now->copy()->startOfWeek(),
                'end' => $now->copy()->endOfWeek(),
            ],
            'year' => [
                'key' => 'year',
                'label' => 'Năm này',
                'start' => $now->copy()->startOfYear(),
                'end' => $now->copy()->endOfYear(),
            ],
            default => [
                'key' => 'month',
                'label' => 'Tháng này',
                'start' => $now->copy()->startOfMonth(),
                'end' => $now->copy()->endOfMonth(),
            ],
        };
    }

    private function todaySchedules(int $doctorId, bool $scheduleHasStatus)
    {
        $today = now()->toDateString();
        $columns = ['schedule_id', 'prescription_detail_id', 'start_date', 'end_date'];
        $medicalRecordColumns = collect(['record_id', 'patient_id', 'doctor_id', 'visit_date', 'status'])
            ->merge(Schema::hasColumn('medical_records', 'diagnosis') ? ['diagnosis'] : [])
            ->values()
            ->implode(',');
        if ($scheduleHasStatus) {
            $columns[] = 'status';
        }

        $schedules = MedicationSchedule::query()
            ->select($columns)
            ->with([
                'times:schedule_time_id,schedule_id,time_take',
                'prescriptionDetail:prescription_detail_id,prescription_id,medicine_id,dosage,meal_time_id',
                'prescriptionDetail.medicine:medicine_id,medicine_name',
                'prescriptionDetail.mealTime:meal_time_id,meal_time_name',
                'prescriptionDetail.prescription:prescription_id,record_id,start_date,end_date,status',
                'prescriptionDetail.prescription.medicalRecord:'.$medicalRecordColumns,
                'prescriptionDetail.prescription.medicalRecord.patient:patient_id,full_name',
            ])
            ->whereHas(
                'prescriptionDetail.prescription.medicalRecord',
                fn ($record) => $record->where('doctor_id', $doctorId),
            )
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->when($scheduleHasStatus, fn ($query) => $query->whereIn('status', MedicationSchedule::ACTIVE_STATUSES))
            ->orderBy('start_date')
            ->limit(8)
            ->get();

        $reminderLogs = MedicationReminderLog::query()
            ->where('doctor_id', $doctorId)
            ->whereDate('reminder_date', $today)
            ->whereIn('schedule_id', $schedules->pluck('schedule_id'))
            ->get()
            ->groupBy(function (MedicationReminderLog $log) {
                $timeKey = $log->schedule_time_id ?: substr((string) $log->reminder_time, 0, 5);

                return "{$log->schedule_id}|{$timeKey}";
            });

        return $schedules
            ->map(function (MedicationSchedule $schedule) use ($reminderLogs) {
                $detail = $schedule->prescriptionDetail;
                $record = $detail?->prescription?->medicalRecord;
                $timeStatuses = [];

                foreach ($schedule->times as $time) {
                    $timeText = substr((string) $time->time_take, 0, 5);
                    $log = ($reminderLogs->get("{$schedule->schedule_id}|{$time->schedule_time_id}")?->first())
                        ?: ($reminderLogs->get("{$schedule->schedule_id}|{$timeText}")?->first());
                    $timeStatuses[$timeText] = $log?->status ?: 'Chưa nhắc';
                }

                return [
                    'schedule_id' => $schedule->schedule_id,
                    'patient_name' => $record?->patient?->full_name,
                    'medicine_name' => $detail?->medicine?->medicine_name,
                    'dosage' => $detail?->dosage,
                    'meal_time' => $detail?->mealTime?->meal_time_name,
                    'times' => $schedule->times
                        ->pluck('time_take')
                        ->map(fn ($time) => substr((string) $time, 0, 5))
                        ->filter()
                        ->values(),
                    'schedule_status' => $schedule->status
                        ? MedicationSchedule::normalizeStatus($schedule->status)
                        : MedicationSchedule::ACTIVE_STATUS,
                    'time_statuses' => $timeStatuses,
                    'start_date' => $schedule->start_date,
                    'end_date' => $schedule->end_date,
                ];
            });
    }

    private function todayMedicationOverview(int $doctorId, bool $scheduleHasStatus): array
    {
        $today = now()->toDateString();
        $baseQuery = MedicationSchedule::query()
            ->join('prescription_details', 'medicine_schedules.prescription_detail_id', '=', 'prescription_details.prescription_detail_id')
            ->join('prescriptions', 'prescription_details.prescription_id', '=', 'prescriptions.prescription_id')
            ->join('medical_records', 'prescriptions.record_id', '=', 'medical_records.record_id')
            ->where('medical_records.doctor_id', $doctorId)
            ->whereDate('medicine_schedules.start_date', '<=', $today)
            ->whereDate('medicine_schedules.end_date', '>=', $today)
            ->when($scheduleHasStatus, fn ($query) => $query->whereIn('medicine_schedules.status', MedicationSchedule::ACTIVE_STATUSES));

        $timeRows = ScheduleTime::query()
            ->join('medicine_schedules', 'schedule_times.schedule_id', '=', 'medicine_schedules.schedule_id')
            ->join('prescription_details', 'medicine_schedules.prescription_detail_id', '=', 'prescription_details.prescription_detail_id')
            ->join('prescriptions', 'prescription_details.prescription_id', '=', 'prescriptions.prescription_id')
            ->join('medical_records', 'prescriptions.record_id', '=', 'medical_records.record_id')
            ->where('medical_records.doctor_id', $doctorId)
            ->whereDate('medicine_schedules.start_date', '<=', $today)
            ->whereDate('medicine_schedules.end_date', '>=', $today)
            ->when($scheduleHasStatus, fn ($query) => $query->whereIn('medicine_schedules.status', MedicationSchedule::ACTIVE_STATUSES))
            ->pluck('schedule_times.time_take');

        $sessions = [
            'morning' => ['key' => 'morning', 'label' => 'Buổi sáng', 'count' => 0, 'times' => []],
            'noon' => ['key' => 'noon', 'label' => 'Buổi trưa', 'count' => 0, 'times' => []],
            'afternoon' => ['key' => 'afternoon', 'label' => 'Buổi chiều', 'count' => 0, 'times' => []],
        ];

        foreach ($timeRows as $time) {
            $hour = (int) substr((string) $time, 0, 2);
            if ($hour < 11) {
                $sessionKey = 'morning';
            } elseif ($hour < 14) {
                $sessionKey = 'noon';
            } else {
                $sessionKey = 'afternoon';
            }

            $sessions[$sessionKey]['count']++;
            $sessions[$sessionKey]['times'][] = substr((string) $time, 0, 5);
        }

        $sessions = collect($sessions)
            ->map(function (array $session) {
                $session['times'] = collect($session['times'])
                    ->filter()
                    ->unique()
                    ->sort()
                    ->values()
                    ->all();

                return $session;
            })
            ->values()
            ->all();

        return [
            'date' => $today,
            'total_patients' => (clone $baseQuery)->distinct()->count('medical_records.patient_id'),
            'total_schedules' => (clone $baseQuery)->count('medicine_schedules.schedule_id'),
            'total_times' => $timeRows->count(),
            'sessions' => $sessions,
        ];
    }

    private function patientTrend(int $doctorId, Carbon $start, Carbon $end): array
    {
        $days = $start->copy()->startOfDay()->diffInDays($end->copy()->startOfDay()) + 1;
        $daily = $days <= 62;
        $formatSql = $daily ? 'DATE(visit_date)' : "DATE_FORMAT(visit_date, '%Y-%m')";
        $formatPhp = $daily ? 'Y-m-d' : 'Y-m';
        $labelPhp = $daily ? 'd/m' : 'm/Y';
        $step = $daily ? 'addDay' : 'addMonth';
        $completedStatuses = array_merge(
            MedicalRecord::COMPLETED_STATUSES,
            MedicalRecord::LEGACY_COMPLETED_STATUSES,
        );

        $rows = MedicalRecord::query()
            ->where('doctor_id', $doctorId)
            ->whereBetween('visit_date', [$start->toDateString(), $end->toDateString()])
            ->selectRaw("{$formatSql} as bucket")
            ->selectRaw('COUNT(DISTINCT patient_id) as total_patients')
            ->selectRaw(
                'COUNT(DISTINCT CASE WHEN status IN ('.implode(',', array_fill(0, count(MedicalRecord::activeStatusValues()), '?')).') THEN patient_id END) as active_patients',
                MedicalRecord::activeStatusValues(),
            )
            ->selectRaw(
                'COUNT(DISTINCT CASE WHEN status IN ('.implode(',', array_fill(0, count($completedStatuses), '?')).') THEN patient_id END) as completed_patients',
                $completedStatuses,
            )
            ->groupBy('bucket')
            ->orderBy('bucket')
            ->get()
            ->keyBy('bucket');

        $result = [];
        $cursor = $start->copy()->startOf($daily ? 'day' : 'month');
        $last = $end->copy()->startOf($daily ? 'day' : 'month');
        while ($cursor->lessThanOrEqualTo($last)) {
            $key = $cursor->format($formatPhp);
            $row = $rows->get($key);
            $active = (int) ($row->active_patients ?? 0);
            $completed = (int) ($row->completed_patients ?? 0);
            $total = (int) ($row->total_patients ?? 0);

            $result[] = [
                'key' => $key,
                'label' => $cursor->format($labelPhp),
                'total_patients' => $total,
                'active_patients' => $active,
                'completed_patients' => $completed,
                'tooltip' => [
                    'period' => $daily ? $cursor->format('d/m/Y') : 'Tháng '.$cursor->format('m/Y'),
                    'active_patients' => $active,
                    'completed_patients' => $completed,
                    'total_patients' => $total,
                ],
            ];

            $cursor->{$step}();
        }

        return $result;
    }

    private function recentActivities(int $doctorId)
    {
        $records = MedicalRecord::query()
            ->select(['record_id', 'patient_id', 'created_at', 'visit_date'])
            ->with('patient:patient_id,full_name')
            ->where('doctor_id', $doctorId)
            ->latest('created_at')
            ->limit(5)
            ->get()
            ->map(fn (MedicalRecord $record) => [
                'type' => 'medical_record',
                'title' => 'Tạo hồ sơ bệnh án HS-'.str_pad((string) $record->record_id, 3, '0', STR_PAD_LEFT),
                'description' => $record->patient?->full_name ?: 'Bệnh nhân',
                'time' => $record->created_at ?: $record->visit_date,
                'path' => '/medical-records/'.$record->record_id,
            ]);

        $prescriptions = Prescription::query()
            ->select(['prescription_id', 'record_id', 'created_at', 'start_date'])
            ->with('medicalRecord:record_id,patient_id,doctor_id', 'medicalRecord.patient:patient_id,full_name')
            ->whereHas('medicalRecord', fn ($record) => $record->where('doctor_id', $doctorId))
            ->latest('created_at')
            ->limit(5)
            ->get()
            ->map(fn (Prescription $prescription) => [
                'type' => 'prescription',
                'title' => 'Kê toa thuốc DT'.str_pad((string) $prescription->prescription_id, 3, '0', STR_PAD_LEFT),
                'description' => $prescription->medicalRecord?->patient?->full_name ?: 'Bệnh nhân',
                'time' => $prescription->created_at ?: $prescription->start_date,
                'path' => '/prescriptions',
            ]);

        $reminders = MedicationReminderLog::query()
            ->select(['schedule_id', 'patient_id', 'doctor_id', 'reminder_date', 'reminded_at', 'status'])
            ->with('patient:patient_id,full_name')
            ->where('doctor_id', $doctorId)
            ->latest('reminded_at')
            ->limit(5)
            ->get()
            ->map(fn (MedicationReminderLog $log) => [
                'type' => 'medication_reminder',
                'title' => 'Gửi nhắc thuốc',
                'description' => trim(($log->patient?->full_name ?: 'Bệnh nhân').' · '.($log->status ?: MedicationReminderLog::REMINDED_STATUS)),
                'time' => $log->reminded_at ?: $log->reminder_date,
                'path' => '/schedules',
            ]);

        $metrics = HealthMetric::query()
            ->select(['health_metric_id', 'patient_id', 'measure_time', 'created_at'])
            ->with('patient:patient_id,full_name')
            ->whereIn('patient_id', MedicalRecord::where('doctor_id', $doctorId)->select('patient_id')->distinct())
            ->latest('measure_time')
            ->limit(5)
            ->get()
            ->map(fn (HealthMetric $metric) => [
                'type' => 'health_metric',
                'title' => 'Ghi nhận chỉ số sức khỏe',
                'description' => $metric->patient?->full_name ?: 'Bệnh nhân',
                'time' => $metric->measure_time ?: $metric->created_at,
                'path' => '/health-metrics',
            ]);

        return $records
            ->concat($prescriptions)
            ->concat($reminders)
            ->concat($metrics)
            ->filter(fn (array $activity) => ! empty($activity['time']))
            ->sortByDesc('time')
            ->take(6)
            ->values();
    }

    private function upcomingAppointments(int $doctorId)
    {
        if (! Schema::hasColumn('medical_records', 'next_visit_date')) {
            return collect();
        }

        $columns = collect(['record_id', 'patient_id', 'visit_date', 'next_visit_date', 'diagnosis', 'status'])
            ->filter(fn ($column) => Schema::hasColumn('medical_records', $column))
            ->values()
            ->all();

        return MedicalRecord::query()
            ->select($columns)
            ->with('patient:patient_id,full_name')
            ->where('doctor_id', $doctorId)
            ->whereNotNull('next_visit_date')
            ->whereDate('next_visit_date', '>=', now()->toDateString())
            ->orderBy('next_visit_date')
            ->limit(6)
            ->get()
            ->map(fn (MedicalRecord $record) => [
                'record_id' => $record->record_id,
                'patient_name' => $record->patient?->full_name,
                'diagnosis' => $record->diagnosis,
                'visit_date' => $record->visit_date,
                'next_visit_date' => $record->next_visit_date,
                'status' => MedicalRecord::normalizeStatus($record->status),
            ]);
    }

    private function recentNotifications(int $doctorId)
    {
        $records = MedicalRecord::query()
            ->select(['record_id', 'patient_id', 'visit_date', 'created_at'])
            ->with('patient:patient_id,full_name')
            ->where('doctor_id', $doctorId)
            ->latest('created_at')
            ->limit(4)
            ->get()
            ->map(fn (MedicalRecord $record) => [
                'type' => 'medical_record',
                'title' => $record->patient?->full_name ?: 'Bệnh nhân',
                'message' => 'Có hồ sơ bệnh án mới',
                'time' => $record->created_at ?: $record->visit_date,
            ]);

        $prescriptions = Prescription::query()
            ->select(['prescription_id', 'record_id', 'start_date', 'created_at'])
            ->with('medicalRecord:record_id,patient_id,doctor_id', 'medicalRecord.patient:patient_id,full_name')
            ->whereHas('medicalRecord', fn ($record) => $record->where('doctor_id', $doctorId))
            ->latest('created_at')
            ->limit(4)
            ->get()
            ->map(fn (Prescription $prescription) => [
                'type' => 'prescription',
                'title' => $prescription->medicalRecord?->patient?->full_name ?: 'Bệnh nhân',
                'message' => 'Có đơn thuốc mới',
                'time' => $prescription->created_at ?: $prescription->start_date,
            ]);

        return $records
            ->concat($prescriptions)
            ->sortByDesc('time')
            ->take(5)
            ->values();
    }
}
