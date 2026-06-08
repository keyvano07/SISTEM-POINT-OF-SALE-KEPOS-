<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'transaction_id',
        'method',
        'amount',
        'change_amount',
        'reference_number',
        'is_standalone_fallback',
    ];

    protected $casts = [
        'is_standalone_fallback' => 'boolean',
    ];

    /**
     * Get the transaction that owns the payment.
     */
    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}
