<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

use App\Traits\BelongsToTenant;

class StockAdjustment extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'store_id',
        'product_id',
        'requested_by',
        'approved_by',
        'quantity_change',
        'financial_value',
        'reason_code',
        'status',
        'notes',
        'approved_at',
    ];

    protected $casts = [
        'financial_value' => 'decimal:2',
        'approved_at' => 'datetime',
        'quantity_change' => 'integer',
    ];

    /**
     * Get the product associated with the adjustment.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get the user who requested the adjustment.
     */
    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    /**
     * Get the user who approved the adjustment.
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
