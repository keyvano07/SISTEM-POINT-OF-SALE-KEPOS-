<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderDraftItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_draft_id',
        'product_id',
        'quantity',
        'unit_price',
        'subtotal',
        'customizations',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'customizations' => 'array',
    ];

    /**
     * Get the order draft that owns this item.
     */
    public function orderDraft(): BelongsTo
    {
        return $this->belongsTo(OrderDraft::class);
    }

    /**
     * Get the product associated with this item.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
