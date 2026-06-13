<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

use App\Traits\BelongsToTenant;

class Shift extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'store_id',
        'cashier_id',
        'shift_code',
        'opening_cash',
        'physical_cash_input',
        'expected_cash',
        'discrepancy',
        'status',
        'audit_status',
        'audited_by',
        'audit_notes',
        'opened_at',
        'closed_at',
        'audited_at',
    ];

    protected $casts = [
        'opening_cash' => 'decimal:2',
        'physical_cash_input' => 'decimal:2',
        'expected_cash' => 'decimal:2',
        'discrepancy' => 'decimal:2',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
        'audited_at' => 'datetime',
    ];

    /**
     * Get the store that owns the shift.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Get the cashier who runs this shift.
     */
    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    /**
     * Get the supervisor/manager who audited this shift.
     */
    public function auditor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'audited_by');
    }
}
