<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\TransactionItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Get dashboard stats and charts data.
     */
    public function stats(Request $request)
    {
        $storeId = $request->user()->store_id;

        // 1. Today's date range
        $todayStart = Carbon::today();
        $todayEnd = Carbon::today()->endOfDay();

        // 2. Yesterday's date range
        $yesterdayStart = Carbon::yesterday();
        $yesterdayEnd = Carbon::yesterday()->endOfDay();

        // ---- METRICS ----
        
        // Today's completed transactions query
        $todayTransactionsQuery = Transaction::where('store_id', $storeId)
            ->where('status', 'completed')
            ->whereBetween('created_at', [$todayStart, $todayEnd]);

        $todayRevenue = (float) $todayTransactionsQuery->sum('grand_total');
        $todayTransactionsCount = $todayTransactionsQuery->count();
        $todayAverageCart = $todayTransactionsCount > 0 ? ($todayRevenue / $todayTransactionsCount) : 0;

        // Yesterday's revenue for percentage calculation
        $yesterdayRevenue = (float) Transaction::where('store_id', $storeId)
            ->where('status', 'completed')
            ->whereBetween('created_at', [$yesterdayStart, $yesterdayEnd])
            ->sum('grand_total');

        // Yesterday's transaction count
        $yesterdayTransactionsCount = Transaction::where('store_id', $storeId)
            ->where('status', 'completed')
            ->whereBetween('created_at', [$yesterdayStart, $yesterdayEnd])
            ->count();

        // Percentage calculations
        $revenueChangePct = 0;
        if ($yesterdayRevenue > 0) {
            $revenueChangePct = (($todayRevenue - $yesterdayRevenue) / $yesterdayRevenue) * 100;
        } elseif ($todayRevenue > 0) {
            $revenueChangePct = 100; // 100% increase if yesterday was 0
        }

        $transactionsChangePct = 0;
        if ($yesterdayTransactionsCount > 0) {
            $transactionsChangePct = (($todayTransactionsCount - $yesterdayTransactionsCount) / $yesterdayTransactionsCount) * 100;
        } elseif ($todayTransactionsCount > 0) {
            $transactionsChangePct = 100;
        }

        // Critical stock count
        $criticalStockCount = Product::where('store_id', $storeId)
            ->where('is_active', true)
            ->whereColumn('stock_quantity', '<=', 'low_stock_threshold')
            ->count();


        // ---- WEEKLY SALES TREND (LAST 7 DAYS) ----
        $weeklyTrend = [];
        $dayNamesMap = [
            'Monday' => 'Sen',
            'Tuesday' => 'Sel',
            'Wednesday' => 'Rab',
            'Thursday' => 'Kam',
            'Friday' => 'Jum',
            'Saturday' => 'Sab',
            'Sunday' => 'Min'
        ];

        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);
            $start = $date->copy()->startOfDay();
            $end = $date->copy()->endOfDay();

            $revenue = (float) Transaction::where('store_id', $storeId)
                ->where('status', 'completed')
                ->whereBetween('created_at', [$start, $end])
                ->sum('grand_total');

            $dayNameEnglish = $date->format('l');
            $dayNameIndo = $dayNamesMap[$dayNameEnglish] ?? substr($dayNameEnglish, 0, 3);

            $weeklyTrend[] = [
                'date' => $date->format('Y-m-d'),
                'day_name' => $dayNameIndo,
                'revenue' => $revenue
            ];
        }


        // ---- BEST SELLING PRODUCTS (LAST 30 DAYS) ----
        $bestSellersRaw = TransactionItem::select('product_id', 'product_name', DB::raw('SUM(quantity) as total_qty'))
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->where('transactions.store_id', $storeId)
            ->where('transactions.status', 'completed')
            ->where('transactions.created_at', '>=', Carbon::now()->subDays(30))
            ->groupBy('product_id', 'product_name')
            ->orderBy('total_qty', 'desc')
            ->limit(5)
            ->get();

        $maxQty = $bestSellersRaw->first()?->total_qty ?: 1;
        $bestSellers = [];

        foreach ($bestSellersRaw as $item) {
            // Fetch category name if product still exists
            $categoryName = 'Umum';
            $product = Product::with('category')->find($item->product_id);
            if ($product && $product->category) {
                $categoryName = $product->category->name;
            }

            $bestSellers[] = [
                'name' => $item->product_name,
                'category' => $categoryName,
                'quantity' => (int) $item->total_qty,
                'percentage' => (int) round(($item->total_qty / $maxQty) * 100)
            ];
        }


        // ---- PAYMENT METHODS DISTRIBUTION (LAST 30 DAYS) ----
        $paymentMethodsRaw = DB::table('payments')
            ->select('method', DB::raw('COUNT(*) as tx_count'), DB::raw('SUM(amount) as total_amount'))
            ->join('transactions', 'payments.transaction_id', '=', 'transactions.id')
            ->where('transactions.store_id', $storeId)
            ->where('transactions.status', 'completed')
            ->where('transactions.created_at', '>=', Carbon::now()->subDays(30))
            ->groupBy('method')
            ->get();

        $totalPaymentsAmount = $paymentMethodsRaw->sum('total_amount') ?: 1;
        $paymentMethods = [];
        $methodLabelsMap = [
            'cash' => 'Tunai',
            'qris' => 'QRIS',
            'card' => 'Kartu Debit/Kredit'
        ];

        foreach ($paymentMethodsRaw as $pm) {
            $paymentMethods[] = [
                'method' => $methodLabelsMap[$pm->method] ?? ucfirst($pm->method),
                'count' => (int) $pm->tx_count,
                'amount' => (float) $pm->total_amount,
                'percentage' => round(($pm->total_amount / $totalPaymentsAmount) * 100, 1)
            ];
        }


        // ---- CATEGORY SALES PERFORMANCE (LAST 30 DAYS) ----
        $categorySalesRaw = TransactionItem::select('categories.name as category_name', DB::raw('SUM(transaction_items.quantity) as qty_sold'), DB::raw('SUM(transaction_items.subtotal) as total_revenue'))
            ->join('products', 'transaction_items.product_id', '=', 'products.id')
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->where('transactions.store_id', $storeId)
            ->where('transactions.status', 'completed')
            ->where('transactions.created_at', '>=', Carbon::now()->subDays(30))
            ->groupBy('categories.id', 'categories.name')
            ->orderBy('total_revenue', 'desc')
            ->get();

        $categorySales = [];
        foreach ($categorySalesRaw as $cat) {
            $categorySales[] = [
                'name' => $cat->category_name,
                'quantity' => (int) $cat->qty_sold,
                'revenue' => (float) $cat->total_revenue
            ];
        }

        return response()->json([
            'success' => true,
            'message' => 'Statistik dashboard berhasil diambil.',
            'data' => [
                'metrics' => [
                    'today_revenue' => $todayRevenue,
                    'today_transactions' => $todayTransactionsCount,
                    'average_cart' => $todayAverageCart,
                    'critical_stock' => $criticalStockCount,
                    'revenue_change_pct' => round($revenueChangePct, 1),
                    'transactions_change_pct' => round($transactionsChangePct, 1),
                ],
                'weekly_sales_trend' => $weeklyTrend,
                'best_sellers' => $bestSellers,
                'payment_methods' => $paymentMethods,
                'category_sales' => $categorySales
            ]
        ]);
    }
}
