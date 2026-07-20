<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MedicationReaction;
use App\Models\MedicationReminderLog;
use App\Models\MedicationSchedule;
use App\Models\Patient;
use App\Services\DoctorRecordScope;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MedicationReactionController extends Controller
{
    public function __construct(private readonly DoctorRecordScope $scope) {}

    public function index(Request $request)
    {
        $data = $request->validate([
            'patient_id' => ['nullable', 'integer', 'exists:patients,patient_id'],
            'schedule_id' => ['nullable', 'integer', 'exists:medicine_schedules,schedule_id'],
            'from_date' => ['nullable', 'date_format:Y-m-d'],
            'to_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from_date'],
        ]);

        $query = MedicationReaction::query()
            ->with([
                'patient:patient_id,full_name,phone',
                'schedule:schedule_id,prescription_detail_id,start_date,end_date',
                'schedule.prescriptionDetail:prescription_detail_id,medicine_id,dosage',
                'schedule.prescriptionDetail.medicine:medicine_id,medicine_name',
                'reminderLog:id,reminder_date,reminder_time,status',
            ])
            ->where('doctor_id', $request->user()->doctor_id)
            ->when($data['patient_id'] ?? null, fn ($q, $id) => $q->where('patient_id', $id))
            ->when($data['schedule_id'] ?? null, fn ($q, $id) => $q->where('schedule_id', $id))
            ->when($data['from_date'] ?? null, fn ($q, $date) => $q->whereDate('reaction_time', '>=', $date))
            ->when($data['to_date'] ?? null, fn ($q, $date) => $q->whereDate('reaction_time', '<=', $date));

        return response()->json($query
            ->latest('reaction_time')
            ->paginate($this->perPage($request, 20, 50)));
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $this->attachDoctorAndPatient($request, $data);

        $reaction = MedicationReaction::create($data);

        return response()->json($reaction->fresh([
            'patient',
            'schedule.prescriptionDetail.medicine',
            'reminderLog',
        ]), 201);
    }

    public function update(Request $request, MedicationReaction $medicationReaction)
    {
        abort_unless((int) $medicationReaction->doctor_id === (int) $request->user()->doctor_id, 403);

        $data = $this->validated($request, true);
        if (isset($data['schedule_id']) || isset($data['reminder_log_id']) || isset($data['patient_id'])) {
            $this->attachDoctorAndPatient($request, $data, $medicationReaction);
        }

        $medicationReaction->update($data);

        return response()->json($medicationReaction->fresh([
            'patient',
            'schedule.prescriptionDetail.medicine',
            'reminderLog',
        ]));
    }

    public function destroy(Request $request, MedicationReaction $medicationReaction)
    {
        abort_unless((int) $medicationReaction->doctor_id === (int) $request->user()->doctor_id, 403);
        $medicationReaction->delete();

        return response()->json(['message' => 'Đã xóa ghi nhận phản ứng sau khi dùng thuốc.']);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        return $request->validate([
            'patient_id' => [$partial ? 'sometimes' : 'nullable', 'integer', 'exists:patients,patient_id'],
            'schedule_id' => ['nullable', 'integer', 'exists:medicine_schedules,schedule_id'],
            'reminder_log_id' => ['nullable', 'integer', 'exists:medication_reminder_logs,id'],
            'reaction_time' => [$partial ? 'sometimes' : 'required', 'date', 'before_or_equal:now'],
            'reaction_type' => ['nullable', 'string', 'max:120'],
            'severity' => ['nullable', Rule::in(['mild', 'moderate', 'severe'])],
            'description' => ['nullable', 'string'],
            'action_taken' => ['nullable', 'string'],
        ], [
            'reaction_time.before_or_equal' => 'Thời gian ghi nhận phản ứng không được lớn hơn hiện tại.',
        ]);
    }

    private function attachDoctorAndPatient(Request $request, array &$data, ?MedicationReaction $existing = null): void
    {
        $doctorId = $request->user()->doctor_id;
        $data['doctor_id'] = $doctorId;

        if (! empty($data['reminder_log_id'])) {
            $log = MedicationReminderLog::findOrFail($data['reminder_log_id']);
            abort_unless((int) $log->doctor_id === (int) $doctorId, 403);
            $data['patient_id'] = $log->patient_id;
            $data['schedule_id'] = $data['schedule_id'] ?? $log->schedule_id;
            return;
        }

        if (! empty($data['schedule_id'])) {
            $schedule = MedicationSchedule::with('prescriptionDetail.prescription.medicalRecord')->findOrFail($data['schedule_id']);
            $record = $schedule->prescriptionDetail->prescription->medicalRecord;
            $this->scope->assertRecord($request->user(), $record);
            $data['patient_id'] = $record->patient_id;
            return;
        }

        $patientId = $data['patient_id'] ?? $existing?->patient_id;
        abort_unless($patientId, 422, 'Vui lòng chọn bệnh nhân hoặc lịch uống thuốc để ghi nhận phản ứng.');
        $this->scope->assertPatient($request->user(), Patient::findOrFail($patientId));
        $data['patient_id'] = $patientId;
    }
}
