<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

use App\Traits\BelongsToTenant;

class AuditLog extends Model
{
    use HasFactory, BelongsToTenant;

    // The audit logs table is read-only. We disable timestamps as we only have created_at.
    public $timestamps = false;

    protected $fillable = [
        'store_id',
        'executor_id',
        'authorizer_id',
        'action',
        'target_type',
        'target_id',
        'details',
        'financial_impact',
        'ip_address',
    ];

    protected $casts = [
        'details' => 'array',
    ];

    /**
     * Get the store that owns the audit log.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Get the user who executed the action.
     */
    public function executor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'executor_id');
    }

    /**
     * Get the user who authorized the action (e.g. Supervisor pin).
     */
    public function authorizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'authorizer_id');
    }

    /**
     * Get the parent target model.
     */
    public function target(): MorphTo
    {
        return $this->morphTo();
    }
}
