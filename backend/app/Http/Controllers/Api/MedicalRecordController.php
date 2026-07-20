<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HealthMetric;
use App\Models\MedicalRecord;
use App\Models\MedicalRecordSymptom;
use App\Models\MedicationReminderLog;
use App\Models\MedicationSchedule;
use App\Models\Patient;
use App\Models\Prescription;
use App\Services\DoctorRecordScope;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class MedicalRecordController extends Controller
{
    public function __construct(private readonly DoctorRecordScope $scope) {}

    public function index(Request $request)
    {
        return response()->json($this->cachedForUser($request, 'medical-records:index', function () use ($request) {
            $relations = [
                'patient',
                'patient.chronicDiseases:chronic_disease_id,disease_name,description',
                'patient.allergies:allergy_id,allergy_name,description',
                'doctor:doctor_id,full_name,email,specialty',
                'diagnosisInfo:diagnosis_id,diagnosis_code,diagnosis_name,description',
                'symptomDetails:medical_record_symptom_id,record_id,symptom_id,description',
                'prescriptions:prescription_id,record_id,start_date,end_date,status',
            ];
            if ($request->patient_id) {
                $relations = array_merge($relations, [
                    'documents:document_id,record_id,visit_date,document_type,file_path,created_at',
                    'prescriptions.details:prescription_detail_id,prescription_id,medicine_id,dosage,frequency_type_id,meal_time_id,quantity,instructions,note',
                    'prescriptions.details.medicine:medicine_id,medicine_name',
                    'prescriptions.details.frequencyType:frequency_type_id,frequency_id,frequency_name,times_per_day',
                    'prescriptions.details.mealTime:meal_time_id,meal_time_name',
                    'prescriptions.details.schedules:schedule_id,prescription_detail_id,start_date,end_date,frequency_type_id,meal_time_id,time_of_day,note,status',
                    'prescriptions.details.schedules.times:schedule_time_id,schedule_id,time_take',
                ]);
            }

            $query = MedicalRecord::query()
                ->select($this->medicalRecordSelectColumns([
                    'record_id',
                    'patient_id',
                    'doctor_id',
                    'diagnosis_id',
                    'visit_date',
                    'chief_complaint',
                    'symptoms',
                    'diagnosis',
                    'treatment_plan',
                    'doctor_note',
                    'next_visit_date',
                    'note',
                    'status',
                ]))
                ->with($relations)
                ->when(
                    $request->patient_id,
                    fn ($q) => $q,
                    fn ($q) => $q->where('doctor_id', $request->user()->doctor_id),
                )
                ->when($request->patient_id, fn ($q, $id) => $q->where('patient_id', $id))
                ->when($request->doctor_id, fn ($q, $id) => $q->where('doctor_id', $id))
                ->when($request->doctor, fn ($q, $doctor) => $q->whereHas('doctor', fn ($doctorQuery) => $doctorQuery
                    ->where('full_name', 'like', "%{$doctor}%")
                    ->orWhere('email', 'like', "%{$doctor}%")))
                ->when($request->diagnosis, fn ($q, $diagnosis) => $q->where(function ($inner) use ($diagnosis) {
                    $inner
                        ->when(Schema::hasColumn('medical_records', 'diagnosis'), fn ($query) => $query
                            ->where('diagnosis', 'like', "%{$diagnosis}%"))
                        ->orWhereHas('diagnosisInfo', fn ($diagnosisQuery) => $diagnosisQuery
                            ->where('diagnosis_name', 'like', "%{$diagnosis}%")
                            ->orWhere('diagnosis_code', 'like', "%{$diagnosis}%"));
                }))
                ->when($request->status, fn ($q, $status) => $this->applyStatusFilter($q, $status))
                ->when($request->visit_date, fn ($q, $date) => $q->whereDate('visit_date', $date))
                ->when($request->from_date, fn ($q, $date) => $q->whereDate('visit_date', '>=', $date))
                ->when($request->to_date, fn ($q, $date) => $q->whereDate('visit_date', '<=', $date))
                ->when($request->search, function ($q, $search) {
                    $search = trim((string) $search);
                    $patientCodeId = preg_match('/^BN-?0*(\d+)$/i', $search, $matches)
                        ? (int) $matches[1]
                        : null;

                    $q->where(function ($inner) use ($search, $patientCodeId) {
                        $searchedRecordFields = collect(['diagnosis', 'symptoms', 'chief_complaint', 'note'])
                            ->filter(fn ($column) => Schema::hasColumn('medical_records', $column))
                            ->values();

                        $searchedRecordFields->each(function ($column, $index) use ($inner, $search) {
                            $method = $index === 0 ? 'where' : 'orWhere';
                            $inner->{$method}($column, 'like', "%{$search}%");
                        });

                        $inner
                            ->orWhereHas('diagnosisInfo', function ($diagnosis) use ($search) {
                                $diagnosis->where('diagnosis_name', 'like', "%{$search}%")
                                    ->orWhere('diagnosis_code', 'like', "%{$search}%");
                            })
                            ->orWhereHas('patient', function ($patient) use ($search, $patientCodeId) {
                                $patient->where('full_name', 'like', "%{$search}%")
                                    ->orWhere('phone', 'like', "%{$search}%");

                                if (is_numeric($search)) {
                                    $patient->orWhere('patient_id', (int) $search);
                                }

                                if ($patientCodeId) {
                                    $patient->orWhere('patient_id', $patientCodeId);
                                }
                            });
                    });
                });

            $paginator = $query->latest('visit_date')->paginate($this->perPage($request, 20, 20));
            $paginator->getCollection()->each(fn (MedicalRecord $record) => $this->decorate($record));

            return $paginator;
        }));
    }

    public function suggestions(Request $request)
    {
        $data = $request->validate([
            'field' => ['nullable', Rule::in([
                'symptoms',
                'diagnosis',
                'treatment_plan',
                'doctor_note',
            ])],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $fields = [
            'symptoms',
            'diagnosis',
            'treatment_plan',
            'doctor_note',
        ];

        if (empty($data['field'])) {
            return response()->json(collect($fields)->mapWithKeys(fn ($field) => [
                $field => $this->suggestionsForField($request, $field, ''),
            ]));
        }

        $field = $data['field'];
        $search = trim($data['search'] ?? '');

        return response()->json($this->suggestionsForField($request, $field, $search));
    }

    private function suggestionsForField(Request $request, string $field, string $search = '')
    {
        $values = $this->recordFieldSuggestions($request, $field, $search)
            ->flatMap(fn ($value) => preg_split('/[,;\\n]+/u', (string) $value))
            ->map(fn ($value) => trim(preg_replace('/\\s+/u', ' ', $value)))
            ->filter(fn ($value) => $value !== '')
            ->unique(fn ($value) => mb_strtolower($value))
            ->take(60)
            ->values();

        if ($field === 'symptoms') {
            $values = $this->symptomSuggestions($request, $search)->merge($values);
        }

        if ($field === 'diagnosis') {
            $values = $this->diagnosisSuggestions($search)->merge($values);
        }

        if ($field === 'doctor_note') {
            $values = $this->recordFieldSuggestions($request, 'note', $search)->merge($values);
        }

        return $values
            ->flatMap(fn ($value) => preg_split('/[,;\\n]+/u', (string) $value))
            ->map(fn ($value) => trim(preg_replace('/\\s+/u', ' ', $value)))
            ->filter(fn ($value) => $value !== '')
            ->unique(fn ($value) => mb_strtolower($value))
            ->take(60)
            ->values();
    }

    private function recordFieldSuggestions(Request $request, string $field, string $search = '')
    {
        if (! Schema::hasColumn('medical_records', $field)) {
            return collect();
        }

        return MedicalRecord::query()
            ->where('doctor_id', $request->user()->doctor_id)
            ->whereNotNull($field)
            ->when($search !== '', fn ($query) => $query->where($field, 'like', "%{$search}%"))
            ->latest('visit_date')
            ->limit(120)
            ->pluck($field);
    }

    private function symptomSuggestions(Request $request, string $search = '')
    {
        $values = collect();

        if (Schema::hasTable('symptoms')) {
            $values = $values->merge(DB::table('symptoms')
                ->whereNotNull('symptom_name')
                ->when($search !== '', fn ($query) => $query->where('symptom_name', 'like', "%{$search}%"))
                ->orderBy('symptom_name')
                ->limit(120)
                ->pluck('symptom_name'));
        }

        if (Schema::hasTable('medical_record_symptoms')) {
            $values = $values->merge(DB::table('medical_record_symptoms')
                ->join('medical_records', 'medical_record_symptoms.record_id', '=', 'medical_records.record_id')
                ->where('medical_records.doctor_id', $request->user()->doctor_id)
                ->whereNotNull('medical_record_symptoms.description')
                ->when($search !== '', fn ($query) => $query->where('medical_record_symptoms.description', 'like', "%{$search}%"))
                ->orderByDesc('medical_records.visit_date')
                ->limit(120)
                ->pluck('medical_record_symptoms.description'));
        }

        return $values;
    }

    private function diagnosisSuggestions(string $search = '')
    {
        if (! Schema::hasTable('diagnoses')) {
            return collect();
        }

        return DB::table('diagnoses')
            ->whereNotNull('diagnosis_name')
            ->when($search !== '', fn ($query) => $query->where(function ($inner) use ($search) {
                $inner->where('diagnosis_name', 'like', "%{$search}%")
                    ->orWhere('diagnosis_code', 'like', "%{$search}%");
            }))
            ->orderByDesc('status')
            ->orderBy('diagnosis_name')
            ->limit(120)
            ->pluck('diagnosis_name');
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $patient = Patient::findOrFail($data['patient_id']);
        $this->scope->assertPatient($request->user(), $patient);
        $data['doctor_id'] = $request->user()->doctor_id;
        $data['status'] = MedicalRecord::normalizeStatus($data['status'] ?? null);

        return DB::transaction(function () use ($data, $patient, $request) {
            Patient::whereKey($patient->patient_id)->lockForUpdate()->first();
            $hasActiveRecord = MedicalRecord::query()
                ->where('patient_id', $patient->patient_id)
                ->whereIn('status', MedicalRecord::activeStatusValues())
                ->lockForUpdate()
                ->exists();

            abort_if(
                $hasActiveRecord,
                422,
                'Bệnh nhân đang có một hồ sơ điều trị. Vui lòng hoàn thành điều trị trước khi tạo hồ sơ bệnh án mới.',
            );

            $record = MedicalRecord::create($this->medicalRecordColumnData($data));
            $this->syncSymptoms($record, $data['symptoms'] ?? null);
            $this->flushUserApiCache($request);

            return response()->json($this->detail($record), 201);
        });
    }

    public function show(Request $request, MedicalRecord $medicalRecord)
    {
        $medicalRecord->loadMissing('patient');
        $this->scope->assertPatient($request->user(), $medicalRecord->patient);

        return response()->json($this->detail($medicalRecord));
    }

    public function update(Request $request, MedicalRecord $medicalRecord)
    {
        $this->scope->assertRecord($request->user(), $medicalRecord);
        abort_unless(
            $medicalRecord->isInTreatment(),
            422,
            'Hồ sơ bệnh án đã hoàn thành, không thể chỉnh sửa. Vui lòng tạo hồ sơ bệnh án mới cho lần điều trị này.',
        );
        $data = $this->validated($request, true, $medicalRecord);
        if (isset($data['patient_id'])) {
            $this->scope->assertPatient($request->user(), Patient::findOrFail($data['patient_id']));
        }
        if (array_key_exists('status', $data)) {
            $data['status'] = MedicalRecord::normalizeStatus($data['status']);
        }
        $medicalRecord->update($this->medicalRecordColumnData($data));
        if (array_key_exists('symptoms', $data)) {
            $this->syncSymptoms($medicalRecord, $data['symptoms']);
        }
        $this->flushUserApiCache($request);

        return response()->json($this->detail($medicalRecord->fresh()));
    }

    public function destroy(Request $request, MedicalRecord $medicalRecord)
    {
        $this->scope->assertRecord($request->user(), $medicalRecord);
        $medicalRecord->delete();
        $this->flushUserApiCache($request);

        return response()->json(['message' => 'Đã xóa hồ sơ bệnh án.']);
    }

    private function detail(MedicalRecord $record): MedicalRecord
    {
        $record->load([
            'patient.chronicDiseases:chronic_disease_id,disease_name,description',
            'patient.allergies:allergy_id,allergy_name,description',
            'doctor',
            'diagnosisInfo',
            'symptomDetails',
            'healthMonitorings.metrics.healthType',
            'documents',
            'prescriptions.details.medicine.category',
            'prescriptions.details.frequencyType',
            'prescriptions.details.mealTime',
            'prescriptions.details.schedules.times',
        ]);
        $record->setAttribute('visit_metrics', HealthMetric::with('healthType')
            ->where('patient_id', $record->patient_id)
            ->whereDate('measure_time', $record->visit_date)
            ->orderBy('health_metric_id')
            ->get());
        $record->setAttribute('latest_health_metrics', HealthMetric::with('healthType')
            ->where('patient_id', $record->patient_id)
            ->latest('measure_time')
            ->latest('health_metric_id')
            ->get()
            ->unique('health_type_id')
            ->values());
        $record->setAttribute('previous_visits', MedicalRecord::with('doctor')
            ->where('patient_id', $record->patient_id)
            ->where('record_id', '!=', $record->record_id)
            ->orderByDesc('visit_date')
            ->limit(10)
            ->get());
        $record->setAttribute('medication_reminder_logs', MedicationReminderLog::with([
            'schedule.prescriptionDetail.medicine:medicine_id,medicine_name',
            'schedule.prescriptionDetail.mealTime:meal_time_id,meal_time_name',
        ])
            ->where('patient_id', $record->patient_id)
            ->where('doctor_id', $record->doctor_id)
            ->latest('reminder_date')
            ->latest('reminded_at')
            ->limit(20)
            ->get()
            ->map(fn (MedicationReminderLog $log) => [
                'id' => $log->id,
                'reminder_date' => $log->reminder_date?->toDateString(),
                'reminder_time' => $log->reminder_time,
                'reminded_at' => $log->reminded_at?->toISOString(),
                'taken_at' => $log->taken_at?->toISOString(),
                'missed_at' => $log->missed_at?->toISOString(),
                'status' => $log->status,
                'medicine_name' => $log->schedule?->prescriptionDetail?->medicine?->medicine_name,
                'meal' => $log->schedule?->prescriptionDetail?->mealTime?->meal_time_name,
            ]));

        return $this->decorate($record);
    }

    private function applyStatusFilter($query, string $status)
    {
        return match ($status) {
            'in_treatment' => $query->whereIn('status', MedicalRecord::activeStatusValues()),
            'completed' => $query->whereIn('status', array_merge(
                MedicalRecord::COMPLETED_STATUSES,
                MedicalRecord::LEGACY_COMPLETED_STATUSES,
            )),
            default => $query->where('status', $status),
        };
    }

    private function decorate(MedicalRecord $record): MedicalRecord
    {
        $status = MedicalRecord::normalizeStatus($record->status);
        if ($status === MedicalRecord::DEFAULT_STATUS && $this->medicationPeriodHasEnded($record)) {
            $status = Prescription::COMPLETED_STATUS;
        }

        $record->setAttribute('status', $status);
        $record->setAttribute('diagnosis', $record->diagnosis ?: $record->diagnosisInfo?->diagnosis_name);
        $record->setAttribute('symptoms', $record->symptoms ?: $record->symptomDetails?->pluck('description')->filter()->implode(', '));
        $record->setAttribute('doctor_note', $record->doctor_note ?: $record->note);
        $record->setAttribute('chief_complaint', $record->chief_complaint ?: $record->symptoms);
        $record->setAttribute('can_edit', $record->isInTreatment());
        $record->setAttribute('can_prescribe', $record->isInTreatment());

        return $record;
    }

    private function medicalRecordSelectColumns(array $columns): array
    {
        return collect($columns)
            ->filter(fn ($column) => Schema::hasColumn('medical_records', $column))
            ->values()
            ->all();
    }

    private function medicalRecordColumnData(array $data): array
    {
        if (array_key_exists('doctor_note', $data) && ! Schema::hasColumn('medical_records', 'doctor_note') && Schema::hasColumn('medical_records', 'note')) {
            $data['note'] = $data['doctor_note'];
        }

        if (array_key_exists('diagnosis', $data) && ! Schema::hasColumn('medical_records', 'diagnosis') && Schema::hasColumn('medical_records', 'diagnosis_id')) {
            $data['diagnosis_id'] = $this->diagnosisIdFromText($data['diagnosis']);
        }

        return collect($data)
            ->filter(fn ($value, $key) => Schema::hasColumn('medical_records', $key))
            ->all();
    }

    private function diagnosisIdFromText(?string $diagnosis): ?int
    {
        $diagnosis = trim((string) $diagnosis);
        if ($diagnosis === '' || ! Schema::hasTable('diagnoses')) {
            return null;
        }

        $row = DB::table('diagnoses')
            ->where('diagnosis_name', $diagnosis)
            ->orWhere('diagnosis_code', $diagnosis)
            ->first();

        if ($row) {
            return (int) $row->diagnosis_id;
        }

        return DB::table('diagnoses')->insertGetId([
            'diagnosis_code' => 'DX'.now()->format('YmdHis'),
            'diagnosis_name' => $diagnosis,
            'description' => null,
            'status' => 1,
        ]);
    }

    private function syncSymptoms(MedicalRecord $record, ?string $symptoms): void
    {
        if (! Schema::hasTable('medical_record_symptoms') || Schema::hasColumn('medical_records', 'symptoms')) {
            return;
        }

        $items = collect(preg_split('/[,;\n]+/u', (string) $symptoms))
            ->map(fn ($item) => trim(preg_replace('/\s+/u', ' ', $item)))
            ->filter(fn ($item) => $item !== '')
            ->unique(fn ($item) => mb_strtolower($item))
            ->values();

        $record->symptomDetails()->delete();

        $items->each(fn ($description) => MedicalRecordSymptom::create([
            'record_id' => $record->record_id,
            'symptom_id' => $this->symptomIdFromText($description),
            'description' => $description,
        ]));
    }

    private function symptomIdFromText(string $description): int
    {
        if (! Schema::hasTable('symptoms')) {
            return 0;
        }

        $normalizedDescription = $this->normalizeForLookup($description);
        $symptoms = DB::table('symptoms')->select(['symptom_id', 'symptom_name'])->get();

        $matched = $symptoms->first(function ($symptom) use ($normalizedDescription) {
            $normalizedName = $this->normalizeForLookup($symptom->symptom_name);

            return $normalizedName !== ''
                && ($normalizedDescription === $normalizedName
                    || str_contains($normalizedDescription, $normalizedName)
                    || str_contains($normalizedName, $normalizedDescription));
        });

        if ($matched) {
            return (int) $matched->symptom_id;
        }

        return (int) DB::table('symptoms')->insertGetId([
            'symptom_name' => trim($description),
            'description' => null,
            'created_at' => now(),
        ]);
    }

    private function normalizeForLookup(?string $value): string
    {
        $value = mb_strtolower(trim((string) $value));
        $value = preg_replace('/\s+/u', ' ', $value);

        if (class_exists(\Normalizer::class)) {
            $value = \Normalizer::normalize($value, \Normalizer::FORM_D);
            $value = preg_replace('/\p{Mn}+/u', '', $value);
        }

        return $value ?: '';
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

    private function validated(Request $request, bool $partial = false, ?MedicalRecord $record = null): array
    {
        $data = $request->validate([
            'patient_id' => [$partial ? 'sometimes' : 'required', 'exists:patients,patient_id'],
            'visit_date' => [$partial ? 'sometimes' : 'required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'chief_complaint' => ['nullable', 'string'],
            'symptoms' => ['nullable', 'string'],
            'diagnosis' => ['nullable', 'string'],
            'medical_history' => ['nullable', 'string'],
            'allergy' => ['nullable', 'string'],
            'treatment_plan' => ['nullable', 'string'],
            'doctor_note' => ['nullable', 'string'],
            'next_visit_date' => ['nullable', 'date_format:Y-m-d'],
            'status' => ['nullable', Rule::in(array_merge(
                MedicalRecord::IN_TREATMENT_STATUSES,
                MedicalRecord::COMPLETED_STATUSES,
                MedicalRecord::LEGACY_IN_TREATMENT_STATUSES,
                MedicalRecord::LEGACY_COMPLETED_STATUSES,
                ['active', 'completed'],
            ))],
        ], [
            'visit_date.before_or_equal' => 'Ngày tạo hồ sơ không được lớn hơn ngày hiện tại.',
        ]);

        if (array_key_exists('next_visit_date', $data) && $data['next_visit_date']) {
            $visitDate = $data['visit_date'] ?? $record?->visit_date;
            if ($visitDate && Carbon::parse($data['next_visit_date'])->lt(Carbon::parse($visitDate))) {
                throw ValidationException::withMessages(['next_visit_date' => ['Ngày tái khám không được trước ngày tạo hồ sơ.']]);
            }
        }

        return $data;
    }
}
