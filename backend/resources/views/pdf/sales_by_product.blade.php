<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Laporan Penjualan per Produk</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #333;
            font-size: 11px;
            line-height: 1.5;
            margin: 0;
            padding: 0;
        }
        .header {
            text-align: center;
            margin-bottom: 25px;
            border-bottom: 2px solid #10b981;
            padding-bottom: 10px;
        }
        .header h1 {
            margin: 0 0 5px 0;
            font-size: 20px;
            color: #065f46;
        }
        .header p {
            margin: 0;
            color: #666;
            font-size: 13px;
        }
        .info-table {
            width: 100%;
            margin-bottom: 20px;
            border-collapse: collapse;
        }
        .info-table td {
            padding: 4px 0;
        }
        .info-table td.label {
            font-weight: bold;
            width: 15%;
            color: #4b5563;
        }
        .info-table td.value {
            width: 35%;
        }
        .report-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .report-table th, .report-table td {
            border: 1px solid #e5e7eb;
            padding: 7px 8px;
            text-align: left;
        }
        .report-table th {
            background-color: #f3f4f6;
            color: #374151;
            font-weight: bold;
        }
        .report-table td.amount {
            text-align: right;
            font-family: Courier, monospace;
        }
        .report-table tr.total-row td {
            font-weight: bold;
            background-color: #ecfdf5;
            color: #065f46;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #9ca3af;
            border-top: 1px solid #e5e7eb;
            padding-top: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>LAPORAN PENJUALAN PER PRODUK</h1>
        <p>{{ $store_name }}</p>
    </div>

    <table class="info-table">
        <tr>
            <td class="label">Periode:</td>
            <td class="value">{{ $start_date }} s/d {{ $end_date }}</td>
            <td class="label">Tanggal Cetak:</td>
            <td class="value">{{ $generated_at }}</td>
        </tr>
    </table>

    <table class="report-table">
        <thead>
            <tr>
                <th style="width: 5%;">No</th>
                <th>Nama Produk</th>
                <th>SKU</th>
                <th>Kategori</th>
                <th style="width: 12%; text-align: right;">Jumlah Terjual</th>
                <th style="width: 18%; text-align: right;">Total Diskon (IDR)</th>
                <th style="width: 20%; text-align: right;">Total Penjualan (IDR)</th>
            </tr>
        </thead>
        <tbody>
            @php 
                $grandQty = 0;
                $grandDiscount = 0;
                $grandRevenue = 0;
            @endphp
            @forelse($items as $index => $item)
                @php
                    $grandQty += $item->total_qty;
                    $grandDiscount += $item->total_discount;
                    $grandRevenue += $item->total_revenue;
                @endphp
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td style="font-weight: bold;">{{ $item->product_name }}</td>
                    <td>{{ $item->product->sku ?? '-' }}</td>
                    <td>{{ $item->product->category->name ?? '-' }}</td>
                    <td class="amount">{{ number_format($item->total_qty, 0, ',', '.') }}</td>
                    <td class="amount">{{ number_format($item->total_discount, 2, ',', '.') }}</td>
                    <td class="amount">{{ number_format($item->total_revenue, 2, ',', '.') }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="7" style="text-align: center; color: #9ca3af; padding: 20px;">Tidak ada data transaksi pada periode ini.</td>
                </tr>
            @endforelse
            @if(count($items) > 0)
                <tr class="total-row">
                    <td colspan="4" style="text-align: right;">GRAND TOTAL</td>
                    <td class="amount">{{ number_format($grandQty, 0, ',', '.') }}</td>
                    <td class="amount">{{ number_format($grandDiscount, 2, ',', '.') }}</td>
                    <td class="amount">{{ number_format($grandRevenue, 2, ',', '.') }}</td>
                </tr>
            @endif
        </tbody>
    </table>

    <div class="footer">
        Laporan ini dihasilkan secara otomatis oleh KEPOS Point of Sale. Hak Cipta &copy; {{ date('Y') }}. All rights reserved.
    </div>
</body>
</html>
