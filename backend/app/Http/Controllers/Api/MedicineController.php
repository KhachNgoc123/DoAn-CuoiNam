<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Medicine;
use App\Models\MedicineCategory;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class MedicineController extends Controller
{
    public function index(Request $request)
    {
        return response()->json($this->cachedForUser($request, 'medicines:index', fn () => Medicine::query()
            ->select(['medicine_id', 'category_id', 'medicine_name', 'unit', 'quantity', 'expiry_date', 'description'])
            ->with('category:category_id,category_name,description,status')
            ->when($request->search, fn ($q, $search) => $q->where('medicine_name', 'like', "%{$search}%"))
            ->orderBy('medicine_name')
            ->paginate($this->perPage($request, 20))));
    }

    public function categories(Request $request)
    {
        return response()->json($this->cachedForUser($request, 'medicine-categories:index', fn () => MedicineCategory::query()
            ->select(['category_id', 'category_name', 'description', 'status'])
            ->when($request->search, fn ($q, $search) => $q->where('category_name', 'like', "%{$search}%"))
            ->orderBy('category_name')
            ->paginate($this->perPage($request, 50))));
    }

    public function store(Request $request)
    {
        $medicine = Medicine::create($this->validatedMedicine($request));
        $this->flushUserApiCache($request);

        return response()->json($medicine->load('category:category_id,category_name,description,status'), 201);
    }

    public function show(Medicine $medicine)
    {
        return response()->json($medicine->load('category:category_id,category_name,description,status'));
    }

    public function update(Request $request, Medicine $medicine)
    {
        $medicine->update($this->validatedMedicine($request, $medicine));
        $this->flushUserApiCache($request);

        return response()->json($medicine->fresh()->load('category:category_id,category_name,description,status'));
    }

    public function destroy(Request $request, Medicine $medicine)
    {
        if ($medicine->prescriptionDetails()->exists()) {
            throw ValidationException::withMessages([
                'medicine' => ['Thuốc đã được sử dụng trong toa thuốc, không thể xóa.'],
            ]);
        }

        $medicine->delete();
        $this->flushUserApiCache($request);

        return response()->json(['message' => 'Đã xóa thuốc.']);
    }

    private function validatedMedicine(Request $request, ?Medicine $medicine = null): array
    {
        return $request->validate([
            'category_id' => ['nullable', 'integer', 'exists:medicine_categories,category_id'],
            'medicine_name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('medicines', 'medicine_name')->ignore($medicine?->medicine_id, 'medicine_id'),
            ],
            'unit' => ['nullable', 'string', 'max:50'],
            'quantity' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'expiry_date' => ['nullable', 'date_format:Y-m-d'],
            'description' => ['nullable', 'string', 'max:1000'],
        ], [
            'medicine_name.required' => 'Vui lòng nhập tên thuốc.',
            'medicine_name.unique' => 'Tên thuốc này đã tồn tại.',
            'quantity.min' => 'Số lượng tồn không được nhỏ hơn 0.',
        ]);
    }
}
