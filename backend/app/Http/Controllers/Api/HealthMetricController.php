<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HealthMetric;
use App\Models\HealthMetricAlert;
use App\Models\HealthType;
use App\Models\Patient;
use App\Models\Prescription;
use App\Services\DoctorRecordScope;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class HealthMetricController extends Controller
{
    public function __construct(private readonly DoctorRecordScope $scope) {}

    public function index(Request $request)
    {
        return response()->json($this->cachedForUser($request, 'health-metrics:index', function () use ($request) {
            $patientIds = $this->scope->treatedPatients($request->user())->select('patient_id');
            $query = HealthMetric::query()
                ->select(['health_metric_id', 'patient_id', 'health_type_id', 'measure_time', 'value', 'note'])
                ->with([
                    'patient:patient_id,full_name,phone',
                    'healthType:health_type_id,health_type_name,unit',
                    'alerts:id,health_metric_id,status,severity,message',
                    'monitoring:health_monitoring_id,record_id,measured_at,note',
                ])
                ->whereIn('patient_id', $patientIds)
                ->when($request->patient_id, fn ($q, $id) => $q->where('patient_id', $id))
                ->when($request->health_type_id, fn ($q, $id) => $q->where('health_type_id', $id))
                ->when($request->from_date, fn ($q, $date) => $q->whereDate('measure_time', '>=', $date))
                ->when($request->to_date, fn ($q, $date) => $q->whereDate('measure_time', '<=', $date));

            return $query->latest('measure_time')->paginate($this->perPage($request, 20, 20));
        }));
    }

    public function show(Request $request, HealthMetric $healthMetric)
    {
        $this->scope->assertPatient($request->user(), $healthMetric->patient);

        return response()->json($healthMetric->load(['patient', 'healthType', 'monitoring.medicalRecord']));
    }

    public function activePrescriptions(Request $request, Patient $patient)
    {
        $this->scope->assertPatient($request->user(), $patient);
        $today = today()->toDateString();

        $prescriptions = Prescription::query()
            ->with([
                'medicalRecord.doctor:doctor_id,full_name,specialty',
                'medicalRecord.diagnosisInfo:diagnosis_id,diagnosis_code,diagnosis_name,description',
                'details.medicine:medicine_id,medicine_name',
                'details.frequencyType:frequency_type_id,type_name,frequency_name,times_per_day',
                'details.mealTime:meal_time_id,meal_time_name',
            ])
            ->whereHas('medicalRecord', fn ($record) => $record->where('patient_id', $patient->patient_id))
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->whereIn('status', Prescription::ACTIVE_STATUSES)
            ->orderByDesc('start_date')
            ->orderByDesc('prescription_id')
            ->get()
            ->map(fn (Prescription $prescription) => [
                'prescription_id' => $prescription->prescription_id,
                'code' => 'DT'.str_pad((string) $prescription->prescription_id, 3, '0', STR_PAD_LEFT),
                'prescription_date' => $prescription->prescription_date?->toDateString(),
                'start_date' => $prescription->start_date?->toDateString(),
                'end_date' => $prescription->end_date?->toDateString(),
                'status' => Prescription::normalizeStatus($prescription->status),
                'note' => $prescription->note,
                'record' => [
                    'record_id' => $prescription->medicalRecord?->record_id,
                    'diagnosis' => $prescription->medicalRecord?->diagnosis
                        ?: $prescription->medicalRecord?->diagnosisInfo?->diagnosis_name,
                ],
                'doctor' => [
                    'doctor_id' => $prescription->medicalRecord?->doctor?->doctor_id,
                    'full_name' => $prescription->medicalRecord?->doctor?->full_name,
                    'specialty' => $prescription->medicalRecord?->doctor?->specialty,
                ],
                'details' => $prescription->details->map(fn ($detail) => [
                    'prescription_detail_id' => $detail->prescription_detail_id,
                    'medicine_id' => $detail->medicine_id,
                    'medicine_name' => $detail->medicine?->medicine_name,
                    'dosage' => $detail->dosage,
                    'quantity' => $detail->quantity,
                    'instructions' => $detail->instructions,
                    'note' => $detail->note,
                    'frequency' => $detail->frequencyType?->type_name
                        ?: $detail->frequencyType?->frequency_name,
                    'meal_time' => $detail->mealTime?->meal_time_name,
                ])->values(),
            ]);

        return response()->json(['data' => $prescriptions]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $this->scope->assertPatient($request->user(), Patient::findOrFail($data['patient_id']));
        $this->prepareMetricData($data);

        $metric = HealthMetric::create($data);
        $this->syncHealthAlert($metric->fresh(['healthType', 'monitoring.medicalRecord']), $request->user()->doctor_id);
        $this->flushUserApiCache($request);

        return response()->json($metric->fresh(['patient', 'healthType', 'alerts']), 201);
    }

    public function update(Request $request, HealthMetric $healthMetric)
    {
        $this->scope->assertPatient($request->user(), $healthMetric->patient);
        $data = $this->validated($request, true);
        if (isset($data['patient_id'])) {
            $this->scope->assertPatient($request->user(), Patient::findOrFail($data['patient_id']));
        }
        $this->prepareMetricData($data, $healthMetric);
        $healthMetric->update($data);
        $this->syncHealthAlert($healthMetric->fresh(['healthType', 'monitoring.medicalRecord']), $request->user()->doctor_id);
        $this->flushUserApiCache($request);

        return response()->json($healthMetric->fresh()->load(['patient', 'healthType', 'monitoring.medicalRecord', 'alerts']));
    }

    public function destroy(Request $request, HealthMetric $healthMetric)
    {
        $this->scope->assertPatient($request->user(), $healthMetric->patient);
        $healthMetric->delete();
        $this->flushUserApiCache($request);

        return response()->json(['message' => 'Đã xóa chỉ số sức khỏe.']);
    }

    public function types()
    {
        return response()->json(Cache::remember('health-types:list', now()->addHours(6), function () {
            $columns = ['health_type_id', 'health_type_name', 'unit'];
            foreach (['min_value', 'max_value', 'is_active', 'note'] as $column) {
                if (Schema::hasColumn('health_types', $column)) {
                    $columns[] = $column;
                }
            }

            return HealthType::query()
                ->select($columns)
                ->when(Schema::hasColumn('health_types', 'is_active'), fn ($query) => $query->where('is_active', true))
                ->orderBy('health_type_id')
                ->get();
        }));
    }

    public function storeType(Request $request)
    {
        $data = $this->validatedType($request);
        $type = HealthType::create($data);
        Cache::forget('health-types:list');

        return response()->json($type, 201);
    }

    public function updateType(Request $request, HealthType $healthType)
    {
        $healthType->update($this->validatedType($request, true));
        Cache::forget('health-types:list');

        return response()->json($healthType->fresh());
    }

    public function destroyType(HealthType $healthType)
    {
        if (Schema::hasColumn('health_types', 'is_active')) {
            $healthType->update(['is_active' => false]);
        } else {
            $healthType->delete();
        }
        Cache::forget('health-types:list');

        return response()->json(['message' => 'Đã ẩn loại chỉ số sức khỏe.']);
    }

    public function alerts(Request $request)
    {
        $data = $request->validate([
            'patient_id' => ['nullable', 'integer', 'exists:patients,patient_id'],
            'status' => ['nullable', Rule::in([HealthMetricAlert::OPEN_STATUS, HealthMetricAlert::RESOLVED_STATUS])],
            'from_date' => ['nullable', 'date_format:Y-m-d'],
            'to_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from_date'],
        ]);

        $query = HealthMetricAlert::query()
            ->with([
                'patient:patient_id,full_name,phone',
                'healthType:health_type_id,health_type_name,unit',
                'metric:health_metric_id,value,measure_time',
            ])
            ->where('doctor_id', $request->user()->doctor_id)
            ->when($data['patient_id'] ?? null, fn ($q, $id) => $q->where('patient_id', $id))
            ->when($data['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($data['from_date'] ?? null, fn ($q, $date) => $q->whereDate('alert_time', '>=', $date))
            ->when($data['to_date'] ?? null, fn ($q, $date) => $q->whereDate('alert_time', '<=', $date));

        return response()->json($query
            ->latest('alert_time')
            ->paginate($this->perPage($request, 20, 50)));
    }

    public function resolveAlert(Request $request, HealthMetricAlert $healthMetricAlert)
    {
        abort_unless((int) $healthMetricAlert->doctor_id === (int) $request->user()->doctor_id, 403);

        $healthMetricAlert->update([
            'status' => HealthMetricAlert::RESOLVED_STATUS,
            'resolved_at' => now(),
        ]);

        return response()->json($healthMetricAlert->fresh(['patient', 'healthType', 'metric']));
    }

    private function validated(Request $request, bool $partial = false): array
    {
        return $request->validate([
            'patient_id' => [$partial ? 'sometimes' : 'required', 'exists:patients,patient_id'],
            'health_type_id' => [$partial ? 'sometimes' : 'required', 'exists:health_types,health_type_id'],
            'measure_time' => [$partial ? 'sometimes' : 'required', 'date', 'before_or_equal:now'],
            'value' => [$partial ? 'sometimes' : 'required', 'string', 'max:100'],
            'note' => ['nullable', 'string'],
        ], [
            'measure_time.before_or_equal' => 'Thời gian đo không được lớn hơn thời gian hiện tại.',
        ]);
    }

    private function validatedType(Request $request, bool $partial = false): array
    {
        return $request->validate([
            'health_type_name' => [$partial ? 'sometimes' : 'required', 'string', 'max:150'],
            'unit' => ['nullable', 'string', 'max:50'],
            'min_value' => ['nullable', 'numeric'],
            'max_value' => ['nullable', 'numeric', 'gte:min_value'],
            'is_active' => ['nullable', 'boolean'],
            'note' => ['nullable', 'string'],
        ], [
            'max_value.gte' => 'Giá trị tối đa phải lớn hơn hoặc bằng giá trị tối thiểu.',
        ]);
    }

    private function prepareMetricData(array &$data, ?HealthMetric $existing = null): void
    {
        if (! array_key_exists('patient_id', $data) && $existing) {
            $data['patient_id'] = $existing->patient_id;
        }

        if (! array_key_exists('measure_time', $data) && $existing) {
            $data['measure_time'] = $existing->measure_time?->format('Y-m-d H:i:s');
        }

        if (! array_key_exists('value', $data) && $existing) {
            $data['value'] = $existing->value;
        }

        if (! array_key_exists('metric_value', $data) && array_key_exists('value', $data)) {
            $data['metric_value'] = $this->numericMetricValue($data['value']);
        }

        if (! empty($data['health_monitoring_id'])) {
            return;
        }

        if ($existing?->health_monitoring_id) {
            $data['health_monitoring_id'] = $existing->health_monitoring_id;
            return;
        }

        $recordId = DB::table('medical_records')
            ->where('patient_id', $data['patient_id'])
            ->orderByDesc('visit_date')
            ->value('record_id');

        abort_unless($recordId, 422, 'Bệnh nhân chưa có hồ sơ bệnh án để ghi chỉ số.');

        $data['health_monitoring_id'] = DB::table('health_monitorings')->insertGetId([
            'record_id' => $recordId,
            'measured_at' => $data['measure_time'] ?? now(),
            'note' => $data['note'] ?? null,
            'created_at' => now(),
        ]);
    }

    private function numericMetricValue(?string $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (preg_match('/-?\d+(?:[.,]\d+)?/', $value, $matches) !== 1) {
            return null;
        }

        return (float) str_replace(',', '.', $matches[0]);
    }

    private function syncHealthAlert(HealthMetric $metric, int $doctorId): void
    {
        $metric->loadMissing(['healthType', 'monitoring.medicalRecord']);
        $value = $metric->metric_value ?? $this->numericMetricValue($metric->value);
        $type = $metric->healthType;

        if ($value === null || ! $type) {
            return;
        }

        $min = $type->min_value !== null ? (float) $type->min_value : null;
        $max = $type->max_value !== null ? (float) $type->max_value : null;
        if ($min === null && $max === null) {
            return;
        }

        $isLow = $min !== null && $value < $min;
        $isHigh = $max !== null && $value > $max;

        if (! $isLow && ! $isHigh) {
            HealthMetricAlert::query()
                ->where('health_metric_id', $metric->health_metric_id)
                ->where('status', HealthMetricAlert::OPEN_STATUS)
                ->update([
                    'status' => HealthMetricAlert::RESOLVED_STATUS,
                    'resolved_at' => now(),
                ]);
            return;
        }

        $direction = $isLow ? 'thấp hơn ngưỡng' : 'cao hơn ngưỡng';
        $typeName = $type->health_type_name ?: 'Chỉ số sức khỏe';

        HealthMetricAlert::query()->updateOrCreate([
            'health_metric_id' => $metric->health_metric_id,
        ], [
            'patient_id' => $metric->patient_id,
            'doctor_id' => $doctorId ?: $metric->monitoring?->medicalRecord?->doctor_id,
            'health_type_id' => $metric->health_type_id,
            'alert_time' => $metric->measure_time ?: now(),
            'metric_value' => $value,
            'min_value' => $min,
            'max_value' => $max,
            'severity' => 'warning',
            'status' => HealthMetricAlert::OPEN_STATUS,
            'message' => "{$typeName} {$direction}: {$metric->value}",
            'resolved_at' => null,
        ]);
    }
}
