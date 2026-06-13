<?php

namespace App\Models\Scopes;

use App\Services\TenantManager;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class TenantScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     */
    public function apply(Builder $builder, Model $model): void
    {
        // Bypass scoping for super_admin role
        if (Auth::check() && Auth::user()->role === 'super_admin') {
            return;
        }

        $tenantId = TenantManager::getTenantId();
        if ($tenantId !== null) {
            $builder->where($model->getTable() . '.store_id', $tenantId);
        }
    }
}
