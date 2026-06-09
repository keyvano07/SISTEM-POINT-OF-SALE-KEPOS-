<?php

namespace App\Services;

use App\Models\Discount;
use App\Models\Product;
use App\Models\Member;

class DiscountService
{
    /**
     * Calculate all applicable discounts for a cart.
     */
    public function calculate(int $storeId, array $items, ?int $memberId = null): array
    {
        $member = $memberId ? Member::find($memberId) : null;
        
        // Fetch all products in the cart to read prices and category relations
        $productIds = array_column($items, 'product_id');
        $products = Product::whereIn('id', $productIds)->get()->keyBy('id');

        // Fetch active discounts for this store
        $activeDiscounts = Discount::where('store_id', $storeId)
            ->active()
            ->get();

        $processedItems = [];
        $itemsSubtotal = 0.00;
        $totalItemsDiscount = 0.00;

        foreach ($items as $item) {
            $productId = $item['product_id'];
            $quantity = (int)$item['quantity'];
            
            // If product does not exist, skip or use given price
            if (!isset($products[$productId])) {
                continue;
            }

            $product = $products[$productId];
            $unitPrice = (float)$product->sell_price;
            $itemSubtotalBefore = $unitPrice * $quantity;

            // Find applicable discounts for this product or its category
            $bestDiscount = null;
            $maxItemDiscountAmount = 0.00;

            foreach ($activeDiscounts as $discount) {
                // Check eligibility
                if (!$this->isEligibleForDiscount($discount, $member)) {
                    continue;
                }

                $applies = false;
                if ($discount->scope === 'product' && (int)$discount->target_product_id === $productId) {
                    $applies = true;
                } elseif ($discount->scope === 'category' && (int)$discount->target_category_id === (int)$product->category_id) {
                    $applies = true;
                }

                if ($applies) {
                    $currentDiscountAmount = 0.00;
                    if ($discount->type === 'percentage') {
                        $currentDiscountAmount = $itemSubtotalBefore * ((float)$discount->value / 100);
                    } elseif ($discount->type === 'fixed_amount') {
                        // Fixed amount is per item or total? Usually fixed amount promo is per item (e.g. 5000 off per item)
                        $currentDiscountAmount = (float)$discount->value * $quantity;
                    }

                    // Clamp to max_discount_amount if specified
                    if ($discount->max_discount_amount !== null) {
                        $currentDiscountAmount = min($currentDiscountAmount, (float)$discount->max_discount_amount);
                    }

                    // Never discount more than the item price
                    $currentDiscountAmount = min($currentDiscountAmount, $itemSubtotalBefore);

                    if ($currentDiscountAmount > $maxItemDiscountAmount) {
                        $maxItemDiscountAmount = $currentDiscountAmount;
                        $bestDiscount = $discount;
                    }
                }
            }

            $itemSubtotalAfter = $itemSubtotalBefore - $maxItemDiscountAmount;
            $itemsSubtotal += $itemSubtotalAfter;
            $totalItemsDiscount += $maxItemDiscountAmount;

            $processedItems[] = [
                'product_id' => $productId,
                'product_name' => $product->name,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'discount_id' => $bestDiscount ? $bestDiscount->id : null,
                'discount_amount' => $maxItemDiscountAmount,
                'subtotal' => $itemSubtotalAfter,
            ];
        }

        // Now calculate transaction-level discounts
        $bestTxDiscount = null;
        $maxTxDiscountAmount = 0.00;

        foreach ($activeDiscounts as $discount) {
            if ($discount->scope !== 'transaction') {
                continue;
            }

            // Check eligibility
            if (!$this->isEligibleForDiscount($discount, $member)) {
                continue;
            }

            // Check minimum purchase amount
            if ($itemsSubtotal < (float)$discount->min_purchase_amount) {
                continue;
            }

            $currentTxDiscountAmount = 0.00;
            if ($discount->type === 'percentage') {
                $currentTxDiscountAmount = $itemsSubtotal * ((float)$discount->value / 100);
            } elseif ($discount->type === 'fixed_amount') {
                $currentTxDiscountAmount = (float)$discount->value;
            }

            // Clamp to max_discount_amount
            if ($discount->max_discount_amount !== null) {
                $currentTxDiscountAmount = min($currentTxDiscountAmount, (float)$discount->max_discount_amount);
            }

            // Never discount more than subtotal
            $currentTxDiscountAmount = min($currentTxDiscountAmount, $itemsSubtotal);

            if ($currentTxDiscountAmount > $maxTxDiscountAmount) {
                $maxTxDiscountAmount = $currentTxDiscountAmount;
                $bestTxDiscount = $discount;
            }
        }

        $discountedSubtotal = $itemsSubtotal - $maxTxDiscountAmount;
        $taxAmount = round($discountedSubtotal * 0.11, 2);
        $grandTotal = $discountedSubtotal + $taxAmount;

        return [
            'items' => $processedItems,
            'subtotal' => $itemsSubtotal + $totalItemsDiscount, // Original subtotal before any discounts
            'item_discounts_total' => $totalItemsDiscount,
            'transaction_discount_id' => $bestTxDiscount ? $bestTxDiscount->id : null,
            'transaction_discount_amount' => $maxTxDiscountAmount,
            'tax_amount' => $taxAmount,
            'grand_total' => $grandTotal,
            'earned_points' => (int)floor($grandTotal / 10000), // kelipatan Rp 10.000 = 1 poin
        ];
    }

    /**
     * Check if a member is eligible for a specific discount.
     */
    private function isEligibleForDiscount(Discount $discount, ?Member $member): bool
    {
        if ($discount->target === 'all') {
            return true;
        }

        // If target is member_only, member must not be null
        if ($discount->target === 'member_only') {
            return $member !== null;
        }

        // If target is tier_specific, member must not be null and their tier must match target_tier
        if ($discount->target === 'tier_specific') {
            return $member !== null && $member->tier === $discount->target_tier;
        }

        return false;
    }
}
