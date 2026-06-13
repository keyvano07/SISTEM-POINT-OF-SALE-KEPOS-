<?php

namespace App\Traits;

use App\Models\Scopes\TenantScope;
use App\Services\TenantManager;

trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope);

        static::creating(function ($model) {
            if (empty($model->store_id) && TenantManager::getTenantId() !== null) {
                $model->store_id = TenantManager::getTenantId();
            }
        });
    }

    public function store()
    {
        return $this->belongsTo(\App\Models\Store::class, 'store_id');
    }
}
