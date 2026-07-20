<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HealthMetricAlert;
use App\Models\MedicalRecord;
use App\Models\MedicationReaction;
use App\Models\MedicationReminderLog;
use App\Models\MedicationSchedule;
use App\Models\Patient;
use App\Models\Prescription;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Response;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    public function overview(Request $request)
    {
        return response()->json($this->buildOverview($request));
    }

    public function export(Request $request)
    {
        $data = $request->validate([
            'format' => ['nullable', Rule::in(['csv', 'pdf'])],
            'period' => ['nullable', Rule::in(['day', 'week', 'month', 'year'])],
            'from_date' => ['nullable', 'date_format:Y-m-d'],
            'to_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from_date'],
        ]);

        $overview = $this->buildOverview($request);
        $format = $data['format'] ?? 'csv';
        $filename = 'bao-cao-y-te-'.$overview['from_date'].'-'.$overview['to_date'];

        if ($format === 'pdf') {
            $html = view('reports.overview', ['report' => $overview])->render();

            return Pdf::loadHTML($html)->download("{$filename}.pdf");
        }

        $rows = [
            ['Chi tieu', 'Gia tri'],
            ['Tu ngay', $overview['from_date']],
            ['Den ngay', $overview['to_date']],
            ['Tong benh nhan', $overview['total_patients']],
            ['Ho so benh an', $overview['total_medical_records']],
            ['Toa thuoc', $overview['total_prescriptions']],
            ['Lich uong thuoc', $overview['total_medication_schedules']],
            ['Da nhac uong thuoc', $overview['medication_reminders_sent']],
            ['Da uong', $overview['medication_reminders_taken']],
            ['Bo lo', $overview['medication_reminders_missed']],
            ['Canh bao suc khoe dang mo', $overview['open_health_alerts']],
            ['Phan ung sau dung thuoc', $overview['medication_reactions']],
        ];

        $csv = collect($rows)
            ->map(fn ($row) => collect($row)->map(fn ($value) => '"'.str_replace('"', '""', (string) $value).'"')->implode(','))
            ->implode("\n");

        return Response::make("\xEF\xBB\xBF".$csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}.csv\"",
        ]);
    }

    private function buildOverview(Request $request): array
    {
        $data = $request->validate([
            'period' => ['nullable', Rule::in(['day', 'week', 'month', 'year'])],
            'from_date' => ['nullable', 'date_format:Y-m-d'],
            'to_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from_date'],
        ]);

        [$start, $end] = $this->dateRange($data);
        $doctorId = $request->user()->doctor_id;

        $medicalRecordQuery = MedicalRecord::query()
            ->where('doctor_id', $doctorId)
            ->whereBetween('visit_date', [$start->toDateString(), $end->toDateString()]);

        $patientIds = (clone $medicalRecordQuery)->select('patient_id')->distinct();

        $prescriptionQuery = Prescription::query()
            ->whereHas('medicalRecord', fn ($record) => $record->where('doctor_id', $doctorId))
            ->whereBetween('start_date', [$start->toDateString(), $end->toDateString()]);

        $scheduleQuery = MedicationSchedule::query()
            ->whereHas('prescriptionDetail.prescription.medicalRecord', fn ($record) => $record->where('doctor_id', $doctorId))
            ->whereDate('start_date', '<=', $end->toDateString())
            ->whereDate('end_date', '>=', $start->toDateString());

        $reminderQuery = MedicationReminderLog::query()
            ->where('doctor_id', $doctorId)
            ->whereBetween('reminder_date', [$start->toDateString(), $end->toDateString()]);

        return [
            'generated_at' => now()->toISOString(),
            'from_date' => $start->toDateString(),
            'to_date' => $end->toDateString(),
            'total_patients' => Patient::query()->whereIn('patient_id', $patientIds)->count(),
            'total_medical_records' => (clone $medicalRecordQuery)->count(),
            'total_prescriptions' => (clone $prescriptionQuery)->count(),
            'active_prescriptions' => (clone $prescriptionQuery)->whereIn('status', Prescription::ACTIVE_STATUSES)->count(),
            'total_medication_schedules' => (clone $scheduleQuery)->count(),
            'active_medication_schedules' => (clone $scheduleQuery)->whereIn('status', MedicationSchedule::ACTIVE_STATUSES)->count(),
            'medication_reminders_sent' => (clone $reminderQuery)->count(),
            'medication_reminders_taken' => (clone $reminderQuery)->where('status', MedicationReminderLog::TAKEN_STATUS)->count(),
            'medication_reminders_missed' => (clone $reminderQuery)->where('status', MedicationReminderLog::MISSED_STATUS)->count(),
            'open_health_alerts' => HealthMetricAlert::query()
                ->where('doctor_id', $doctorId)
                ->where('status', HealthMetricAlert::OPEN_STATUS)
                ->whereBetween('alert_time', [$start, $end])
                ->count(),
            'medication_reactions' => MedicationReaction::query()
                ->where('doctor_id', $doctorId)
                ->whereBetween('reaction_time', [$start, $end])
                ->count(),
        ];
    }

    private function dateRange(array $data): array
    {
        if (! empty($data['from_date'])) {
            $start = Carbon::createFromFormat('Y-m-d', $data['from_date'])->startOfDay();
            $end = Carbon::createFromFormat('Y-m-d', $data['to_date'] ?? $data['from_date'])->endOfDay();

            return [$start, $end];
        }

        $now = now();

        return match ($data['period'] ?? 'month') {
            'day' => [$now->copy()->startOfDay(), $now->copy()->endOfDay()],
            'week' => [$now->copy()->startOfWeek(), $now->copy()->endOfWeek()],
            'year' => [$now->copy()->startOfYear(), $now->copy()->endOfYear()],
            default => [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()],
        };
    }
}
