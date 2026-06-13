<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

use App\Traits\BelongsToTenant;

class Product extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'store_id',
        'category_id',
        'sku',
        'barcode',
        'name',
        'description',
        'image_url',
        'buy_price',
        'sell_price',
        'stock_quantity',
        'low_stock_threshold',
        'is_active',
        'product_type',
        'is_saleable',
    ];

    protected $casts = [
        'buy_price' => 'decimal:2',
        'sell_price' => 'decimal:2',
        'stock_quantity' => 'integer',
        'low_stock_threshold' => 'integer',
        'is_active' => 'boolean',
        'is_saleable' => 'boolean',
    ];

    protected $appends = [
        'is_low_stock',
        'available_stock',
    ];

    /**
     * Get the store that owns the product.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Get the category that owns the product.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Determine if the product is running low on stock.
     */
    public function getIsLowStockAttribute(): bool
    {
        return $this->stock_quantity <= $this->low_stock_threshold;
    }

    /**
     * Calculate available stock by subtracting active kiosk reservations.
     */
    public function getAvailableStockAttribute(): int
    {
        $reservedStock = \Illuminate\Support\Facades\DB::table('order_draft_items')
            ->join('order_drafts', 'order_draft_items.order_draft_id', '=', 'order_drafts.id')
            ->where('order_draft_items.product_id', $this->id)
            ->where('order_drafts.source', 'kiosk')
            ->where('order_drafts.status', 'pending')
            ->where('order_drafts.expires_at', '>', now())
            ->sum('order_draft_items.quantity');

        return max(0, $this->stock_quantity - $reservedStock);
    }

    /**
     * Get the recipes for this finished good.
     */
    public function recipes(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ProductRecipe::class, 'product_id');
    }

    /**
     * Get the raw ingredients for this finished good.
     */
    public function ingredients(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_recipes', 'product_id', 'ingredient_id')
                    ->withPivot('quantity')
                    ->withTimestamps();
    }
}
