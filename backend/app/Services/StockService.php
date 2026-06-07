<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StockAdjustment;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class StockService
{
    /**
     * Adjust product stock.
     */
    public function adjustStock(User $user, Product $product, int $quantityChange, string $reasonCode, ?string $notes = null): StockAdjustment
    {
        return DB::transaction(function () use ($user, $product, $quantityChange, $reasonCode, $notes) {
            $financialValue = abs($quantityChange) * $product->buy_price;
            
            // Auto-approve if financial value is <= 100,000 IDR
            $isAutoApproved = $financialValue <= 100000;
            $status = $isAutoApproved ? 'approved' : 'pending_approval';

            $adjustment = StockAdjustment::create([
                'store_id' => $user->store_id,
                'product_id' => $product->id,
                'requested_by' => $user->id,
                'approved_by' => $isAutoApproved ? $user->id : null,
                'quantity_change' => $quantityChange,
                'financial_value' => $financialValue,
                'reason_code' => $reasonCode,
                'status' => $status,
                'notes' => $notes,
                'approved_at' => $isAutoApproved ? now() : null,
            ]);

            if ($isAutoApproved) {
                $quantityBefore = $product->stock_quantity;
                $quantityAfter = $quantityBefore + $quantityChange;

                // Update product stock
                $product->stock_quantity = $quantityAfter;
                $product->save();

                // Create immutable stock movement log
                StockMovement::create([
                    'store_id' => $user->store_id,
                    'product_id' => $product->id,
                    'user_id' => $user->id,
                    'type' => 'adjustment',
                    'quantity_before' => $quantityBefore,
                    'quantity_change' => $quantityChange,
                    'quantity_after' => $quantityAfter,
                    'reference_id' => $adjustment->id,
                    'reference_type' => StockAdjustment::class,
                ]);
            }

            return $adjustment;
        });
    }

    /**
     * Restock a product (Input Barang Masuk).
     */
    public function restock(User $user, Product $product, int $quantity, ?string $notes = null): StockMovement
    {
        return DB::transaction(function () use ($user, $product, $quantity, $notes) {
            $quantityBefore = $product->stock_quantity;
            $quantityAfter = $quantityBefore + $quantity;

            // Update product stock
            $product->stock_quantity = $quantityAfter;
            $product->save();

            // Create movement log
            return StockMovement::create([
                'store_id' => $user->store_id,
                'product_id' => $product->id,
                'user_id' => $user->id,
                'type' => 'restock',
                'quantity_before' => $quantityBefore,
                'quantity_change' => $quantity,
                'quantity_after' => $quantityAfter,
                'reference_id' => null,
                'reference_type' => null,
            ]);
        });
    }
}
