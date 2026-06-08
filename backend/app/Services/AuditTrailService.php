<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class AuditTrailService
{
    /**
     * Write an immutable audit log entry.
     */
    public function log(
        User $executor,
        string $action,
        ?Model $target = null,
        ?User $authorizer = null,
        ?array $details = null,
        float $financialImpact = 0.00,
        ?string $ipAddress = null
    ): AuditLog {
        return AuditLog::create([
            'store_id' => $executor->store_id,
            'executor_id' => $executor->id,
            'authorizer_id' => $authorizer ? $authorizer->id : null,
            'action' => $action,
            'target_type' => $target ? get_class($target) : null,
            'target_id' => $target ? $target->getKey() : null,
            'details' => $details,
            'financial_impact' => $financialImpact,
            'ip_address' => $ipAddress ?? request()->ip(),
        ]);
    }
}
