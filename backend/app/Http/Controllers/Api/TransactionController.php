<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\OrderDraft;
use App\Models\User;
use App\Models\Shift;
use App\Services\AuditTrailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class TransactionController extends Controller
{
    protected $auditTrailService;

    public function __construct(AuditTrailService $auditTrailService)
    {
        $this->auditTrailService = $auditTrailService;
    }

    /**
     * Display a listing of transactions for history.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $transactions = Transaction::with(['cashier', 'items.product', 'payments'])
            ->where('store_id', $user->store_id)
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Riwayat transaksi berhasil diambil.',
            'data' => $transactions
        ]);
    }

    /**
     * Finalize transaction / checkout.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        // 1. Validate active shift for cashier
        $activeShift = Shift::where('store_id', $user->store_id)
            ->where('cashier_id', $user->id)
            ->where('status', 'open')
            ->first();

        if (!$activeShift) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki shift aktif. Silakan buka shift terlebih dahulu.'
            ], 422);
        }

        // 2. Validate input fields
        $validator = Validator::make($request->all(), [
            'order_draft_id' => 'nullable|exists:order_drafts,id',
            'member_id' => 'nullable|integer',
            'discount_id' => 'nullable|integer',
            'subtotal' => 'required|numeric|min:0',
            'discount_amount' => 'required|numeric|min:0',
            'tax_amount' => 'required|numeric|min:0',
            'grand_total' => 'required|numeric|min:0',
            
            // payments validation
            'payments' => 'required|array|min:1',
            'payments.*.method' => 'required|in:cash,qris,debit_card,credit_card',
            'payments.*.amount' => 'required|numeric|min:0',
            'payments.*.change_amount' => 'required|numeric|min:0',
            'payments.*.reference_number' => 'nullable|string|max:100',
            'payments.*.is_standalone_fallback' => 'nullable|boolean',

            // if order_draft_id is null, direct checkout requires items list
            'items' => 'required_without:order_draft_id|nullable|array',
            'items.*.product_id' => 'required_with:items|exists:products,id',
            'items.*.quantity' => 'required_with:items|integer|min:1',
        ], [
            'payments.required' => 'Detail pembayaran harus dicantumkan.',
            'payments.min' => 'Pembayaran minimal harus memiliki 1 metode.',
            'subtotal.required' => 'Subtotal belanja wajib diisi.',
            'grand_total.required' => 'Grand total tagihan wajib diisi.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi transaksi gagal.',
                'errors' => $validator->errors()
            ], 422);
        }

        // 3. Pre-calculate discounts using DiscountService
        try {
            $itemsForCalc = [];
            if ($request->order_draft_id) {
                $draft = OrderDraft::with('items.product')->findOrFail($request->order_draft_id);
                
                if ($draft->status === 'completed') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Draf pesanan ini sudah diselesaikan sebelumnya.'
                    ], 422);
                }
                
                foreach ($draft->items as $draftItem) {
                    $itemsForCalc[] = [
                        'product_id' => $draftItem->product_id,
                        'quantity' => $draftItem->quantity
                    ];
                }
            } else {
                foreach ($request->items as $itemInput) {
                    $itemsForCalc[] = [
                        'product_id' => $itemInput['product_id'],
                        'quantity' => $itemInput['quantity']
                    ];
                }
            }

            $discountService = resolve(\App\Services\DiscountService::class);
            $calc = $discountService->calculate($user->store_id, $itemsForCalc, $request->member_id);

            $calculatedSubtotal = $calc['subtotal'];
            $calculatedDiscountAmount = $calc['item_discounts_total'] + $calc['transaction_discount_amount'];
            $calculatedGrandTotal = $calc['grand_total'];
            $transactionDiscountId = $calc['transaction_discount_id'];

            // Validate total payment amount matches or exceeds calculated grand_total
            $totalPaid = collect($request->payments)->sum('amount');
            if ($totalPaid < $calculatedGrandTotal) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nominal pembayaran tidak mencukupi. (Total tagihan setelah diskon: ' . $calculatedGrandTotal . ')'
                ], 422);
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menghitung kalkulasi diskon: ' . $e->getMessage()
            ], 422);
        }

        try {
            $transaction = DB::transaction(function () use ($request, $user, $activeShift, $calc, $calculatedSubtotal, $calculatedDiscountAmount, $calculatedGrandTotal, $transactionDiscountId) {
                // Determine items to sell based on calculations
                $itemsToSell = [];
                $products = Product::whereIn('id', array_column($calc['items'], 'product_id'))->get()->keyBy('id');

                foreach ($calc['items'] as $itemCalc) {
                    $prod = $products[$itemCalc['product_id']];
                    $itemsToSell[] = [
                        'product_id' => $itemCalc['product_id'],
                        'product_name' => $itemCalc['product_name'],
                        'quantity' => $itemCalc['quantity'],
                        'unit_price' => $itemCalc['unit_price'],
                        'discount_id' => $itemCalc['discount_id'],
                        'discount_amount' => $itemCalc['discount_amount'],
                        'subtotal' => $itemCalc['subtotal'],
                        'product_model' => $prod
                    ];
                }

                // Verify stock availability for all items before cutting stock
                foreach ($itemsToSell as $item) {
                    $prod = $item['product_model'];
                    
                    // Sum active kiosk reservations for this product, EXCLUDING the draft being checked out
                    $reservedStockQuery = DB::table('order_draft_items')
                        ->join('order_drafts', 'order_draft_items.order_draft_id', '=', 'order_drafts.id')
                        ->where('order_draft_items.product_id', $prod->id)
                        ->where('order_drafts.source', 'kiosk')
                        ->where('order_drafts.status', 'pending')
                        ->where('order_drafts.expires_at', '>', now());
                    
                    if ($request->order_draft_id) {
                        $reservedStockQuery->where('order_draft_items.order_draft_id', '!=', $request->order_draft_id);
                    }
                    
                    $reservedStock = $reservedStockQuery->sum('order_draft_items.quantity');
                    $availableStock = $prod->stock_quantity - $reservedStock;

                    if ($availableStock < $item['quantity']) {
                        throw new \Exception("Stok produk '{$prod->name}' tidak mencukupi. Sisa stok tersedia: {$availableStock}.");
                    }
                }

                // Generate Invoice Number: TRX-YYYYMMDD-XXXX (resets daily)
                $datePrefix = 'TRX-' . now()->format('Ymd') . '-';
                $latestTrx = Transaction::where('invoice_number', 'like', $datePrefix . '%')
                    ->lockForUpdate()
                    ->orderBy('invoice_number', 'desc')
                    ->first();

                $nextNumber = 1;
                if ($latestTrx) {
                    $parts = explode('-', $latestTrx->invoice_number);
                    $lastNum = (int) end($parts);
                    $nextNumber = $lastNum + 1;
                }
                $invoiceNumber = $datePrefix . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);

                // Create Transaction
                $transaction = Transaction::create([
                    'store_id' => $user->store_id,
                    'cashier_id' => $user->id,
                    'shift_id' => $activeShift->id,
                    'order_draft_id' => $request->order_draft_id,
                    'member_id' => $request->member_id,
                    'discount_id' => $transactionDiscountId,
                    'invoice_number' => $invoiceNumber,
                    'subtotal' => $calculatedSubtotal,
                    'discount_amount' => $calculatedDiscountAmount,
                    'tax_amount' => $calc['tax_amount'],
                    'grand_total' => $calculatedGrandTotal,
                    'status' => 'completed',
                ]);

                // Update member points and total spending
                if ($request->member_id) {
                    $member = \App\Models\Member::lockForUpdate()->find($request->member_id);
                    if ($member) {
                        $member->points += $calc['earned_points'];
                        $member->total_spending += $calculatedGrandTotal;

                        // Auto-upgrade tier
                        if ($member->total_spending >= 5000000) {
                            $member->tier = 'gold';
                        } elseif ($member->total_spending >= 1000000) {
                            $member->tier = 'silver';
                        } else {
                            $member->tier = 'bronze';
                        }

                        $member->save();
                    }
                }

                // Create transaction items, cut stock and record stock movements
                foreach ($itemsToSell as $item) {
                    $prod = $item['product_model'];
                    $qtyBefore = $prod->stock_quantity;
                    $qtyAfter = $qtyBefore - $item['quantity'];

                    // Cut stock
                    $prod->stock_quantity = $qtyAfter;
                    $prod->save();

                    // Create transaction item record
                    $trxItem = TransactionItem::create([
                        'transaction_id' => $transaction->id,
                        'product_id' => $item['product_id'],
                        'discount_id' => $item['discount_id'],
                        'product_name' => $item['product_name'],
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'],
                        'discount_amount' => $item['discount_amount'],
                        'subtotal' => $item['subtotal'],
                    ]);

                    // Write stock movement log
                    StockMovement::create([
                        'store_id' => $user->store_id,
                        'product_id' => $prod->id,
                        'user_id' => $user->id,
                        'type' => 'sale',
                        'quantity_before' => $qtyBefore,
                        'quantity_change' => -$item['quantity'],
                        'quantity_after' => $qtyAfter,
                        'reference_id' => $trxItem->id,
                        'reference_type' => TransactionItem::class,
                    ]);
                }

                // Save Payments details
                foreach ($request->payments as $payInput) {
                    Payment::create([
                        'transaction_id' => $transaction->id,
                        'method' => $payInput['method'],
                        'amount' => $payInput['amount'],
                        'change_amount' => $payInput['change_amount'] ?? 0.00,
                        'reference_number' => $payInput['reference_number'] ?? null,
                        'is_standalone_fallback' => $payInput['is_standalone_fallback'] ?? false,
                    ]);
                }

                // Update Order Draft status to completed if applicable
                if ($request->order_draft_id) {
                    $draft = OrderDraft::findOrFail($request->order_draft_id);
                    $draft->status = 'completed';
                    $draft->save();
                }

                return $transaction;
            });

            return response()->json([
                'success' => true,
                'message' => 'Transaksi berhasil disimpan.',
                'data' => [
                    'id' => $transaction->id,
                    'invoice_number' => $transaction->invoice_number,
                    'grand_total' => $transaction->grand_total,
                    'status' => $transaction->status,
                    'created_at' => $transaction->created_at->toIso8601String()
                ]
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Void a completed transaction (requires Supervisor/Manager PIN and reason).
     */
    public function void(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'pin' => 'required|string|size:6',
            'reason' => 'required|string|min:4|max:255',
        ], [
            'pin.required' => 'PIN supervisor wajib diisi.',
            'pin.size' => 'PIN supervisor harus 6 digit.',
            'reason.required' => 'Alasan pembatalan (void) wajib diisi.',
            'reason.min' => 'Alasan void minimal 4 karakter.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi void gagal.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = $request->user();

            $transaction = Transaction::with(['items.product', 'payments'])
                ->where('store_id', $user->store_id)
                ->findOrFail($id);

            if ($transaction->status === 'voided') {
                return response()->json([
                    'success' => false,
                    'message' => 'Transaksi ini sudah dibatalkan sebelumnya.'
                ], 422);
            }

            // Verify supervisor/manager PIN
            $authorizedUsers = User::whereIn('role', ['super_admin', 'manager', 'supervisor'])
                ->where('is_active', true)
                ->whereNotNull('pin')
                ->get();

            $pinMatched = false;
            $authorizer = null;
            foreach ($authorizedUsers as $authUser) {
                if (Hash::check($request->pin, $authUser->pin)) {
                    $pinMatched = true;
                    $authorizer = $authUser;
                    break;
                }
            }

            if (!$pinMatched) {
                return response()->json([
                    'success' => false,
                    'message' => 'PIN otorisasi supervisor tidak valid.'
                ], 403);
            }

            // Perform void inside transaction
            DB::transaction(function () use ($transaction, $user, $authorizer, $request) {
                $transaction->status = 'voided';
                $transaction->save();

                // Restore stock and write stock_movements
                foreach ($transaction->items as $item) {
                    $prod = $item->product;
                    
                    if ($prod) {
                        $qtyBefore = $prod->stock_quantity;
                        $qtyAfter = $qtyBefore + $item->quantity;

                        // Restore stock
                        $prod->stock_quantity = $qtyAfter;
                        $prod->save();

                        // Write stock movement log
                        StockMovement::create([
                            'store_id' => $transaction->store_id,
                            'product_id' => $prod->id,
                            'user_id' => $user->id,
                            'type' => 'adjustment', // Adjustment type for voided stock returns
                            'quantity_before' => $qtyBefore,
                            'quantity_change' => $item->quantity,
                            'quantity_after' => $qtyAfter,
                            'reference_id' => $item->id,
                            'reference_type' => TransactionItem::class,
                        ]);
                    }
                }

                // Log void action in immutable audit logs
                $this->auditTrailService->log(
                    $user,
                    'void_unlock',
                    $transaction,
                    $authorizer,
                    [
                        'invoice_number' => $transaction->invoice_number,
                        'reason' => $request->reason,
                        'grand_total' => $transaction->grand_total,
                        'voided_at' => now()->toIso8601String()
                    ],
                    -$transaction->grand_total
                );
            });

            return response()->json([
                'success' => true,
                'message' => 'Transaksi berhasil di-void. Stok barang telah dikembalikan.',
                'data' => [
                    'id' => $transaction->id,
                    'status' => 'voided',
                    'voided_at' => now()->toIso8601String()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
