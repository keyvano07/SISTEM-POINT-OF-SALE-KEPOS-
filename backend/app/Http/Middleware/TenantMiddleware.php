<?php

namespace App\Http\Middleware;

use App\Models\Store;
use App\Services\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class TenantMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $storeId = null;

        // 1. Check if user is authenticated and has a store_id
        if (Auth::check() && Auth::user()->store_id !== null) {
            $storeId = Auth::user()->store_id;
        }

        // 2. Check X-Store-ID or X-Tenant-ID header
        if (!$storeId && $request->hasHeader('X-Store-ID')) {
            $storeId = (int) $request->header('X-Store-ID');
        } elseif (!$storeId && $request->hasHeader('X-Tenant-ID')) {
            $storeId = (int) $request->header('X-Tenant-ID');
        }

        // 3. Check query parameter or body parameter
        if (!$storeId && $request->has('store_id')) {
            $storeId = (int) $request->input('store_id');
        }

        // 4. Fallback to default store if none specified
        if (!$storeId) {
            $storeId = 1; // Default store
        }

        // Validate that the store exists and is active
        // Avoid infinite loop if querying Store itself (since Store doesn't use BelongsToTenant)
        $storeExists = Store::where('id', $storeId)->where('is_active', true)->exists();
        if (!$storeExists) {
            // Check if default store exists or create/fallback
            $firstStore = Store::first();
            if ($firstStore) {
                $storeId = $firstStore->id;
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ada Store/Tenant yang terdaftar di sistem.'
                ], 403);
            }
        }

        // Set the active tenant
        TenantManager::setTenantId($storeId);

        return $next($request);
    }
}
