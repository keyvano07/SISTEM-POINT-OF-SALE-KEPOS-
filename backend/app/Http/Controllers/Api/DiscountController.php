<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Discount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DiscountController extends Controller
{
    /**
     * Display a listing of discounts.
     */
    public function index(Request $request)
    {
        $discounts = Discount::with(['product', 'category'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar promo diskon berhasil diambil.',
            'data' => $discounts
        ]);
    }

    /**
     * Display active discounts.
     */
    public function active(Request $request)
    {
        $discounts = Discount::with(['product', 'category'])
            ->active()
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar promo diskon aktif berhasil diambil.',
            'data' => $discounts
        ]);
    }

    /**
     * Store a newly created discount.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!in_array($user->role, ['super_admin', 'manager'])) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki wewenang untuk membuat promo diskon.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'scope' => 'required|in:transaction,product,category',
            'type' => 'required|in:percentage,fixed_amount',
            'value' => 'required|numeric|min:0.01',
            'target' => 'required|in:all,member_only,tier_specific',
            'target_tier' => 'required_if:target,tier_specific|nullable|in:bronze,silver,gold',
            'target_product_id' => 'required_if:scope,product|nullable|exists:products,id',
            'target_category_id' => 'required_if:scope,category|nullable|exists:categories,id',
            'min_purchase_amount' => 'nullable|numeric|min:0',
            'max_discount_amount' => 'nullable|numeric|min:0',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
        ], [
            'name.required' => 'Nama promo diskon harus diisi.',
            'scope.required' => 'Cakupan (scope) diskon harus dipilih.',
            'type.required' => 'Tipe diskon harus dipilih.',
            'value.required' => 'Nilai diskon harus diisi.',
            'value.min' => 'Nilai diskon minimal 0.01.',
            'target.required' => 'Target audiens harus diisi.',
            'target_tier.required_if' => 'Tier target harus dipilih jika target adalah spesifik tier.',
            'target_product_id.required_if' => 'Produk target harus dipilih jika cakupan adalah produk.',
            'target_category_id.required_if' => 'Kategori target harus dipilih jika cakupan adalah kategori.',
            'start_date.required' => 'Tanggal mulai promo harus ditentukan.',
            'end_date.required' => 'Tanggal akhir promo harus ditentukan.',
            'end_date.after' => 'Tanggal akhir promo harus setelah tanggal mulai.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors' => $validator->errors()
            ], 422);
        }

        $discount = Discount::create([
            'store_id' => $user->store_id,
            'name' => $request->name,
            'description' => $request->description,
            'scope' => $request->scope,
            'type' => $request->type,
            'value' => $request->value,
            'target' => $request->target,
            'target_tier' => $request->target === 'tier_specific' ? $request->target_tier : null,
            'target_product_id' => $request->scope === 'product' ? $request->target_product_id : null,
            'target_category_id' => $request->scope === 'category' ? $request->target_category_id : null,
            'min_purchase_amount' => $request->min_purchase_amount ?? 0.00,
            'max_discount_amount' => $request->max_discount_amount,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Promo diskon baru berhasil dibuat.',
            'data' => $discount
        ], 201);
    }

    /**
     * Remove the specified discount.
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!in_array($user->role, ['super_admin', 'manager'])) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki wewenang untuk menghapus promo diskon.'
            ], 403);
        }

        $discount = Discount::find($id);
        if (!$discount) {
            return response()->json([
                'success' => false,
                'message' => 'Promo diskon tidak ditemukan.'
            ], 404);
        }

        $discount->delete();

        return response()->json([
            'success' => true,
            'message' => 'Promo diskon berhasil dihapus.'
        ]);
    }

    /**
     * Preview discount calculations for items.
     */
    public function previewCalculation(Request $request)
    {
        $user = $request->user();
        
        $validator = Validator::make($request->all(), [
            'member_id' => 'nullable|integer',
            'items' => 'required|array',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors' => $validator->errors()
            ], 422);
        }

        $discountService = resolve(\App\Services\DiscountService::class);
        $result = $discountService->calculate($user->store_id, $request->items, $request->member_id);

        return response()->json([
            'success' => true,
            'data' => $result
        ]);
    }
}
