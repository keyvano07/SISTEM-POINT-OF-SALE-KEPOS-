<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Laporan Keuangan KEPOS</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #333;
            font-size: 12px;
            line-height: 1.5;
            margin: 0;
            padding: 0;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 10px;
        }
        .header h1 {
            margin: 0 0 5px 0;
            font-size: 20px;
            color: #1e3a8a;
        }
        .header p {
            margin: 0;
            color: #666;
            font-size: 13px;
        }
        .info-table {
            width: 100%;
            margin-bottom: 25px;
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
        .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #1e3a8a;
            border-bottom: 1px solid #e5e7eb;
            margin-top: 25px;
            margin-bottom: 10px;
            padding-bottom: 4px;
        }
        .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .summary-table th, .summary-table td {
            border: 1px solid #e5e7eb;
            padding: 8px 10px;
            text-align: left;
        }
        .summary-table th {
            background-color: #f3f4f6;
            color: #374151;
            font-weight: bold;
        }
        .summary-table td.amount {
            text-align: right;
            font-family: Courier, monospace;
        }
        .summary-table tr.total-row td {
            font-weight: bold;
            background-color: #eff6ff;
            color: #1e40af;
        }
        .footer {
            margin-top: 50px;
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
        <h1>LAPORAN KEUANGAN KEPOS</h1>
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

    <div class="section-title">Ringkasan Penjualan</div>
    <table class="summary-table">
        <thead>
            <tr>
                <th>Deskripsi</th>
                <th style="width: 25%; text-align: right;">Nilai (IDR)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Total Transaksi Penjualan</td>
                <td class="amount">{{ number_format($transactions_count, 0, ',', '.') }} Transaksi</td>
            </tr>
            <tr>
                <td>Total Barang Terjual</td>
                <td class="amount">{{ number_format($total_items_sold, 0, ',', '.') }} Pcs</td>
            </tr>
            <tr>
                <td>Total Potongan / Diskon</td>
                <td class="amount">{{ number_format($total_discount, 2, ',', '.') }}</td>
            </tr>
            <tr>
                <td>Total Pajak Penjualan</td>
                <td class="amount">{{ number_format($total_tax, 2, ',', '.') }}</td>
            </tr>
            <tr class="total-row">
                <td>Total Pendapatan Kotor (Gross Revenue)</td>
                <td class="amount">{{ number_format($total_sales, 2, ',', '.') }}</td>
            </tr>
        </tbody>
    </table>

    <div class="section-title">Harga Pokok Penjualan (HPP) & Laba Kotor</div>
    <table class="summary-table">
        <tbody>
            <tr>
                <td style="width: 75%;">Total Pendapatan Kotor (Gross Revenue)</td>
                <td class="amount">{{ number_format($total_sales, 2, ',', '.') }}</td>
            </tr>
            <tr>
                <td>Total Harga Pokok Penjualan (COGS / HPP)</td>
                <td class="amount" style="color: #dc2626;">-{{ number_format($total_cogs, 2, ',', '.') }}</td>
            </tr>
            <tr class="total-row">
                <td>Laba Kotor (Gross Profit)</td>
                <td class="amount">{{ number_format($gross_profit, 2, ',', '.') }}</td>
            </tr>
        </tbody>
    </table>

    <div class="section-title">Ringkasan Pembelian / Restock</div>
    <table class="summary-table">
        <thead>
            <tr>
                <th>Deskripsi</th>
                <th style="width: 25%; text-align: right;">Nilai (IDR)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Total Transaksi Restock</td>
                <td class="amount">{{ number_format($purchases_count, 0, ',', '.') }} Transaksi</td>
            </tr>
            <tr>
                <td>Total Barang Masuk (Restock)</td>
                <td class="amount">{{ number_format($total_items_purchased, 0, ',', '.') }} Pcs</td>
            </tr>
            <tr class="total-row">
                <td>Total Pengeluaran Pembelian Barang</td>
                <td class="amount">{{ number_format($total_purchases_val, 2, ',', '.') }}</td>
            </tr>
        </tbody>
    </table>

    <div class="footer">
        Laporan ini dihasilkan secara otomatis oleh KEPOS Point of Sale. Hak Cipta &copy; {{ date('Y') }}. All rights reserved.
    </div>
</body>
</html>
