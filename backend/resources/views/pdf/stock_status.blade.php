<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Laporan Status Stok & Bahan Baku</title>
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
            border-bottom: 2px solid #f59e0b;
            padding-bottom: 10px;
        }
        .header h1 {
            margin: 0 0 5px 0;
            font-size: 20px;
            color: #b45309;
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
            background-color: #fffbeb;
            color: #b45309;
        }
        .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: bold;
            color: #fff;
        }
        .badge-finished {
            background-color: #3b82f6;
        }
        .badge-raw {
            background-color: #f59e0b;
        }
        .badge-alert {
            background-color: #ef4444;
        }
        .badge-ok {
            background-color: #10b981;
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
        <h1>LAPORAN STATUS STOK & BAHAN BAKU</h1>
        <p>{{ $store_name }}</p>
    </div>

    <table class="info-table">
        <tr>
            <td class="label">Status Tanggal:</td>
            <td class="value">{{ $generated_at }}</td>
            <td class="label">Dicetak Oleh:</td>
            <td class="value">Owner Toko</td>
        </tr>
    </table>

    <table class="report-table">
        <thead>
            <tr>
                <th style="width: 5%;">No</th>
                <th>Nama Barang</th>
                <th>SKU</th>
                <th style="width: 15%;">Tipe</th>
                <th style="width: 12%; text-align: right;">Stok Saat Ini</th>
                <th style="width: 12%; text-align: right;">Batas Minimum</th>
                <th style="width: 15%; text-align: right;">Harga Beli (IDR)</th>
                <th style="width: 18%; text-align: right;">Valuasi Stok (IDR)</th>
                <th style="width: 10%;">Status</th>
            </tr>
        </thead>
        <tbody>
            @php 
                $totalValuation = 0;
                $totalItems = 0;
            @endphp
            @forelse($products as $index => $prod)
                @php
                    $valuation = $prod->stock_quantity * $prod->buy_price;
                    $totalValuation += $valuation;
                    $totalItems += $prod->stock_quantity;
                @endphp
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td style="font-weight: bold;">{{ $prod->name }}</td>
                    <td>{{ $prod->sku }}</td>
                    <td>
                        @if($prod->product_type === 'finished_good')
                            <span class="badge badge-finished">Produk Jadi</span>
                        @else
                            <span class="badge badge-raw">Bahan Baku</span>
                        @endif
                    </td>
                    <td class="amount">{{ number_format($prod->stock_quantity, 0, ',', '.') }}</td>
                    <td class="amount">{{ number_format($prod->low_stock_threshold, 0, ',', '.') }}</td>
                    <td class="amount">{{ number_format($prod->buy_price, 2, ',', '.') }}</td>
                    <td class="amount">{{ number_format($valuation, 2, ',', '.') }}</td>
                    <td>
                        @if($prod->stock_quantity <= $prod->low_stock_threshold)
                            <span class="badge badge-alert">Menipis</span>
                        @else
                            <span class="badge badge-ok">Aman</span>
                        @endif
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="9" style="text-align: center; color: #9ca3af; padding: 20px;">Tidak ada data produk terdaftar.</td>
                </tr>
            @endforelse
            @if(count($products) > 0)
                <tr class="total-row">
                    <td colspan="4" style="text-align: right;">TOTAL VALUASI</td>
                    <td class="amount">{{ number_format($totalItems, 0, ',', '.') }}</td>
                    <td colspan="2"></td>
                    <td class="amount">{{ number_format($totalValuation, 2, ',', '.') }}</td>
                    <td></td>
                </tr>
            @endif
        </tbody>
    </table>

    <div class="footer">
        Laporan ini dihasilkan secara otomatis oleh KEPOS Point of Sale. Hak Cipta &copy; {{ date('Y') }}. All rights reserved.
    </div>
</body>
</html>
