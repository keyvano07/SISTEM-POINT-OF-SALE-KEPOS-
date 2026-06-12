<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OrderDraft;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class OrderDraftController extends Controller
{
    /**
     * Display a listing of active, pending, unexpired order drafts.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // Get drafts that are pending and not yet expired
        $drafts = OrderDraft::with(['creator', 'items.product'])
            ->where('store_id', $user->store_id)
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar antrean draft pesanan berhasil diambil.',
            'data' => $drafts
        ]);
    }

    /**
     * Store a newly created order draft.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'order_type' => 'required|in:dine_in,take_away',
            'table_number' => 'required_if:order_type,dine_in|nullable|string|max:50',
            'source' => 'nullable|in:pramuniaga,kiosk',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'nullable|numeric|min:0',
            'items.*.customizations' => 'nullable|array',
        ], [
            'order_type.required' => 'Tipe pesanan harus ditentukan.',
            'order_type.in' => 'Tipe pesanan harus berupa dine_in atau take_away.',
            'table_number.required_if' => 'Nomor meja harus diisi untuk makan di tempat (dine-in).',
            'items.required' => 'Keranjang pesanan tidak boleh kosong.',
            'items.min' => 'Keranjang pesanan minimal harus berisi 1 item.',
            'items.*.product_id.required' => 'ID produk harus ditentukan.',
            'items.*.product_id.exists' => 'Produk tidak ditemukan.',
            'items.*.quantity.required' => 'Jumlah produk harus ditentukan.',
            'items.*.quantity.integer' => 'Jumlah produk harus berupa angka.',
            'items.*.quantity.min' => 'Jumlah produk minimal 1.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = $request->user();
            $source = $request->input('source', 'pramuniaga');
            
            // Kiosk drafts expire in 15 minutes, Pramuniaga drafts expire in 2 hours
            $expiresAt = $source === 'kiosk' ? now()->addMinutes(15) : now()->addHours(2);

            // Generate Queue ID: Q-DDMMYY-XXXX (resets daily)
            $datePrefix = 'Q-' . now()->format('dmy') . '-';
            
            $draft = DB::transaction(function () use ($request, $user, $expiresAt, $datePrefix, $source) {
                // Get maximum queue_id for today using lockForUpdate or similar
                $latestDraft = OrderDraft::where('queue_id', 'like', $datePrefix . '%')
                    ->lockForUpdate()
                    ->orderBy('queue_id', 'desc')
                    ->first();

                $nextNumber = 1;
                if ($latestDraft) {
                    $parts = explode('-', $latestDraft->queue_id);
                    $lastNum = (int) end($parts);
                    $nextNumber = $lastNum + 1;
                }
                
                $queueId = $datePrefix . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);

                // Pre-check stock reservation for each item
                foreach ($request->items as $item) {
                    $product = Product::findOrFail($item['product_id']);
                    
                    // Sum active kiosk reservations for this product
                    $reservedStock = DB::table('order_draft_items')
                        ->join('order_drafts', 'order_draft_items.order_draft_id', '=', 'order_drafts.id')
                        ->where('order_draft_items.product_id', $product->id)
                        ->where('order_drafts.source', 'kiosk')
                        ->where('order_drafts.status', 'pending')
                        ->where('order_drafts.expires_at', '>', now())
                        ->sum('order_draft_items.quantity');

                    $availableStock = $product->stock_quantity - $reservedStock;

                    if ($availableStock < $item['quantity']) {
                        throw new \Exception("Stok produk '{$product->name}' tidak mencukupi untuk dicadangkan. Sisa stok tersedia: {$availableStock}.");
                    }
                }

                // Create Order Draft
                $draft = OrderDraft::create([
                    'store_id' => $user ? $user->store_id : null,
                    'created_by' => $user ? $user->id : 1, // Default user admin id is 1 if guest/kiosk device is not logged in
                    'queue_id' => $queueId,
                    'order_type' => $request->order_type,
                    'table_number' => $request->order_type === 'dine_in' ? $request->table_number : null,
                    'status' => 'pending',
                    'source' => $source,
                    'expires_at' => $expiresAt,
                ]);

                // Create Order Draft Items
                foreach ($request->items as $item) {
                    $product = Product::findOrFail($item['product_id']);
                    // Accept customized unit price if passed, otherwise default to product sell price
                    $unitPrice = isset($item['unit_price']) ? $item['unit_price'] : $product->sell_price;
                    $quantity = $item['quantity'];
                    $subtotal = $unitPrice * $quantity;
                    $customizations = isset($item['customizations']) ? $item['customizations'] : null;

                    $draft->items()->create([
                        'product_id' => $product->id,
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'subtotal' => $subtotal,
                        'customizations' => $customizations,
                    ]);
                }

                return $draft;
            });

            // Load relations for response
            $draft->load(['creator', 'items.product']);

            return response()->json([
                'success' => true,
                'message' => 'Daftar pesanan (draft) berhasil dibuat.',
                'data' => $draft
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menyimpan pesanan.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified order draft detail.
     */
    public function show(Request $request, $id)
    {
        try {
            $query = OrderDraft::with(['creator', 'items.product'])
                ->where('store_id', $request->user()->store_id);

            if (is_numeric($id)) {
                $draft = $query->where('id', $id)->firstOrFail();
            } else {
                $draft = $query->where('queue_id', $id)->firstOrFail();
            }

            // Lazy update for expiration
            if ($draft->status === 'pending' && $draft->expires_at->isPast()) {
                $draft->status = 'expired';
                $draft->save();
            }

            return response()->json([
                'success' => true,
                'message' => 'Detail draf pesanan berhasil diambil.',
                'data' => $draft
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Draf pesanan tidak ditemukan.'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Lock an order draft (Kasir claims it for checkout).
     */
    public function lock(Request $request, $id)
    {
        try {
            $user = $request->user();

            $draft = OrderDraft::where('store_id', $user->store_id)
                ->findOrFail($id);

            // Validate: must be pending and not expired
            if ($draft->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Draf pesanan tidak dalam status pending. Status saat ini: ' . $draft->status . '.'
                ], 422);
            }

            if ($draft->expires_at->isPast()) {
                $draft->status = 'expired';
                $draft->save();
                return response()->json([
                    'success' => false,
                    'message' => 'Draf pesanan sudah kedaluwarsa.'
                ], 422);
            }

            $draft->status = 'locked';
            $draft->locked_by = $user->id;
            $draft->save();

            return response()->json([
                'success' => true,
                'message' => 'Order draft berhasil dikunci.',
                'data' => [
                    'id' => $draft->id,
                    'status' => $draft->status,
                    'locked_by' => $draft->locked_by,
                ]
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Draf pesanan tidak ditemukan.'
            ], 404);
        }
    }

    /**
     * Unlock an order draft (requires Supervisor/Manager PIN).
     */
    public function unlock(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'pin' => 'required|string|size:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'PIN otorisasi harus berupa 6 digit.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = $request->user();

            $draft = OrderDraft::where('store_id', $user->store_id)
                ->findOrFail($id);

            if ($draft->status !== 'locked') {
                return response()->json([
                    'success' => false,
                    'message' => 'Draf pesanan tidak dalam status terkunci (locked).'
                ], 422);
            }

            // Verify supervisor/manager PIN
            $authorizedUsers = User::whereIn('role', ['super_admin', 'manager', 'supervisor'])
                ->where('is_active', true)
                ->whereNotNull('pin')
                ->get();

            $pinMatched = false;
            foreach ($authorizedUsers as $authUser) {
                if (Hash::check($request->pin, $authUser->pin)) {
                    $pinMatched = true;
                    break;
                }
            }

            if (!$pinMatched) {
                return response()->json([
                    'success' => false,
                    'message' => 'PIN otorisasi tidak valid.'
                ], 403);
            }

            $draft->status = 'pending';
            $draft->locked_by = null;
            $draft->save();

            return response()->json([
                'success' => true,
                'message' => 'Kunci draft berhasil dibuka.',
                'data' => [
                    'id' => $draft->id,
                    'status' => $draft->status,
                ]
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Draf pesanan tidak ditemukan.'
            ], 404);
        }
    }

    /**
     * Update order draft items (edit cart after unlock).
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
        ], [
            'items.required' => 'Keranjang pesanan tidak boleh kosong.',
            'items.min' => 'Keranjang pesanan minimal harus berisi 1 item.',
            'items.*.product_id.required' => 'ID produk harus ditentukan.',
            'items.*.product_id.exists' => 'Produk tidak ditemukan.',
            'items.*.quantity.required' => 'Jumlah produk harus ditentukan.',
            'items.*.quantity.integer' => 'Jumlah produk harus berupa angka.',
            'items.*.quantity.min' => 'Jumlah produk minimal 1.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = $request->user();

            $draft = OrderDraft::where('store_id', $user->store_id)
                ->findOrFail($id);

            // Only pending drafts can be edited
            if ($draft->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Draf pesanan hanya bisa diedit saat status pending. Status saat ini: ' . $draft->status . '.'
                ], 422);
            }

            if ($draft->expires_at->isPast()) {
                $draft->status = 'expired';
                $draft->save();
                return response()->json([
                    'success' => false,
                    'message' => 'Draf pesanan sudah kedaluwarsa.'
                ], 422);
            }

            DB::transaction(function () use ($draft, $request) {
                // Delete old items
                $draft->items()->delete();

                // Create new items with server-side prices
                foreach ($request->items as $item) {
                    $product = Product::findOrFail($item['product_id']);
                    $unitPrice = $product->sell_price;
                    $quantity = $item['quantity'];
                    $subtotal = $unitPrice * $quantity;

                    $draft->items()->create([
                        'product_id' => $product->id,
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'subtotal' => $subtotal,
                    ]);
                }
            });

            $draft->load(['creator', 'items.product']);

            return response()->json([
                'success' => true,
                'message' => 'Order draft berhasil diperbarui.',
                'data' => $draft
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Draf pesanan tidak ditemukan.'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat memperbarui pesanan.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
