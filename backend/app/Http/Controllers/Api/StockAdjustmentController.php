<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockAdjustment;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class StockAdjustmentController extends Controller
{
    protected $stockService;

    public function __construct(StockService $stockService)
    {
        $this->stockService = $stockService;
    }

    /**
     * Display a listing of stock adjustments.
     */
    public function index(Request $request)
    {
        $query = StockAdjustment::with(['product', 'requester', 'approver'])
            ->orderBy('created_at', 'desc');

        if ($request->has('status') && !empty($request->status)) {
            $query->where('status', $request->status);
        }

        $adjustments = $query->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar penyesuaian stok berhasil diambil.',
            'data' => $adjustments
        ]);
    }

    /**
     * Store a newly created stock adjustment.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        
        // Stocker, supervisor, manager, super_admin are allowed to submit adjustments
        if (!in_array($user->role, ['super_admin', 'manager', 'supervisor', 'stocker'])) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki wewenang untuk mengajukan penyesuaian stok.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'product_id' => 'required|exists:products,id',
            'quantity_change' => 'required|integer|not_in:0',
            'reason_code' => 'required|in:damaged,expired,opname',
            'notes' => 'nullable|string',
        ], [
            'product_id.required' => 'Produk harus dipilih.',
            'product_id.exists' => 'Produk tidak valid.',
            'quantity_change.required' => 'Jumlah perubahan stok harus diisi.',
            'quantity_change.integer' => 'Jumlah perubahan stok harus berupa angka bulat.',
            'quantity_change.not_in' => 'Jumlah perubahan stok tidak boleh nol.',
            'reason_code.required' => 'Alasan penyesuaian harus dipilih.',
            'reason_code.in' => 'Alasan penyesuaian tidak valid.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors' => $validator->errors()
            ], 422);
        }

        $product = Product::find($request->product_id);
        
        // Verify we don't adjust stock below 0 if reducing stock
        if ($request->quantity_change < 0 && ($product->stock_quantity + $request->quantity_change) < 0) {
            return response()->json([
                'success' => false,
                'message' => 'Penyesuaian gagal. Stok akhir tidak boleh kurang dari 0. (Stok saat ini: ' . $product->stock_quantity . ')'
            ], 422);
        }

        $adjustment = $this->stockService->adjustStock(
            $user,
            $product,
            $request->quantity_change,
            $request->reason_code,
            $request->notes
        );

        $message = $adjustment->status === 'approved' 
            ? 'Penyesuaian stok berhasil disimpan dan disetujui otomatis.' 
            : 'Penyesuaian stok berhasil diajukan dan memerlukan persetujuan Manager.';

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $adjustment
        ], 201);
    }

    /**
     * Restock a product (Input Barang Masuk).
     */
    public function restock(Request $request)
    {
        $user = $request->user();
        
        // Manager, supervisor, and stocker are allowed to restock
        if (!in_array($user->role, ['super_admin', 'manager', 'supervisor', 'stocker'])) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki wewenang untuk melakukan restock barang.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string',
        ], [
            'product_id.required' => 'Produk harus dipilih.',
            'product_id.exists' => 'Produk tidak valid.',
            'quantity.required' => 'Kuantitas restock harus diisi.',
            'quantity.integer' => 'Kuantitas restock harus berupa angka bulat.',
            'quantity.min' => 'Kuantitas restock minimal 1.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors' => $validator->errors()
            ], 422);
        }

        $product = Product::find($request->product_id);
        
        $movement = $this->stockService->restock(
            $user,
            $product,
            $request->quantity,
            $request->notes
        );

        return response()->json([
            'success' => true,
            'message' => 'Barang masuk berhasil disimpan dan stok produk diperbarui.',
            'data' => $movement
        ], 201);
    }

    /**
     * Approve a stock adjustment.
     */
    public function approve(Request $request, $id)
    {
        $user = $request->user();

        // Only manager, supervisor, or super_admin can approve
        if (!in_array($user->role, ['super_admin', 'manager', 'supervisor'])) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki wewenang untuk menyetujui penyesuaian stok.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'pin' => 'required|string|size:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors' => $validator->errors()
            ], 422);
        }

        // Verify the PIN
        $pinMatched = false;
        $authorizedUser = null;
        $authorizedUsers = \App\Models\User::whereIn('role', ['super_admin', 'manager', 'supervisor'])
            ->where('is_active', true)
            ->whereNotNull('pin')
            ->get();

        foreach ($authorizedUsers as $authU) {
            if (\Illuminate\Support\Facades\Hash::check($request->pin, $authU->pin)) {
                $pinMatched = true;
                $authorizedUser = $authU;
                break;
            }
        }

        if (!$pinMatched) {
            return response()->json([
                'success' => false,
                'message' => 'PIN otorisasi tidak valid.'
            ], 403);
        }

        // Find the adjustment
        $adjustment = StockAdjustment::find($id);
        if (!$adjustment) {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan penyesuaian stok tidak ditemukan.'
            ], 404);
        }

        if ($adjustment->status !== 'pending_approval') {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan penyesuaian stok ini sudah diproses.'
            ], 422);
        }

        // Run the approval in service/transaction
        try {
            $adjustment = $this->stockService->approveAdjustment($adjustment, $authorizedUser);
            return response()->json([
                'success' => true,
                'message' => 'Pengajuan penyesuaian stok berhasil disetujui.',
                'data' => $adjustment
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat memproses persetujuan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject a stock adjustment.
     */
    public function reject(Request $request, $id)
    {
        $user = $request->user();

        // Only manager, supervisor, or super_admin can reject
        if (!in_array($user->role, ['super_admin', 'manager', 'supervisor'])) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki wewenang untuk menolak penyesuaian stok.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'pin' => 'required|string|size:6',
            'notes' => 'required|string|min:3',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors' => $validator->errors()
            ], 422);
        }

        // Verify the PIN
        $pinMatched = false;
        $authorizedUser = null;
        $authorizedUsers = \App\Models\User::whereIn('role', ['super_admin', 'manager', 'supervisor'])
            ->where('is_active', true)
            ->whereNotNull('pin')
            ->get();

        foreach ($authorizedUsers as $authU) {
            if (\Illuminate\Support\Facades\Hash::check($request->pin, $authU->pin)) {
                $pinMatched = true;
                $authorizedUser = $authU;
                break;
            }
        }

        if (!$pinMatched) {
            return response()->json([
                'success' => false,
                'message' => 'PIN otorisasi tidak valid.'
            ], 403);
        }

        // Find the adjustment
        $adjustment = StockAdjustment::find($id);
        if (!$adjustment) {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan penyesuaian stok tidak ditemukan.'
            ], 404);
        }

        if ($adjustment->status !== 'pending_approval') {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan penyesuaian stok ini sudah diproses.'
            ], 422);
        }

        // Run the rejection in service/transaction
        try {
            $adjustment = $this->stockService->rejectAdjustment($adjustment, $authorizedUser, $request->notes);
            return response()->json([
                'success' => true,
                'message' => 'Pengajuan penyesuaian stok berhasil ditolak.',
                'data' => $adjustment
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat memproses penolakan: ' . $e->getMessage()
            ], 500);
        }
    }
}

