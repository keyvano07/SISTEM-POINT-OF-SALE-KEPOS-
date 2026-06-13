<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ShiftController extends Controller
{
    /**
     * Get a list of all shifts (Supervisor/Manager).
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // Only owner, manager, supervisor, or super_admin can view all shifts
        if (!in_array($user->role, ['owner', 'manager', 'supervisor', 'super_admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak. Anda tidak memiliki wewenang untuk melihat riwayat shift.'
            ], 403);
        }

        try {
            $query = Shift::with('cashier')
                ->where('store_id', $user->store_id)
                ->orderBy('created_at', 'desc');

            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            if ($request->has('audit_status')) {
                $query->where('audit_status', $request->audit_status);
            }

            if ($request->has('date') && !empty($request->date)) {
                $query->whereDate('opened_at', $request->date);
            }

            if ($request->has('paginate') && $request->paginate == 'true') {
                $shifts = $query->paginate(15);
            } else {
                $shifts = $query->get();
            }

            return response()->json([
                'success' => true,
                'message' => 'Daftar shift berhasil diambil.',
                'data' => $shifts
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil daftar shift.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Open a new shift for the cashier.
     */
    public function open(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'opening_cash' => 'required|numeric|min:0',
        ], [
            'opening_cash.required' => 'Jumlah modal awal (opening cash) wajib diisi.',
            'opening_cash.numeric' => 'Jumlah modal awal harus berupa angka.',
            'opening_cash.min' => 'Jumlah modal awal tidak boleh negatif.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = $request->user();

        // Check if cashier already has an active (open) shift
        $activeShift = Shift::where('cashier_id', $user->id)
            ->where('status', 'open')
            ->first();

        if ($activeShift) {
            return response()->json([
                'success' => false,
                'message' => 'Anda sudah memiliki shift aktif. Tutup shift saat ini sebelum membuka yang baru.',
                'data' => [
                    'id' => $activeShift->id,
                    'shift_code' => $activeShift->shift_code,
                    'status' => $activeShift->status,
                ]
            ], 422);
        }

        try {
            $shift = DB::transaction(function () use ($request, $user) {
                // Generate Shift Code: SHIFT-YYYYMMDD-XXXX (daily reset)
                $datePrefix = 'SHIFT-' . now()->format('Ymd') . '-';

                $latestShift = Shift::where('shift_code', 'like', $datePrefix . '%')
                    ->lockForUpdate()
                    ->orderBy('shift_code', 'desc')
                    ->first();

                $nextNumber = 1;
                if ($latestShift) {
                    $parts = explode('-', $latestShift->shift_code);
                    $lastNum = (int) end($parts);
                    $nextNumber = $lastNum + 1;
                }

                $shiftCode = $datePrefix . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);

                return Shift::create([
                    'store_id' => $user->store_id,
                    'cashier_id' => $user->id,
                    'shift_code' => $shiftCode,
                    'opening_cash' => $request->opening_cash,
                    'status' => 'open',
                    'opened_at' => now(),
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Shift berhasil dibuka.',
                'data' => [
                    'id' => $shift->id,
                    'shift_code' => $shift->shift_code,
                    'cashier_id' => $shift->cashier_id,
                    'opening_cash' => $shift->opening_cash,
                    'status' => $shift->status,
                    'opened_at' => $shift->opened_at,
                ]
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat membuka shift.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Close the active shift (Blind Cash Drop).
     * The cashier submits the physical cash count without seeing the expected amount.
     * The system calculates discrepancy internally but hides it from the cashier response.
     * After closing, the cashier's Sanctum token is revoked (auto-logout).
     */
    public function close(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'physical_cash_input' => 'required|numeric|min:0',
        ], [
            'physical_cash_input.required' => 'Jumlah uang fisik di laci kas wajib diisi.',
            'physical_cash_input.numeric' => 'Jumlah uang fisik harus berupa angka.',
            'physical_cash_input.min' => 'Jumlah uang fisik tidak boleh negatif.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = $request->user();

        // Find the active shift for this cashier
        $shift = Shift::where('cashier_id', $user->id)
            ->where('status', 'open')
            ->first();

        if (!$shift) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada shift aktif yang dapat ditutup.'
            ], 422);
        }

        try {
            DB::transaction(function () use ($shift, $request, $user) {
                // Calculate expected cash: opening_cash + SUM(cash payments in this shift)
                $cashPaymentsSum = DB::table('payments')
                    ->join('transactions', 'payments.transaction_id', '=', 'transactions.id')
                    ->where('transactions.shift_id', $shift->id)
                    ->where('transactions.status', 'completed')
                    ->where('payments.method', 'cash')
                    ->select(DB::raw('SUM(payments.amount - payments.change_amount) as total'))
                    ->first()
                    ->total ?? 0.00;

                $expectedCash = $shift->opening_cash + $cashPaymentsSum;

                $physicalCash = $request->physical_cash_input;
                $discrepancy = $physicalCash - $expectedCash;

                $shift->physical_cash_input = $physicalCash;
                $shift->expected_cash = $expectedCash;
                $shift->discrepancy = $discrepancy;
                $shift->status = 'closed';
                $shift->closed_at = now();
                $shift->save();

                // Revoke the current Sanctum token (auto-logout)
                $user->currentAccessToken()->delete();
            });

            // Response: do NOT expose expected_cash or discrepancy (Blind Drop)
            return response()->json([
                'success' => true,
                'message' => 'Shift berhasil ditutup. Sistem telah mencatat input laci kas. Anda telah logout secara otomatis.'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menutup shift.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get the active shift for the currently authenticated cashier.
     */
    public function active(Request $request)
    {
        $user = $request->user();

        $shift = Shift::where('cashier_id', $user->id)
            ->where('status', 'open')
            ->first();

        if (!$shift) {
            return response()->json([
                'success' => true,
                'message' => 'Tidak ada shift aktif untuk kasir ini.',
                'data' => null
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Shift aktif ditemukan.',
            'data' => [
                'id' => $shift->id,
                'shift_code' => $shift->shift_code,
                'opening_cash' => $shift->opening_cash,
                'status' => $shift->status,
                'opened_at' => $shift->opened_at,
            ]
        ]);
    }

    /**
     * Audit Reconciliation for a closed shift (Supervisor/Manager).
     */
    public function audit(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'audit_status' => 'required|in:balance,discrepancy',
            'audit_notes' => 'nullable|string|max:255',
        ], [
            'audit_status.required' => 'Status audit harus diisi.',
            'audit_status.in' => 'Status audit harus berupa balance atau discrepancy.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi audit gagal.',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = $request->user();

        // Only owner, manager, supervisor, or super_admin can audit
        if (!in_array($user->role, ['owner', 'manager', 'supervisor', 'super_admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak. Anda tidak memiliki wewenang untuk melakukan audit shift.'
            ], 403);
        }

        try {
            $shift = Shift::findOrFail($id);

            if ($shift->status !== 'closed') {
                return response()->json([
                    'success' => false,
                    'message' => 'Shift belum ditutup. Hanya shift berstatus closed yang dapat diaudit.'
                ], 422);
            }

            $shift->audit_status = $request->audit_status;
            $shift->audit_notes = $request->audit_notes;
            $shift->audited_by = $user->id;
            $shift->audited_at = now();
            $shift->save();

            return response()->json([
                'success' => true,
                'message' => 'Audit shift berhasil diselesaikan.',
                'data' => [
                    'id' => $shift->id,
                    'shift_code' => $shift->shift_code,
                    'opening_cash' => $shift->opening_cash,
                    'physical_cash_input' => $shift->physical_cash_input,
                    'expected_cash' => $shift->expected_cash,
                    'discrepancy' => $shift->discrepancy,
                    'status' => $shift->status,
                    'audit_status' => $shift->audit_status,
                    'audit_notes' => $shift->audit_notes,
                    'audited_at' => $shift->audited_at->toIso8601String()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengaudit shift.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get details of a specific shift (Supervisor/Manager/Owner).
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();

        // Only owner, manager, supervisor, or super_admin can view shift details
        if (!in_array($user->role, ['owner', 'manager', 'supervisor', 'super_admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak. Anda tidak memiliki wewenang untuk melihat detail shift.'
            ], 403);
        }

        try {
            $shift = Shift::with(['cashier', 'auditor'])->findOrFail($id);

            // Verify store_id matches
            if ($shift->store_id !== $user->store_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Akses ditolak. Shift ini bukan milik toko Anda.'
                ], 403);
            }

            // Get payment summary for this shift (completed transactions only)
            $paymentSummary = DB::table('payments')
                ->join('transactions', 'payments.transaction_id', '=', 'transactions.id')
                ->where('transactions.shift_id', $shift->id)
                ->where('transactions.status', 'completed')
                ->select('payments.method', DB::raw('SUM(payments.amount - payments.change_amount) as total'))
                ->groupBy('payments.method')
                ->pluck('total', 'method');

            // Load transactions for this shift
            $transactions = DB::table('transactions')
                ->where('shift_id', $shift->id)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Detail shift berhasil diambil.',
                'data' => [
                    'shift' => $shift,
                    'payment_summary' => [
                        'cash' => (float) ($paymentSummary['cash'] ?? 0),
                        'qris' => (float) ($paymentSummary['qris'] ?? 0),
                        'debit_card' => (float) ($paymentSummary['debit_card'] ?? 0),
                        'credit_card' => (float) ($paymentSummary['credit_card'] ?? 0),
                    ],
                    'transactions' => $transactions
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil detail shift.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
