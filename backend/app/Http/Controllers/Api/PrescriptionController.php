<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MedicalRecord;
use App\Models\MedicationSchedule;
use App\Models\Medicine;
use App\Models\Prescription;
use App\Services\DoctorRecordScope;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PrescriptionController extends Controller
{
    public function __construct(private readonly DoctorRecordScope $scope) {}

    public function index(Request $request)
    {
        return response()->json($this->cachedForUser($request, 'prescriptions:index', function () use ($request) {
            $status = $request->status ? Prescription::normalizeStatus($request->status) : null;
            $query = Prescription::query()
                ->select(['prescription_id', 'record_id', 'prescription_date', 'start_date', 'end_date', 'duration_days', 'note', 'edit_reason', 'status'])
                ->with($this->listRelations())
                ->whereHas('medicalRecord', fn ($record) => $record->where('doctor_id', $request->user()->doctor_id))
                ->when($request->patient_id, fn ($q, $id) => $q->whereHas('medicalRecord', fn ($record) => $record->where('patient_id', $id)))
                ->when($request->from_date, fn ($q, $date) => $q->whereDate('start_date', '>=', $date))
                ->when($request->to_date, fn ($q, $date) => $q->whereDate('start_date', '<=', $date))
                ->when($request->search, fn ($q, $search) => $q->where(function ($inner) use ($search) {
                    $inner->where('prescription_id', $search)
                        ->orWhere('note', 'like', "%{$search}%")
                        ->orWhereHas('medicalRecord.patient', fn ($patient) => $patient
                            ->where('full_name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%")
                            ->orWhere('patient_id', $search))
                        ->orWhereHas('details.medicine', fn ($medicine) => $medicine
                            ->where('medicine_name', 'like', "%{$search}%"));
                }))
                ->when($status, function ($q) use ($status) {
                    if (in_array($status, Prescription::ACTIVE_STATUSES, true)) {
                        return $q
                            ->whereIn('status', Prescription::ACTIVE_STATUSES)
                            ->whereDate('end_date', '>=', today());
                    }

                    if (in_array($status, Prescription::COMPLETED_STATUSES, true)) {
                        return $q->where(function ($completed) {
                            $completed
                                ->whereIn('status', Prescription::COMPLETED_STATUSES)
                                ->orWhere(function ($expiredActive) {
                                    $expiredActive
                                        ->whereIn('status', Prescription::ACTIVE_STATUSES)
                                        ->whereDate('end_date', '<', today());
                                });
                        });
                    }

                    return $q->where('status', $status);
                });

            $paginator = $query->latest('prescription_id')->paginate($this->perPage($request, 20, 20));
            $paginator->getCollection()->transform(fn (Prescription $prescription) => $this->listItem(
                $this->decorate($prescription),
            ));

            return $paginator;
        }));
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $record = MedicalRecord::with('patient.allergies')->findOrFail($data['record_id']);
        $this->assertCanPrescribe($request, $record);
        $this->assertNoAllergyConflicts($record, $data['details'] ?? []);

        return DB::transaction(function () use ($data, $request) {
            $details = $data['details'] ?? [];
            unset($data['details']);
            Prescription::where('record_id', $data['record_id'])
                ->whereIn('status', Prescription::ACTIVE_STATUSES)
                ->update(['status' => Prescription::REPLACED_STATUS]);
            $data['status'] = Prescription::ACTIVE_STATUS;
            $prescription = Prescription::create($data);
            foreach ($details as $detail) {
                unset($detail['prescription_detail_id']);
                $prescription->details()->create($detail);
            }
            $this->syncMedicationSchedules($prescription);
            $this->flushUserApiCache($request);

            return response()->json($this->detail($prescription), 201);
        });
    }

    public function show(Request $request, Prescription $prescription)
    {
        $prescription->loadMissing('medicalRecord.patient');
        $this->scope->assertPatient($request->user(), $prescription->medicalRecord->patient);

        return response()->json($this->detail($prescription));
    }

    public function update(Request $request, Prescription $prescription)
    {
        $this->assertCanPrescribe($request, $prescription->medicalRecord);
        $data = $this->validated($request, true);
        $targetRecord = isset($data['record_id'])
            ? MedicalRecord::with('patient.allergies')->findOrFail($data['record_id'])
            : $prescription->medicalRecord;
        $targetRecord->loadMissing('patient.allergies');
        $this->assertCanPrescribe($request, $targetRecord);
        if (isset($data['details']) && is_array($data['details'])) {
            $this->assertNoAllergyConflicts($targetRecord, $data['details']);
        }

        return DB::transaction(function () use ($data, $prescription, $request) {
            $details = $data['details'] ?? null;
            unset($data['details']);
            if (array_key_exists('status', $data)) {
                $data['status'] = Prescription::normalizeStatus($data['status']);
            }
            $prescription->update($data);
            if (is_array($details)) {
                $keptIds = [];
                foreach ($details as $detail) {
                    $detailId = $detail['prescription_detail_id'] ?? null;
                    unset($detail['prescription_detail_id']);
                    if ($detailId && ($existing = $prescription->details()->find($detailId))) {
                        $existing->update($detail);
                        $keptIds[] = $existing->prescription_detail_id;
                    } else {
                        $keptIds[] = $prescription->details()->create($detail)->prescription_detail_id;
                    }
                }
                $prescription->details()->whereNotIn('prescription_detail_id', $keptIds)->get()
                    ->each(fn ($detail) => $this->deleteDetail($detail));
                $this->syncMedicationSchedules($prescription->fresh());
            }
            $this->flushUserApiCache($request);

            return response()->json($this->detail($prescription->fresh()));
        });
    }

    public function destroy(Request $request, Prescription $prescription)
    {
        $this->assertCanPrescribe($request, $prescription->medicalRecord);
        $prescription->details()->get()->each(fn ($detail) => $this->deleteDetail($detail));
        $prescription->delete();
        $this->flushUserApiCache($request);

        return response()->json(['message' => 'Đã xóa toa thuốc.']);
    }

    private function detail(Prescription $prescription): Prescription
    {
        $prescription->load([
            'medicalRecord.patient.chronicDiseases',
            'medicalRecord.patient.allergies',
            'medicalRecord.doctor',
            'medicalRecord.diagnosisInfo',
            'details.medicine',
            'details.frequencyType',
            'details.mealTime',
            'details.schedules.times',
        ]);

        if ($prescription->medicalRecord && ! $prescription->medicalRecord->diagnosis) {
            $prescription->medicalRecord->setAttribute(
                'diagnosis',
                $prescription->medicalRecord->diagnosisInfo?->diagnosis_name,
            );
        }

        return $this->decorate($prescription);
    }

    private function listRelations(): array
    {
        return [
            'medicalRecord:'.$this->medicalRecordColumns(),
            'medicalRecord.patient',
            'medicalRecord.patient.chronicDiseases:chronic_disease_id,disease_name,description',
            'medicalRecord.patient.allergies:allergy_id,allergy_name,description',
            'medicalRecord.doctor:doctor_id,full_name',
            'medicalRecord.diagnosisInfo:diagnosis_id,diagnosis_code,diagnosis_name,description',
            'details:prescription_detail_id,prescription_id,medicine_id,dosage,frequency_type_id,meal_time_id,quantity,instructions,note',
            'details.medicine:medicine_id,medicine_name,unit',
            'details.frequencyType:frequency_type_id,frequency_id,frequency_name,times_per_day',
            'details.mealTime:meal_time_id,meal_time_name',
            'details.schedules:schedule_id,prescription_detail_id,start_date,end_date,frequency_type_id,meal_time_id,time_of_day,note,status',
            'details.schedules.times:schedule_time_id,schedule_id,time_take',
        ];
    }

    private function listItem(Prescription $prescription): array
    {
        return [
            'id' => $prescription->prescription_id,
            'prescription_id' => $prescription->prescription_id,
            'record_id' => $prescription->record_id,
            'prescription_date' => $prescription->prescription_date,
            'start_date' => $prescription->start_date,
            'end_date' => $prescription->end_date,
            'duration_days' => $prescription->duration_days,
            'note' => $prescription->note,
            'edit_reason' => $prescription->edit_reason,
            'status' => $prescription->status,
            'can_modify' => $prescription->can_modify,
            'medical_record' => $prescription->medicalRecord ? [
                'record_id' => $prescription->medicalRecord->record_id,
                'visit_date' => $prescription->medicalRecord->visit_date,
                'diagnosis' => $prescription->medicalRecord->diagnosis ?: $prescription->medicalRecord->diagnosisInfo?->diagnosis_name,
                'diagnosis_id' => $prescription->medicalRecord->diagnosis_id,
                'doctor' => $prescription->medicalRecord->doctor ? [
                    'doctor_id' => $prescription->medicalRecord->doctor->doctor_id,
                    'full_name' => $prescription->medicalRecord->doctor->full_name,
                ] : null,
                'patient' => $prescription->medicalRecord->patient ? [
                    'patient_id' => $prescription->medicalRecord->patient->patient_id,
                    'full_name' => $prescription->medicalRecord->patient->full_name,
                    'underlying_disease' => $prescription->medicalRecord->patient->underlying_disease,
                    'allergy' => $prescription->medicalRecord->patient->allergy,
                    'chronic_diseases' => $prescription->medicalRecord->patient->chronicDiseases,
                    'allergies' => $prescription->medicalRecord->patient->allergies,
                ] : null,
            ] : null,
            'details' => $prescription->details->map(fn ($detail) => [
                'id' => $detail->prescription_detail_id,
                'prescription_detail_id' => $detail->prescription_detail_id,
                'dosage' => $detail->dosage,
                'quantity' => $detail->quantity,
                'instructions' => $detail->instructions,
                'note' => $detail->note ?: $detail->instructions,
                'medicine' => $detail->medicine ? [
                    'medicine_id' => $detail->medicine->medicine_id,
                    'medicine_name' => $detail->medicine->medicine_name,
                    'unit' => $detail->medicine->unit,
                ] : null,
                'frequency_type' => $detail->frequencyType ? [
                    'frequency_type_id' => $detail->frequencyType->frequency_type_id,
                    'frequency_id' => $detail->frequencyType->frequency_id,
                    'frequency_name' => $detail->frequencyType->frequency_name,
                    'type_name' => $detail->frequencyType->type_name,
                    'times_per_day' => $detail->frequencyType->times_per_day,
                ] : null,
                'meal_time' => $detail->mealTime ? [
                    'meal_time_id' => $detail->mealTime->meal_time_id,
                    'meal_time_name' => $detail->mealTime->meal_time_name,
                ] : null,
                'dose_sessions' => $this->sessionsForDetail($detail),
                'schedules' => $detail->schedules->map(fn ($schedule) => [
                    'schedule_id' => $schedule->schedule_id,
                    'id' => $schedule->schedule_id,
                    'start_date' => $schedule->start_date,
                    'end_date' => $schedule->end_date,
                    'frequency_type_id' => $schedule->frequency_type_id,
                    'meal_time_id' => $schedule->meal_time_id,
                    'time_of_day' => $schedule->time_of_day,
                    'note' => $schedule->note,
                    'status' => $schedule->status,
                    'times' => $schedule->times->map(fn ($time) => [
                        'schedule_time_id' => $time->schedule_time_id,
                        'id' => $time->schedule_time_id,
                        'time_take' => $time->time_take,
                    ])->values(),
                ])->values(),
            ])->values(),
        ];
    }

    private function medicalRecordColumns(): string
    {
        return collect(['record_id', 'patient_id', 'doctor_id', 'visit_date'])
            ->merge(Schema::hasColumn('medical_records', 'diagnosis') ? ['diagnosis'] : [])
            ->merge(Schema::hasColumn('medical_records', 'diagnosis_id') ? ['diagnosis_id'] : [])
            ->values()
            ->implode(',');
    }

    private function sessionsForDetail($detail): array
    {
        $sessions = $detail->schedules
            ->flatMap(fn ($schedule) => $schedule->times)
            ->map(fn ($time) => $this->sessionForTime($time->time_take))
            ->filter()
            ->unique()
            ->values()
            ->all();

        if ($sessions) {
            return $sessions;
        }

        return match ((int) ($detail->frequencyType?->times_per_day ?: 0)) {
            1 => ['Sáng'],
            2 => ['Sáng', 'Tối'],
            3 => ['Sáng', 'Trưa', 'Tối'],
            default => [],
        };
    }

    private function sessionForTime(?string $value): ?string
    {
        if (! $value) {
            return null;
        }

        $hour = (int) substr($value, 0, 2);

        return match (true) {
            $hour < 11 => 'Sáng',
            $hour < 16 => 'Trưa',
            default => 'Tối',
        };
    }

    private function decorate(Prescription $prescription): Prescription
    {
        $status = Prescription::normalizeStatus($prescription->status);
        if (
            in_array($status, Prescription::ACTIVE_STATUSES, true)
            && $prescription->end_date
            && $prescription->end_date->lt(today())
        ) {
            $status = Prescription::COMPLETED_STATUS;
        }

        $prescription->setAttribute('status', $status);
        $prescription->setAttribute('can_modify', in_array($status, Prescription::ACTIVE_STATUSES, true));

        return $prescription;
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $data = $request->validate([
            'record_id' => [$partial ? 'sometimes' : 'required', 'exists:medical_records,record_id'],
            'prescription_date' => ['nullable', 'date_format:Y-m-d'],
            'start_date' => [$partial ? 'sometimes' : 'required', 'date_format:Y-m-d'],
            'end_date' => [$partial ? 'sometimes' : 'required', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'duration_days' => ['nullable', 'integer', 'min:1'],
            'note' => ['nullable', 'string'],
            'edit_reason' => [$partial ? 'required' : 'nullable', 'string', 'max:1000'],
            'status' => ['nullable', 'in:active,completed,cancelled,replaced,stopped,Đang sử dụng,Đang dùng,Đã xong,Hoàn tất,Đã hủy,Đã thay thế,Ngừng'],
            'details' => [$partial ? 'sometimes' : 'required', 'array', 'min:1'],
            'details.*.medicine_id' => ['required', 'exists:medicines,medicine_id'],
            'details.*.prescription_detail_id' => ['nullable', 'integer', 'exists:prescription_details,prescription_detail_id'],
            'details.*.dosage' => ['required', 'string', 'max:100'],
            'details.*.frequency_type_id' => ['required', 'exists:frequency_types,frequency_type_id'],
            'details.*.meal_time_id' => ['nullable', 'exists:meal_times,meal_time_id'],
            'details.*.quantity' => ['required', 'integer', 'min:1'],
            'details.*.note' => ['nullable', 'string'],
        ], [
            'record_id.required' => 'Vui lòng chọn bệnh nhân hoặc hồ sơ bệnh án để kê toa.',
            'start_date.required' => 'Vui lòng nhập ngày bắt đầu dùng thuốc.',
            'end_date.required' => 'Vui lòng nhập thời gian sử dụng thuốc.',
            'details.required' => 'Vui lòng nhập ít nhất một thuốc trong toa.',
            'details.min' => 'Vui lòng nhập ít nhất một thuốc trong toa.',
            'details.*.medicine_id.required' => 'Vui lòng chọn thuốc.',
            'details.*.dosage.required' => 'Vui lòng nhập liều lượng thuốc.',
            'details.*.frequency_type_id.required' => 'Vui lòng chọn tần suất dùng thuốc.',
            'details.*.quantity.required' => 'Vui lòng nhập số lượng thuốc.',
            'edit_reason.required' => 'Vui lòng nhập lý do chỉnh thuốc.',
        ]);

        $prescriptionDate = $data['prescription_date'] ?? $data['start_date'] ?? now()->toDateString();
        if (! $partial || array_key_exists('prescription_date', $data) || array_key_exists('start_date', $data)) {
            $data['prescription_date'] = $prescriptionDate;
            $data['start_date'] = $prescriptionDate;
        }

        if (array_key_exists('duration_days', $data) && isset($data['start_date']) && $data['duration_days']) {
            $data['end_date'] = \Carbon\Carbon::parse($data['start_date'])
                ->addDays(((int) $data['duration_days']) + 1)
                ->toDateString();
        }

        if (! array_key_exists('duration_days', $data) && isset($data['start_date'], $data['end_date'])) {
            $data['duration_days'] = max(1, \Carbon\Carbon::parse($data['start_date'])->diffInDays(\Carbon\Carbon::parse($data['end_date'])) - 1);
        }

        return $data;
    }

    private function deleteDetail($detail): void
    {
        $detail->schedules()->get()->each(function ($schedule) {
            $schedule->times()->delete();
            $schedule->delete();
        });
        $detail->delete();
    }

    private function syncMedicationSchedules(Prescription $prescription): void
    {
        $prescription->load('details.frequencyType');
        $prescriptionStartDate = $prescription->start_date?->toDateString() ?? now()->toDateString();
        $startDate = \Carbon\Carbon::parse($prescriptionStartDate)->addDay()->toDateString();
        $endDate = $prescription->end_date?->toDateString() ?? $startDate;

        foreach ($prescription->details as $detail) {
            $detail->schedules()->get()->each(function ($schedule) {
                $schedule->times()->delete();
                $schedule->delete();
            });

            $times = $this->timesForDetail($detail);
            $schedule = $detail->schedules()->create([
                'start_date' => $startDate,
                'end_date' => $endDate,
                'frequency_type_id' => $detail->frequency_type_id ?: $this->defaultFrequencyTypeId(),
                'meal_time_id' => $detail->meal_time_id,
                'time_of_day' => $times[0] ?? null,
                'note' => null,
                'status' => MedicationSchedule::ACTIVE_STATUS,
            ]);

            foreach ($times as $time) {
                $schedule->times()->create(['time_take' => $time]);
            }
        }
    }

    private function defaultFrequencyTypeId(): int
    {
        return (int) (DB::table('frequency_types')->min('frequency_type_id') ?: 1);
    }

    private function timesForDetail($detail): array
    {
        $timesPerDay = (int) ($detail->frequencyType?->times_per_day ?: 1);

        return match ($timesPerDay) {
            1 => ['08:00'],
            2 => ['08:00', '19:00'],
            3 => ['08:00', '12:00', '19:00'],
            default => ['06:00', '12:00', '18:00', '22:00'],
        };
    }

    private function assertCanPrescribe(Request $request, MedicalRecord $record): void
    {
        $this->scope->assertRecord($request->user(), $record);

        if (! $this->recordCanReceivePrescription($record)) {
            throw ValidationException::withMessages([
                'record_id' => [
                    'Hồ sơ bệnh án đã hoàn thành hoặc đã hết thời gian điều trị. Vui lòng tạo hồ sơ bệnh án mới trước khi kê toa.',
                ],
            ]);
        }
    }

    private function recordCanReceivePrescription(MedicalRecord $record): bool
    {
        if (MedicalRecord::normalizeStatus($record->status) !== MedicalRecord::DEFAULT_STATUS) {
            return false;
        }

        return ! $this->medicationPeriodHasEnded($record);
    }

    private function medicationPeriodHasEnded(MedicalRecord $record): bool
    {
        $schedules = $this->schedulesForRecord($record);

        if ($schedules->isNotEmpty()) {
            return $schedules->every(function (MedicationSchedule $schedule) {
                $status = MedicationSchedule::normalizeStatus($schedule->status);

                if (in_array($status, MedicationSchedule::COMPLETED_STATUSES, true)) {
                    return true;
                }

                return in_array($status, MedicationSchedule::ACTIVE_STATUSES, true)
                    && $schedule->end_date
                    && $schedule->end_date->lt(today());
            });
        }

        return $this->allPrescriptionsHaveEnded($record);
    }

    private function schedulesForRecord(MedicalRecord $record)
    {
        if ($record->relationLoaded('prescriptions')) {
            $schedules = $record->prescriptions
                ->flatMap(fn (Prescription $prescription) => $prescription->relationLoaded('details') ? $prescription->details : collect())
                ->flatMap(fn ($detail) => $detail->relationLoaded('schedules') ? $detail->schedules : collect());

            if ($schedules->isNotEmpty()) {
                return $schedules;
            }
        }

        return MedicationSchedule::query()
            ->select(['schedule_id', 'prescription_detail_id', 'end_date', 'status'])
            ->whereHas('prescriptionDetail.prescription', fn ($query) => $query->where('record_id', $record->record_id))
            ->get();
    }

    private function allPrescriptionsHaveEnded(MedicalRecord $record): bool
    {
        $prescriptions = $record->relationLoaded('prescriptions')
            ? $record->prescriptions
            : $record->prescriptions()->select(['prescription_id', 'record_id', 'end_date', 'status'])->get();

        if ($prescriptions->isEmpty()) {
            return false;
        }

        return $prescriptions->every(function (Prescription $prescription) {
            $status = Prescription::normalizeStatus($prescription->status);

            if (in_array($status, Prescription::COMPLETED_STATUSES, true)) {
                return true;
            }

            return in_array($status, Prescription::ACTIVE_STATUSES, true)
                && $prescription->end_date
                && $prescription->end_date->lt(today());
        });
    }

    private function assertNoAllergyConflicts(MedicalRecord $record, array $details): void
    {
        $patient = $record->patient;
        if (! $patient || empty($details)) {
            return;
        }

        $allergyTerms = collect([
            $patient->allergy,
            $record->allergy,
        ])
            ->merge($patient->allergies->pluck('allergy_name'))
            ->filter()
            ->flatMap(fn ($value) => preg_split('/[,;|\/\n]+/u', (string) $value) ?: [])
            ->map(fn ($value) => $this->normalizeForCompare($value))
            ->filter(fn ($value) => $value !== '')
            ->unique()
            ->values();

        if ($allergyTerms->isEmpty()) {
            return;
        }

        $medicineIds = collect($details)->pluck('medicine_id')->filter()->unique()->values();
        $medicines = Medicine::query()
            ->whereIn('medicine_id', $medicineIds)
            ->get(['medicine_id', 'medicine_name']);

        $conflicts = $medicines->filter(function (Medicine $medicine) use ($allergyTerms) {
            $medicineName = $this->normalizeForCompare($medicine->medicine_name);

            return $allergyTerms->contains(fn ($term) => Str::contains($medicineName, $term) || Str::contains($term, $medicineName));
        })->pluck('medicine_name')->values();

        if ($conflicts->isEmpty()) {
            return;
        }

        throw ValidationException::withMessages([
            'details' => [
                'Bệnh nhân có tiền sử dị ứng với thuốc: '.$conflicts->implode(', ').'. Vui lòng kiểm tra lại trước khi kê toa.',
            ],
        ]);
    }

    private function normalizeForCompare(?string $value): string
    {
        return Str::of($value ?? '')
            ->lower()
            ->ascii()
            ->replaceMatches('/[^a-z0-9]+/', ' ')
            ->squish()
            ->toString();
    }
}
