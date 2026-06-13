<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Laporan Rekonsiliasi Shift & Kasir</title>
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
            border-bottom: 2px solid #8b5cf6;
            padding-bottom: 10px;
        }
        .header h1 {
            margin: 0 0 5px 0;
            font-size: 20px;
            color: #5b21b6;
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
            background-color: #f5f3ff;
            color: #5b21b6;
        }
        .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: bold;
            color: #fff;
        }
        .badge-open {
            background-color: #3b82f6;
        }
        .badge-closed {
            background-color: #10b981;
        }
        .discrepancy-neg {
            color: #dc2626;
            font-weight: bold;
        }
        .discrepancy-pos {
            color: #10b981;
            font-weight: bold;
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
        <h1>LAPORAN REKONSILIASI SHIFT KASIR</h1>
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
                <th>Nama Kasir</th>
                <th>Mulai</th>
                <th>Selesai</th>
                <th style="width: 14%; text-align: right;">Modal Awal (IDR)</th>
                <th style="width: 14%; text-align: right;">Uang Terhitung (IDR)</th>
                <th style="width: 14%; text-align: right;">Ekspektasi Kas (IDR)</th>
                <th style="width: 14%; text-align: right;">Selisih / Discrepancy (IDR)</th>
                <th style="width: 10%;">Status</th>
            </tr>
        </thead>
        <tbody>
            @php 
                $totalOpening = 0;
                $totalClosing = 0;
                $totalExpected = 0;
                $totalDiscrepancy = 0;
            @endphp
            @forelse($shifts as $index => $shift)
                @php
                    $totalOpening += $shift->opening_cash;
                    $totalClosing += $shift->closing_cash ?? 0;
                    $totalExpected += $shift->expected_cash ?? 0;
                    
                    $disc = 0;
                    if($shift->status === 'closed') {
                        $disc = ($shift->closing_cash ?? 0) - ($shift->expected_cash ?? 0);
                        $totalDiscrepancy += $disc;
                    }
                @endphp
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td style="font-weight: bold;">{{ $shift->cashier->name ?? 'Kasir N/A' }}</td>
                    <td>{{ $shift->start_time }}</td>
                    <td>{{ $shift->end_time ?? '-' }}</td>
                    <td class="amount">{{ number_format($shift->opening_cash, 2, ',', '.') }}</td>
                    <td class="amount">{{ $shift->closing_cash !== null ? number_format($shift->closing_cash, 2, ',', '.') : '-' }}</td>
                    <td class="amount">{{ $shift->expected_cash !== null ? number_format($shift->expected_cash, 2, ',', '.') : '-' }}</td>
                    <td class="amount">
                        @if($shift->status === 'closed')
                            @if($disc < 0)
                                <span class="discrepancy-neg">{{ number_format($disc, 2, ',', '.') }}</span>
                            @elseif($disc > 0)
                                <span class="discrepancy-pos">+{{ number_format($disc, 2, ',', '.') }}</span>
                            @else
                                <span>0,00</span>
                            @endif
                        @else
                            -
                        @endif
                    </td>
                    <td>
                        @if($shift->status === 'open')
                            <span class="badge badge-open">Aktif</span>
                        @else
                            <span class="badge badge-closed">Selesai</span>
                        @endif
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="9" style="text-align: center; color: #9ca3af; padding: 20px;">Tidak ada shift kasir pada periode ini.</td>
                </tr>
            @endforelse
            @if(count($shifts) > 0)
                <tr class="total-row">
                    <td colspan="4" style="text-align: right;">GRAND TOTAL</td>
                    <td class="amount">{{ number_format($totalOpening, 2, ',', '.') }}</td>
                    <td class="amount">{{ number_format($totalClosing, 2, ',', '.') }}</td>
                    <td class="amount">{{ number_format($totalExpected, 2, ',', '.') }}</td>
                    <td class="amount">
                        @if($totalDiscrepancy < 0)
                            <span class="discrepancy-neg">{{ number_format($totalDiscrepancy, 2, ',', '.') }}</span>
                        @elseif($totalDiscrepancy > 0)
                            <span class="discrepancy-pos">+{{ number_format($totalDiscrepancy, 2, ',', '.') }}</span>
                        @else
                            <span>0,00</span>
                        @endif
                    </td>
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
