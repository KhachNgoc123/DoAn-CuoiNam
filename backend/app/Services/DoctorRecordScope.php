<?php

namespace App\Services;

use App\Models\MedicalRecord;
use App\Models\Patient;
use App\Models\Doctor;
use Illuminate\Database\Eloquent\Builder;

class DoctorRecordScope
{
    public function visiblePatients(Doctor $doctor): Builder
    {
        return Patient::query()->where(function (Builder $query) use ($doctor) {
            $query->whereHas('medicalRecords', fn (Builder $record) => $record
                ->where('doctor_id', $doctor->doctor_id))
                ->orWhereDoesntHave('medicalRecords');
        });
    }

    public function treatedPatients(Doctor $doctor): Builder
    {
        return Patient::query()->whereHas('medicalRecords', fn (Builder $record) => $record
            ->where('doctor_id', $doctor->doctor_id));
    }

    public function canAccessPatient(Doctor $doctor, Patient $patient): bool
    {
        return $patient->exists;
    }

    public function assertPatient(Doctor $doctor, Patient $patient): void
    {
        abort_unless($this->canAccessPatient($doctor, $patient), 403, 'Bệnh nhân không thuộc phạm vi điều trị của bác sĩ.');
    }

    public function assertRecord(Doctor $doctor, MedicalRecord $record): void
    {
        abort_unless(
            (int) $record->doctor_id === (int) $doctor->doctor_id,
            403,
            'Hồ sơ bệnh án không thuộc bác sĩ đang đăng nhập.',
        );
    }
}
