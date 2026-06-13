<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

use App\Traits\BelongsToTenant;

class Transaction extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'store_id',
        'cashier_id',
        'shift_id',
        'order_draft_id',
        'member_id',
        'discount_id',
        'invoice_number',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'grand_total',
        'status',
    ];

    /**
     * Get the store that owns the transaction.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Get the cashier who processed the transaction.
     */
    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    /**
     * Get the shift in which the transaction took place.
     */
    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    /**
     * Get the draft associated with this transaction.
     */
    public function orderDraft(): BelongsTo
    {
        return $this->belongsTo(OrderDraft::class);
    }

    /**
     * Get the items of this transaction.
     */
    public function items(): HasMany
    {
        return $this->hasMany(TransactionItem::class);
    }

    /**
     * Get the payments for this transaction.
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
