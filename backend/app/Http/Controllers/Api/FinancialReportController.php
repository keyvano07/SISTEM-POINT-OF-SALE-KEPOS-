<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\StockMovement;
use App\Models\Product;
use App\Models\Shift;
use App\Models\TransactionItem;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class FinancialReportController extends Controller
{
    public function download(Request $request)
    {
        $user = $request->user();
        $storeId = $user->store_id;
        $reportType = $request->input('type', 'financial');

        // Get date range (default to current month)
        $startDateStr = $request->input('start_date', Carbon::now()->startOfMonth()->toDateString());
        $endDateStr = $request->input('end_date', Carbon::now()->endOfMonth()->toDateString());

        $startDate = Carbon::parse($startDateStr)->startOfDay();
        $endDate = Carbon::parse($endDateStr)->endOfDay();

        // Get store details
        $storeName = $user->store ? $user->store->name : 'KEPOS Point of Sale';
        $generatedAt = Carbon::now()->toDateTimeString();

        switch ($reportType) {
            case 'sales_by_product':
                $items = TransactionItem::with(['product.category'])
                    ->select('product_id', 'product_name')
                    ->selectRaw('SUM(quantity) as total_qty')
                    ->selectRaw('SUM(discount_amount) as total_discount')
                    ->selectRaw('SUM(subtotal) as total_revenue')
                    ->whereHas('transaction', function($q) use ($storeId, $startDate, $endDate) {
                        $q->where('store_id', $storeId)
                          ->where('status', 'completed')
                          ->whereBetween('created_at', [$startDate, $endDate]);
                    })
                    ->groupBy('product_id', 'product_name')
                    ->orderBy('total_qty', 'desc')
                    ->get();

                $pdf = Pdf::loadView('pdf.sales_by_product', [
                    'store_name' => $storeName,
                    'start_date' => $startDateStr,
                    'end_date' => $endDateStr,
                    'generated_at' => $generatedAt,
                    'items' => $items
                ]);
                return $pdf->download("Laporan_Penjualan_Produk_{$startDateStr}_to_{$endDateStr}.pdf");

            case 'stock_status':
                // For stock status, we show the current status of all inventory products in the store
                $products = Product::with('category')
                    ->where('store_id', $storeId)
                    ->orderBy('name')
                    ->get();

                $pdf = Pdf::loadView('pdf.stock_status', [
                    'store_name' => $storeName,
                    'generated_at' => $generatedAt,
                    'products' => $products
                ]);
                return $pdf->download("Laporan_Status_Stok_{$generatedAt}.pdf");

            case 'shift_reconciliation':
                $shifts = Shift::with('cashier')
                    ->where('store_id', $storeId)
                    ->whereBetween('created_at', [$startDate, $endDate])
                    ->orderBy('created_at', 'desc')
                    ->get();

                $pdf = Pdf::loadView('pdf.shift_reconciliation', [
                    'store_name' => $storeName,
                    'start_date' => $startDateStr,
                    'end_date' => $endDateStr,
                    'generated_at' => $generatedAt,
                    'shifts' => $shifts
                ]);
                return $pdf->download("Laporan_Rekonsiliasi_Shift_{$startDateStr}_to_{$endDateStr}.pdf");

            case 'financial':
            default:
                // 1. Fetch completed transactions
                $transactions = Transaction::with(['items.product'])
                    ->where('store_id', $storeId)
                    ->where('status', 'completed')
                    ->whereBetween('created_at', [$startDate, $endDate])
                    ->get();

                // Calculate sales metrics
                $totalSales = 0;
                $totalDiscount = 0;
                $totalTax = 0;
                $totalCogs = 0;
                $totalItemsSold = 0;

                foreach ($transactions as $trx) {
                    $totalSales += $trx->grand_total;
                    $totalDiscount += $trx->discount_amount;
                    $totalTax += $trx->tax_amount;

                    foreach ($trx->items as $item) {
                        $totalItemsSold += $item->quantity;
                        $buyPrice = $item->product ? $item->product->buy_price : 0;
                        $totalCogs += $buyPrice * $item->quantity;
                    }
                }

                $grossProfit = $totalSales - $totalCogs;

                // 2. Fetch purchases (restock movements)
                $purchases = StockMovement::with('product')
                    ->where('store_id', $storeId)
                    ->where('type', 'restock')
                    ->whereBetween('created_at', [$startDate, $endDate])
                    ->get();

                $totalPurchasesVal = 0;
                $totalItemsPurchased = 0;

                foreach ($purchases as $move) {
                    $qty = abs($move->quantity_change);
                    $totalItemsPurchased += $qty;
                    $buyPrice = $move->product ? $move->product->buy_price : 0;
                    $totalPurchasesVal += $buyPrice * $qty;
                }

                $data = [
                    'store_name' => $storeName,
                    'start_date' => $startDateStr,
                    'end_date' => $endDateStr,
                    'total_sales' => $totalSales,
                    'total_discount' => $totalDiscount,
                    'total_tax' => $totalTax,
                    'total_cogs' => $totalCogs,
                    'gross_profit' => $grossProfit,
                    'total_items_sold' => $totalItemsSold,
                    'transactions_count' => $transactions->count(),
                    'total_purchases_val' => $totalPurchasesVal,
                    'total_items_purchased' => $totalItemsPurchased,
                    'purchases_count' => $purchases->count(),
                    'generated_at' => $generatedAt,
                ];

                $pdf = Pdf::loadView('pdf.financial_report', $data);
                return $pdf->download("Laporan_Keuangan_{$startDateStr}_to_{$endDateStr}.pdf");
        }
    }

    public function summary(Request $request)
    {
        $user = $request->user();
        $storeId = $user->store_id;

        // Get date range (default to current month)
        $startDateStr = $request->input('start_date', Carbon::now()->startOfMonth()->toDateString());
        $endDateStr = $request->input('end_date', Carbon::now()->endOfMonth()->toDateString());

        $startDate = Carbon::parse($startDateStr)->startOfDay();
        $endDate = Carbon::parse($endDateStr)->endOfDay();

        // 1. Fetch completed transactions
        $transactions = Transaction::with(['items.product'])
            ->where('store_id', $storeId)
            ->where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();

        // Calculate sales metrics
        $totalSales = 0;
        $totalDiscount = 0;
        $totalTax = 0;
        $totalCogs = 0;
        $totalItemsSold = 0;

        foreach ($transactions as $trx) {
            $totalSales += $trx->grand_total;
            $totalDiscount += $trx->discount_amount;
            $totalTax += $trx->tax_amount;

            foreach ($trx->items as $item) {
                $totalItemsSold += $item->quantity;
                $buyPrice = $item->product ? $item->product->buy_price : 0;
                $totalCogs += $buyPrice * $item->quantity;
            }
        }

        $grossProfit = $totalSales - $totalCogs;
        $profitMarginPercent = $totalSales > 0 ? ($grossProfit / $totalSales) * 100 : 0;

        // 2. Fetch purchases (restock movements)
        $purchases = StockMovement::with('product')
            ->where('store_id', $storeId)
            ->where('type', 'restock')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();

        $totalPurchasesVal = 0;
        $totalItemsPurchased = 0;

        foreach ($purchases as $move) {
            $qty = abs($move->quantity_change);
            $totalItemsPurchased += $qty;
            $buyPrice = $move->product ? $move->product->buy_price : 0;
            $totalPurchasesVal += $buyPrice * $qty;
        }

        // 3. Weekly/Daily Breakdown for Chart
        $dailyTrend = [];
        $diffInDays = $startDate->diffInDays($endDate);
        
        // Limit daily points to 30 to make chart rendering extremely neat
        $step = 1;
        if ($diffInDays > 31) {
            $step = (int) ceil($diffInDays / 30);
        }

        for ($d = 0; $d <= $diffInDays; $d += $step) {
            $date = $startDate->copy()->addDays($d);
            $dayStart = $date->copy()->startOfDay();
            $dayEnd = $date->copy()->endOfDay();

            $dayTrxs = Transaction::with('items.product')
                ->where('store_id', $storeId)
                ->where('status', 'completed')
                ->whereBetween('created_at', [$dayStart, $dayEnd])
                ->get();

            $dayRevenue = 0;
            $dayCogs = 0;

            foreach ($dayTrxs as $trx) {
                $dayRevenue += $trx->grand_total;
                foreach ($trx->items as $item) {
                    $buyPrice = $item->product ? $item->product->buy_price : 0;
                    $dayCogs += $buyPrice * $item->quantity;
                }
            }

            $dailyTrend[] = [
                'date' => $date->format('Y-m-d'),
                'day_name' => $date->isoFormat('DD MMM'),
                'revenue' => $dayRevenue,
                'cogs' => $dayCogs,
                'profit' => $dayRevenue - $dayCogs
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'total_sales' => $totalSales,
                'total_discount' => $totalDiscount,
                'total_tax' => $totalTax,
                'total_cogs' => $totalCogs,
                'gross_profit' => $grossProfit,
                'profit_margin_percent' => round($profitMarginPercent, 2),
                'total_items_sold' => $totalItemsSold,
                'transactions_count' => $transactions->count(),
                'total_purchases_val' => $totalPurchasesVal,
                'total_items_purchased' => $totalItemsPurchased,
                'purchases_count' => $purchases->count(),
                'daily_trend' => $dailyTrend
            ]
        ]);
    }
}
