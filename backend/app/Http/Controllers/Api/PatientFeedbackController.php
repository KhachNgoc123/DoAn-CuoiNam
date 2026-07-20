<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\PatientFeedback;
use App\Services\DoctorRecordScope;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PatientFeedbackController extends Controller
{
    public function __construct(private readonly DoctorRecordScope $scope) {}

    public function index(Request $request)
    {
        return response()->json($this->cachedForUser($request, 'patient-feedbacks:index', function () use ($request) {
            $query = PatientFeedback::query()
                ->select([
                    'feedback_id',
                    'doctor_id',
                    'patient_id',
                    'patient_name',
                    'patient_phone',
                    'title',
                    'content',
                    'status',
                    'feedback_date',
                    'created_at',
                ])
                ->with(['patient:patient_id,full_name,phone', 'doctor:doctor_id,full_name'])
                ->where('doctor_id', $request->user()->doctor_id)
                ->when($request->status, fn ($q, $status) => $q->where('status', $status))
                ->when($request->patient_id, fn ($q, $id) => $q->where('patient_id', $id))
                ->when($request->from_date, fn ($q, $date) => $q->whereDate('feedback_date', '>=', $date))
                ->when($request->to_date, fn ($q, $date) => $q->whereDate('feedback_date', '<=', $date))
                ->when($request->severity, function ($q, $severity) {
                    if ($severity === 'Khẩn cấp') {
                        return $q->where(function ($inner) {
                            $inner->where('status', 'Khẩn cấp')
                                ->orWhere('title', 'like', '%khẩn%')
                                ->orWhere('content', 'like', '%khẩn%')
                                ->orWhere('title', 'like', '%phản ứng%')
                                ->orWhere('content', 'like', '%phản ứng%')
                                ->orWhere('title', 'like', '%nổi mẩn%')
                                ->orWhere('content', 'like', '%nổi mẩn%');
                        });
                    }

                    if ($severity === 'Thường') {
                        return $q->where('status', '<>', 'Khẩn cấp');
                    }

                    return $q;
                })
                ->when($request->search, fn ($q, $search) => $q->where(function ($inner) use ($search) {
                    $inner->where('title', 'like', "%{$search}%")
                        ->orWhere('content', 'like', "%{$search}%")
                        ->orWhere('patient_name', 'like', "%{$search}%")
                        ->orWhere('patient_phone', 'like', "%{$search}%")
                        ->orWhereHas('patient', fn ($patient) => $patient
                            ->where('full_name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%"));
                }));

            return $query->latest('feedback_date')->latest('feedback_id')->paginate($this->perPage($request, 20, 20));
        }));
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $data['doctor_id'] = $request->user()->doctor_id;
        $data['status'] = $this->normalizeStatus($data['status'] ?? null);

        if (! empty($data['patient_id'])) {
            $patient = Patient::findOrFail($data['patient_id']);
            $this->scope->assertPatient($request->user(), $patient);
            $data['patient_name'] = $data['patient_name'] ?? $patient->full_name;
            $data['patient_phone'] = $data['patient_phone'] ?? $patient->phone;
        }

        $feedback = PatientFeedback::create($data);
        $this->flushUserApiCache($request);

        return response()->json($feedback->load(['patient:patient_id,full_name,phone', 'doctor:doctor_id,full_name']), 201);
    }

    public function update(Request $request, PatientFeedback $patientFeedback)
    {
        abort_unless($patientFeedback->doctor_id === $request->user()->doctor_id, 403);
        $data = $this->validated($request, true);
        if (array_key_exists('status', $data)) {
            $data['status'] = $this->normalizeStatus($data['status']);
        }

        if (array_key_exists('patient_id', $data) && $data['patient_id']) {
            $patient = Patient::findOrFail($data['patient_id']);
            $this->scope->assertPatient($request->user(), $patient);
            $data['patient_name'] = $data['patient_name'] ?? $patient->full_name;
            $data['patient_phone'] = $data['patient_phone'] ?? $patient->phone;
        }

        $patientFeedback->update($data);
        $this->flushUserApiCache($request);

        return response()->json($patientFeedback->fresh()->load(['patient:patient_id,full_name,phone', 'doctor:doctor_id,full_name']));
    }

    public function destroy(Request $request, PatientFeedback $patientFeedback)
    {
        abort_unless($patientFeedback->doctor_id === $request->user()->doctor_id, 403);
        $patientFeedback->delete();
        $this->flushUserApiCache($request);

        return response()->json(['message' => 'Đã xóa phản hồi.']);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        return $request->validate([
            'patient_id' => ['nullable', 'exists:patients,patient_id'],
            'patient_name' => ['nullable', 'string', 'max:150'],
            'patient_phone' => ['nullable', 'string', 'max:20'],
            'title' => [$partial ? 'sometimes' : 'required', 'string', 'max:180'],
            'content' => [$partial ? 'sometimes' : 'required', 'string'],
            'status' => ['nullable', Rule::in(['Mới', 'Đang xử lý', 'Đã xử lý', 'Khẩn cấp', 'new', 'processing', 'resolved', 'urgent'])],
            'feedback_date' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
        ]);
    }

    private function normalizeStatus(?string $status): string
    {
        return match ($status) {
            'processing' => 'Đang xử lý',
            'resolved' => 'Đã xử lý',
            'urgent' => 'Khẩn cấp',
            'new', null, '' => 'Mới',
            default => $status,
        };
    }
}
