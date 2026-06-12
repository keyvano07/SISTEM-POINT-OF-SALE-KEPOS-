<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;

Route::prefix('v1')->group(function () {
    // Public routes
    Route::post('/auth/login', [AuthController::class, 'login']);

    // Protected routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::post('/auth/verify-pin', [AuthController::class, 'verifyPin']);

        Route::get('/user', function (Request $request) {
            return $request->user();
        });

        // Categories
        Route::get('/categories', [\App\Http\Controllers\Api\CategoryController::class, 'index']);
        Route::post('/categories', [\App\Http\Controllers\Api\CategoryController::class, 'store'])->middleware('role:manager,super_admin');

        // Products
        Route::get('/products', [\App\Http\Controllers\Api\ProductController::class, 'index']);
        Route::post('/products', [\App\Http\Controllers\Api\ProductController::class, 'store'])->middleware('role:manager,super_admin');
        Route::put('/products/{id}', [\App\Http\Controllers\Api\ProductController::class, 'update'])->middleware('role:manager,super_admin');

        // Stock adjustments
        Route::get('/stock-adjustments', [\App\Http\Controllers\Api\StockAdjustmentController::class, 'index']);
        Route::post('/stock-adjustments', [\App\Http\Controllers\Api\StockAdjustmentController::class, 'store']);
        Route::post('/stock-adjustments/restock', [\App\Http\Controllers\Api\StockAdjustmentController::class, 'restock']);
        Route::post('/stock-adjustments/{id}/approve', [\App\Http\Controllers\Api\StockAdjustmentController::class, 'approve']);
        Route::post('/stock-adjustments/{id}/reject', [\App\Http\Controllers\Api\StockAdjustmentController::class, 'reject']);

        // Order drafts
        Route::get('/order-drafts', [\App\Http\Controllers\Api\OrderDraftController::class, 'index']);
        Route::post('/order-drafts', [\App\Http\Controllers\Api\OrderDraftController::class, 'store']);
        Route::get('/order-drafts/{id}', [\App\Http\Controllers\Api\OrderDraftController::class, 'show']);
        Route::put('/order-drafts/{id}', [\App\Http\Controllers\Api\OrderDraftController::class, 'update']);
        Route::post('/order-drafts/{id}/lock', [\App\Http\Controllers\Api\OrderDraftController::class, 'lock']);
        Route::post('/order-drafts/{id}/unlock', [\App\Http\Controllers\Api\OrderDraftController::class, 'unlock']);

        // Shifts (Kasir)
        Route::get('/shifts', [\App\Http\Controllers\Api\ShiftController::class, 'index'])->middleware('role:supervisor,manager,super_admin');
        Route::get('/shifts/active', [\App\Http\Controllers\Api\ShiftController::class, 'active'])->middleware('role:kasir,supervisor,manager,super_admin');
        Route::get('/shifts/{id}', [\App\Http\Controllers\Api\ShiftController::class, 'show'])->middleware('role:supervisor,manager,super_admin');
        Route::post('/shifts/open', [\App\Http\Controllers\Api\ShiftController::class, 'open'])->middleware('role:kasir,super_admin');
        Route::post('/shifts/close', [\App\Http\Controllers\Api\ShiftController::class, 'close'])->middleware('role:kasir,super_admin');
        Route::post('/shifts/{id}/audit', [\App\Http\Controllers\Api\ShiftController::class, 'audit'])->middleware('role:supervisor,manager,super_admin');

        // Transactions (Kasir/Supervisor)
        Route::get('/transactions', [\App\Http\Controllers\Api\TransactionController::class, 'index']);
        Route::post('/transactions', [\App\Http\Controllers\Api\TransactionController::class, 'store']);
        Route::post('/transactions/{id}/void', [\App\Http\Controllers\Api\TransactionController::class, 'void']);

        // Audit Logs (Manager/Supervisor)
        Route::get('/audit-logs', [\App\Http\Controllers\Api\AuditLogController::class, 'index'])->middleware('role:supervisor,manager,super_admin');

        // Members
        Route::get('/members', [\App\Http\Controllers\Api\MemberController::class, 'index']);
        Route::post('/members', [\App\Http\Controllers\Api\MemberController::class, 'store']);
        Route::get('/members/search', [\App\Http\Controllers\Api\MemberController::class, 'search']);

        // Discounts
        Route::get('/discounts', [\App\Http\Controllers\Api\DiscountController::class, 'index']);
        Route::get('/discounts/active', [\App\Http\Controllers\Api\DiscountController::class, 'active']);
        Route::post('/discounts/calculate', [\App\Http\Controllers\Api\DiscountController::class, 'previewCalculation']);
        Route::post('/discounts', [\App\Http\Controllers\Api\DiscountController::class, 'store'])->middleware('role:manager,super_admin');
        Route::delete('/discounts/{id}', [\App\Http\Controllers\Api\DiscountController::class, 'destroy'])->middleware('role:manager,super_admin');
    });
});
