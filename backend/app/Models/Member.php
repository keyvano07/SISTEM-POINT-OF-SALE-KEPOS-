<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Member extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'member_code',
        'name',
        'phone',
        'email',
        'points',
        'total_spending',
        'tier',
    ];

    protected $casts = [
        'points' => 'integer',
        'total_spending' => 'decimal:2',
    ];

    /**
     * Get the store that owns the member.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Get the transactions for the member.
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }
}
