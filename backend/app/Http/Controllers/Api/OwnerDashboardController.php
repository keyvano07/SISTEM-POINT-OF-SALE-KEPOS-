<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\Shift;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class OwnerDashboardController extends Controller
{
    public function stats(Request $request)
    {
        $storeId = $request->user()->store_id;

        // Date ranges
        $todayStart = Carbon::today();
        $todayEnd = Carbon::today()->endOfDay();

        // 1. General POS metrics (Today)
        $todayTransactionsQuery = Transaction::where('store_id', $storeId)
            ->where('status', 'completed')
            ->whereBetween('created_at', [$todayStart, $todayEnd]);

        $todayRevenue = (float) $todayTransactionsQuery->sum('grand_total');
        $todayTransactionsCount = $todayTransactionsQuery->count();

        // 2. Discrepancy overview
        $totalDiscrepancy = (float) Shift::where('store_id', $storeId)
            ->where('status', 'closed')
            ->sum('discrepancy');

        // 3. Void metrics (All-time or this month)
        $voidQuery = Transaction::where('store_id', $storeId)
            ->where('status', 'voided');

        $voidCount = $voidQuery->count();
        $voidAmount = (float) $voidQuery->sum('grand_total');

        // 4. Critical Stock Alert
        $criticalStockCount = Product::where('store_id', $storeId)
            ->where('is_active', true)
            ->whereColumn('stock_quantity', '<=', 'low_stock_threshold')
            ->count();

        // 5. Recent Shift Logs with discrepancy or pending
        $recentShifts = Shift::with('cashier')
            ->where('store_id', $storeId)
            ->orderBy('id', 'desc')
            ->limit(5)
            ->get();

        // 6. Recent Void/Authorization Audit Logs
        $recentVoids = AuditLog::with(['executor', 'authorizer'])
            ->where('store_id', $storeId)
            ->where('action', 'void_unlock')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        // 7. Weekly Revenue Trend
        $weeklyTrend = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);
            $start = $date->copy()->startOfDay();
            $end = $date->copy()->endOfDay();

            $revenue = (float) Transaction::where('store_id', $storeId)
                ->where('status', 'completed')
                ->whereBetween('created_at', [$start, $end])
                ->sum('grand_total');

            $weeklyTrend[] = [
                'date' => $date->format('Y-m-d'),
                'day_name' => $date->isoFormat('ddd'),
                'revenue' => $revenue
            ];
        }

        return response()->json([
            'success' => true,
            'message' => 'Owner dashboard stats successfully retrieved.',
            'data' => [
                'metrics' => [
                    'today_revenue' => $todayRevenue,
                    'today_transactions' => $todayTransactionsCount,
                    'total_discrepancy' => $totalDiscrepancy,
                    'void_count' => $voidCount,
                    'void_amount' => $voidAmount,
                    'critical_stock' => $criticalStockCount,
                ],
                'recent_shifts' => $recentShifts,
                'recent_void_logs' => $recentVoids,
                'weekly_sales_trend' => $weeklyTrend,
            ]
        ]);
    }
}
