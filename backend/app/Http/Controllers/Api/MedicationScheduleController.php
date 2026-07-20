<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FrequencyType;
use App\Models\MealTime;
use App\Models\MedicationSchedule;
use App\Models\PrescriptionItem;
use App\Services\DoctorRecordScope;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class MedicationScheduleController extends Controller
{
    public function __construct(private readonly DoctorRecordScope $scope) {}

    public function index(Request $request)
    {
        return response()->json($this->cachedForUser($request, 'medicine-schedules:index', function () use ($request) {
            $query = MedicationSchedule::query()
                ->select(['schedule_id', 'prescription_detail_id', 'start_date', 'end_date', 'frequency_type_id', 'meal_time_id', 'time_of_day', 'note', 'status'])
                ->with($this->listRelations())
                ->whereHas('prescriptionDetail.prescription.medicalRecord', fn ($record) => $record
                    ->where('doctor_id', $request->user()->doctor_id))
                ->when($request->patient_id, fn ($q, $id) => $q
                    ->whereHas('prescriptionDetail.prescription.medicalRecord', fn ($record) => $record
                        ->where('patient_id', $id)))
                ->when($request->date, fn ($q, $date) => $q
                    ->whereDate('start_date', '<=', $date)
                    ->whereDate('end_date', '>=', $date))
                ->when($request->from_date, fn ($q, $date) => $q->whereDate('end_date', '>=', $date))
                ->when($request->to_date, fn ($q, $date) => $q->whereDate('start_date', '<=', $date))
                ->when($request->status, function ($q, $status) {
                    $normalized = MedicationSchedule::normalizeStatus($status);
                    if (in_array($normalized, MedicationSchedule::ACTIVE_STATUSES, true)) {
                        return $q
                            ->whereIn('status', MedicationSchedule::ACTIVE_STATUSES)
                            ->whereDate('end_date', '>=', today());
                    }
                    if (in_array($normalized, MedicationSchedule::COMPLETED_STATUSES, true)) {
                        return $q->where(function ($completed) {
                            $completed
                                ->whereIn('status', MedicationSchedule::COMPLETED_STATUSES)
                                ->orWhere(function ($expiredActive) {
                                    $expiredActive
                                        ->whereIn('status', MedicationSchedule::ACTIVE_STATUSES)
                                        ->whereDate('end_date', '<', today());
                                });
                        });
                    }
                    if (in_array($normalized, MedicationSchedule::PAUSED_STATUSES, true)) {
                        return $q->whereIn('status', MedicationSchedule::PAUSED_STATUSES);
                    }
                    if (in_array($normalized, MedicationSchedule::CANCELLED_STATUSES, true)) {
                        return $q->whereIn('status', MedicationSchedule::CANCELLED_STATUSES);
                    }

                    return $q->where('status', $normalized);
                })
                ->when($request->search, fn ($q, $search) => $q->where(function ($inner) use ($search) {
                    $inner->where('note', 'like', "%{$search}%")
                        ->orWhereHas('prescriptionDetail.medicine', fn ($medicine) => $medicine
                            ->where('medicine_name', 'like', "%{$search}%"))
                        ->orWhereHas('prescriptionDetail.prescription.medicalRecord.patient', fn ($patient) => $patient
                            ->where('full_name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%")
                            ->orWhere('patient_id', $search));
                }));

            $paginator = $query->latest('schedule_id')->paginate($this->perPage($request, 20, 50));
            $paginator->getCollection()->transform(fn (MedicationSchedule $schedule) => $this->listItem(
                $this->decorate($schedule),
            ));

            return $paginator;
        }));
    }

    public function show(Request $request, MedicationSchedule $medicationSchedule)
    {
        $record = $this->recordFor($medicationSchedule);
        $record->loadMissing('patient');
        $this->scope->assertPatient($request->user(), $record->patient);

        return response()->json($this->decorate($this->detail($medicationSchedule)));
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $this->assertCanManageDetail($request, (int) $data['prescription_detail_id']);

        return DB::transaction(function () use ($data, $request) {
            $times = $data['times'] ?? [];
            unset($data['times']);
            $this->applyDetailDefaults($data, $times);
            $data['status'] = MedicationSchedule::normalizeStatus($data['status'] ?? null);
            $schedule = MedicationSchedule::create($data);
            foreach ($times as $time) {
                $schedule->times()->create(['time_take' => $time]);
            }
            $this->flushUserApiCache($request);

            return response()->json($this->detail($schedule), 201);
        });
    }

    public function update(Request $request, MedicationSchedule $medicationSchedule)
    {
        $this->scope->assertRecord($request->user(), $this->recordFor($medicationSchedule));
        $data = $this->validated($request, true);
        if (array_key_exists('status', $data)) {
            $data['status'] = MedicationSchedule::normalizeStatus($data['status']);
        }
        if ($this->isStatusOnlyUpdate($data)) {
            $medicationSchedule->update($data);
            $this->flushUserApiCache($request);

            return response()->json($this->decorate($this->detail($medicationSchedule->fresh())));
        }

        abort_unless($this->recordFor($medicationSchedule)->isInTreatment(), 422, 'Không thể sửa lịch nhắc thuốc của hồ sơ đã hoàn thành.');
        if (isset($data['prescription_detail_id'])) {
            $this->assertCanManageDetail($request, (int) $data['prescription_detail_id']);
        }

        return DB::transaction(function () use ($data, $medicationSchedule, $request) {
            $times = $data['times'] ?? null;
            unset($data['times']);
            if (isset($data['prescription_detail_id'])) {
                $this->applyDetailDefaults($data, $times ?? []);
            } elseif (is_array($times)) {
                $data['time_of_day'] = $times[0] ?? null;
            }
            $medicationSchedule->update($data);
            if (is_array($times)) {
                $medicationSchedule->times()->delete();
                foreach ($times as $time) {
                    $medicationSchedule->times()->create(['time_take' => $time]);
                }
            }
            $this->flushUserApiCache($request);

            return response()->json($this->detail($medicationSchedule->fresh()));
        });
    }

    public function destroy(Request $request, MedicationSchedule $medicationSchedule)
    {
        $this->scope->assertRecord($request->user(), $this->recordFor($medicationSchedule));
        $medicationSchedule->update(['status' => MedicationSchedule::CANCELLED_STATUS]);
        $this->flushUserApiCache($request);

        return response()->json($this->decorate($this->detail($medicationSchedule->fresh())));
    }

    public function frequencyTypes()
    {
        return response()->json(Cache::remember('frequency-types:list', now()->addHours(6), fn () => FrequencyType::query()
            ->select(['frequency_type_id', 'frequency_id', 'frequency_name', 'times_per_day', 'description'])
            ->orderBy('frequency_type_id')
            ->get()));
    }

    public function mealTimes()
    {
        $allowedMealTimes = ['Trước ăn', 'Trong khi ăn', 'Sau ăn'];

        return response()->json(Cache::remember('meal-times:list:meal-only', now()->addHours(6), fn () => MealTime::query()
            ->select(['meal_time_id', 'meal_time_name', 'description'])
            ->whereIn('meal_time_name', $allowedMealTimes)
            ->orderBy('meal_time_id')
            ->get()));
    }

    public function scheduleDays()
    {
        return response()->json([]);
    }

    private function detail(MedicationSchedule $schedule): MedicationSchedule
    {
        return $schedule->load($this->relations());
    }

    private function decorate(MedicationSchedule $schedule): MedicationSchedule
    {
        $status = MedicationSchedule::normalizeStatus($schedule->status);
        if (
            in_array($status, MedicationSchedule::ACTIVE_STATUSES, true)
            && $schedule->end_date
            && $schedule->end_date->lt(today())
        ) {
            $status = MedicationSchedule::COMPLETED_STATUS;
        }

        $isActive = in_array($status, MedicationSchedule::ACTIVE_STATUSES, true);
        $isCancelled = in_array($status, MedicationSchedule::CANCELLED_STATUSES, true);
        $isCompleted = in_array($status, MedicationSchedule::COMPLETED_STATUSES, true);

        $schedule->setAttribute('status', $status);
        $schedule->setAttribute('can_modify', $isActive);
        $schedule->setAttribute('can_pause', $isActive);
        $schedule->setAttribute('can_cancel', ! $isCancelled && ! $isCompleted);

        return $schedule;
    }

    private function relations(): array
    {
        return [
            'prescriptionDetail.medicine',
            'prescriptionDetail.prescription.medicalRecord.patient',
            'prescriptionDetail.frequencyType',
            'prescriptionDetail.mealTime',
            'frequencyType',
            'mealTime',
            'times',
            'reminderLogs',
        ];
    }

    private function listRelations(): array
    {
        return [
            'prescriptionDetail:prescription_detail_id,prescription_id,medicine_id,dosage,frequency_type_id,meal_time_id,quantity,instructions,note',
            'prescriptionDetail.medicine:medicine_id,medicine_name,unit',
            'prescriptionDetail.prescription:prescription_id,record_id',
            'prescriptionDetail.prescription.medicalRecord:record_id,patient_id,doctor_id',
            'prescriptionDetail.prescription.medicalRecord.patient:patient_id,full_name,phone,gender,date_of_birth',
            'prescriptionDetail.prescription.medicalRecord.doctor:doctor_id,full_name',
            'prescriptionDetail.frequencyType:frequency_type_id,frequency_id,frequency_name,times_per_day',
            'prescriptionDetail.mealTime:meal_time_id,meal_time_name',
            'frequencyType:frequency_type_id,frequency_id,frequency_name,times_per_day',
            'mealTime:meal_time_id,meal_time_name',
            'times:schedule_time_id,schedule_id,time_take',
        ];
    }

    private function listItem(MedicationSchedule $schedule): array
    {
        $detail = $schedule->prescriptionDetail;
        $prescription = $detail?->prescription;
        $record = $prescription?->medicalRecord;
        $patient = $record?->patient;
        $doctor = $record?->doctor;

        return [
            'id' => $schedule->schedule_id,
            'schedule_id' => $schedule->schedule_id,
            'prescription_detail_id' => $schedule->prescription_detail_id,
            'start_date' => $schedule->start_date,
            'end_date' => $schedule->end_date,
            'frequency_type_id' => $schedule->frequency_type_id,
            'meal_time_id' => $schedule->meal_time_id,
            'time_of_day' => $schedule->time_of_day,
            'note' => $schedule->note ?: $detail?->instructions,
            'status' => $schedule->status,
            'can_modify' => $schedule->can_modify,
            'can_pause' => $schedule->can_pause,
            'can_cancel' => $schedule->can_cancel,
            'frequency_type' => $schedule->frequencyType ? [
                'frequency_type_id' => $schedule->frequencyType->frequency_type_id,
                'frequency_id' => $schedule->frequencyType->frequency_id,
                'frequency_name' => $schedule->frequencyType->frequency_name,
                'type_name' => $schedule->frequencyType->type_name,
                'times_per_day' => $schedule->frequencyType->times_per_day,
            ] : null,
            'meal_time' => $schedule->mealTime ? [
                'meal_time_id' => $schedule->mealTime->meal_time_id,
                'meal_time_name' => $schedule->mealTime->meal_time_name,
            ] : null,
            'times' => $schedule->times->map(fn ($time) => [
                'schedule_time_id' => $time->schedule_time_id,
                'id' => $time->schedule_time_id,
                'time_take' => $time->time_take,
            ])->values(),
            'prescription_detail' => $detail ? [
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
                'prescription' => $prescription ? [
                    'prescription_id' => $prescription->prescription_id,
                'medical_record' => $record ? [
                    'record_id' => $record->record_id,
                    'doctor' => $doctor ? [
                        'doctor_id' => $doctor->doctor_id,
                        'full_name' => $doctor->full_name,
                    ] : null,
                    'patient' => $patient ? [
                            'patient_id' => $patient->patient_id,
                            'full_name' => $patient->full_name,
                            'phone' => $patient->phone,
                            'gender' => $patient->gender,
                            'date_of_birth' => $patient->date_of_birth,
                        ] : null,
                    ] : null,
                ] : null,
            ] : null,
        ];
    }

    private function validated(Request $request, bool $partial = false): array
    {
        return $request->validate([
            'prescription_detail_id' => [$partial ? 'sometimes' : 'required', 'exists:prescription_details,prescription_detail_id'],
            'start_date' => [$partial ? 'sometimes' : 'required', 'date_format:Y-m-d'],
            'end_date' => [$partial ? 'sometimes' : 'required', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'frequency_type_id' => [$partial ? 'sometimes' : 'required', 'exists:frequency_types,frequency_type_id'],
            'meal_time_id' => ['nullable', 'exists:meal_times,meal_time_id'],
            'note' => ['nullable', 'string'],
            'status' => ['nullable', 'in:' . implode(',', MedicationSchedule::STATUSES)],
            'times' => [$partial ? 'sometimes' : 'required', 'array', 'min:1'],
            'times.*' => ['date_format:H:i'],
        ], [
            'prescription_detail_id.required' => 'Vui lòng chọn toa thuốc cần tạo lịch nhắc.',
            'start_date.required' => 'Vui lòng nhập ngày bắt đầu uống thuốc.',
            'end_date.required' => 'Vui lòng nhập ngày kết thúc uống thuốc.',
            'end_date.after_or_equal' => 'Ngày kết thúc không được nhỏ hơn ngày bắt đầu.',
            'frequency_type_id.required' => 'Vui lòng chọn tần suất uống thuốc.',
            'times.required' => 'Vui lòng nhập ít nhất một giờ uống thuốc.',
            'times.min' => 'Vui lòng nhập ít nhất một giờ uống thuốc.',
            'times.*.date_format' => 'Giờ uống thuốc không hợp lệ.',
        ]);
    }

    private function recordFor(MedicationSchedule $schedule)
    {
        return $schedule->prescriptionDetail->prescription->medicalRecord;
    }

    private function assertCanManageDetail(Request $request, int $detailId): void
    {
        $detail = PrescriptionItem::with('prescription.medicalRecord')->findOrFail($detailId);
        $record = $detail->prescription->medicalRecord;
        $this->scope->assertRecord($request->user(), $record);
        abort_unless($record->isInTreatment(), 422, 'Không thể tạo lịch nhắc thuốc cho hồ sơ đã hoàn thành.');
    }

    private function applyDetailDefaults(array &$data, array $times): void
    {
        $detail = PrescriptionItem::find($data['prescription_detail_id'] ?? null);
        if (! $detail) {
            return;
        }

        $data['frequency_type_id'] = $data['frequency_type_id'] ?? $detail->frequency_type_id ?: (int) (DB::table('frequency_types')->min('frequency_type_id') ?: 1);
        $data['meal_time_id'] = array_key_exists('meal_time_id', $data) ? $data['meal_time_id'] : $detail->meal_time_id;
        $data['time_of_day'] = $times[0] ?? null;
    }

    private function isStatusOnlyUpdate(array $data): bool
    {
        return array_key_exists('status', $data)
            && empty(array_diff(array_keys($data), ['status']));
    }
}
