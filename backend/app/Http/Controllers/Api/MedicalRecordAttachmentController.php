<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MedicalRecord;
use App\Models\MedicalRecordAttachment;
use App\Services\DoctorRecordScope;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MedicalRecordAttachmentController extends Controller
{
    public function __construct(private readonly DoctorRecordScope $scope) {}

    public function index(Request $request, MedicalRecord $medicalRecord)
    {
        $this->scope->assertRecord($request->user(), $medicalRecord);

        return response()->json($medicalRecord->documents()
            ->select(['document_id', 'record_id', 'visit_date', 'document_type', 'file_path', 'created_at'])
            ->latest('created_at')
            ->get());
    }

    public function store(Request $request, MedicalRecord $medicalRecord)
    {
        $this->scope->assertRecord($request->user(), $medicalRecord);
        $data = $request->validate([
            'file' => ['required', 'file', 'max:10240'],
            'document_type' => ['nullable', 'string', 'max:100'],
        ]);
        $path = $data['file']->store("medical-records/{$medicalRecord->record_id}", 'public');
        $document = $medicalRecord->documents()->create([
            'visit_date' => $medicalRecord->visit_date,
            'document_type' => $data['document_type'] ?? $data['file']->getClientOriginalName(),
            'file_path' => Storage::url($path),
        ]);

        return response()->json($document, 201);
    }

    public function download(Request $request, MedicalRecordAttachment $attachment)
    {
        $this->scope->assertRecord($request->user(), $attachment->medicalRecord);
        $relativePath = str_replace('/storage/', '', $attachment->file_path ?? '');
        abort_unless($relativePath && Storage::disk('public')->exists($relativePath), 404, 'Không tìm thấy tệp.');

        return Storage::disk('public')->download($relativePath, $attachment->description ?: basename($relativePath));
    }

    public function destroy(Request $request, MedicalRecordAttachment $attachment)
    {
        $this->scope->assertRecord($request->user(), $attachment->medicalRecord);
        $relativePath = str_replace('/storage/', '', $attachment->file_path ?? '');
        if ($relativePath) {
            Storage::disk('public')->delete($relativePath);
        }
        $attachment->delete();

        return response()->json(['message' => 'Đã xóa tài liệu.']);
    }
}
