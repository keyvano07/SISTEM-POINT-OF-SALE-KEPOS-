'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';
import { 
  FileText, TrendingUp, Package, Clock, Download, Calendar, Loader2, 
  CheckCircle2, AlertCircle, RefreshCw, Landmark, Percent, DollarSign, Calculator, HelpCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type ReportType = 'financial' | 'sales_by_product' | 'stock_status' | 'shift_reconciliation';

interface ReportCardProps {
  id: ReportType;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  selected: boolean;
  onClick: () => void;
  accentClass: string;
}

function ReportCard({ title, description, icon: Icon, selected, onClick, accentClass }: ReportCardProps) {
  return (
    <Card 
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all duration-200 border-border/60 hover:shadow-md relative overflow-hidden",
        selected ? "ring-2 ring-primary border-primary bg-primary/5 shadow-md" : "hover:border-primary/40"
      )}
    >
      <div className={cn("absolute top-0 left-0 w-1.5 h-full", accentClass)} />
      <CardContent className="p-5 flex items-start gap-4">
        <div className={cn("p-3 rounded-xl bg-card border border-border/50", selected && "text-primary border-primary/20 bg-primary/5")}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="font-bold text-foreground text-[14px]">{title}</h3>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OwnerReportsPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [reportType, setReportType] = useState<ReportType>('financial');
  const [downloading, setDownloading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Stats State
  const [stats, setStats] = useState<{
    total_sales: number;
    total_discount: number;
    total_tax: number;
    total_cogs: number;
    gross_profit: number;
    profit_margin_percent: number;
    total_items_sold: number;
    transactions_count: number;
    total_purchases_val: number;
    total_items_purchased: number;
    purchases_count: number;
    daily_trend: Array<{
      date: string;
      day_name: string;
      revenue: number;
      cogs: number;
      profit: number;
    }>;
  } | null>(null);

  // Calculator State
  const [calcCost, setCalcCost] = useState<number>(15000);
  const [calcMargin, setCalcMargin] = useState<number>(35);
  const [calcVolume, setCalcVolume] = useState<number>(1000);
  const [calcDiscount, setCalcDiscount] = useState<number>(0);
  const [calcTax, setCalcTax] = useState<number>(11);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    if (token && user) {
      if (user.role !== 'owner' && user.role !== 'super_admin') {
        router.push('/dashboard');
        return;
      }
      fetchSummary();
    }
  }, [token, user, router, startDate, endDate]);

  const fetchSummary = async () => {
    setLoadingStats(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/reports/financial/summary', {
        params: { start_date: startDate, end_date: endDate }
      });
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memuat rangkuman statistik keuangan.');
    } finally {
      setLoadingStats(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await api.get('/reports/financial/download', {
        params: {
          type: reportType,
          start_date: reportType !== 'stock_status' ? startDate : undefined,
          end_date: reportType !== 'stock_status' ? endDate : undefined,
        },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      let filename = `Laporan_`;
      if (reportType === 'financial') filename += `Keuangan_${startDate}_s.d_${endDate}`;
      if (reportType === 'sales_by_product') filename += `Penjualan_Produk_${startDate}_s.d_${endDate}`;
      if (reportType === 'stock_status') filename += `Status_Stok_Realtime`;
      if (reportType === 'shift_reconciliation') filename += `Rekonsiliasi_Shift_${startDate}_s.d_${endDate}`;
      filename += `.pdf`;

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMsg(`Laporan berhasil diunduh dengan nama file: ${filename}`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      setErrorMsg('Gagal mengunduh laporan PDF. Pastikan rentang tanggal valid.');
    } finally {
      setDownloading(false);
    }
  };

  // Calculator logic
  // Margin = (Price - Cost) / Price => Price = Cost / (1 - Margin/100)
  // Adjusted for discount: Final Price = Price * (1 - Disc/100)
  // Tax is added: Final Price with Tax = Final Price * (1 + Tax/100)
  const calcBasePrice = calcMargin < 100 ? calcCost / (1 - (calcMargin / 100)) : calcCost;
  const calcPromoDiscount = calcBasePrice * (calcDiscount / 100);
  const calcSellPriceBeforeTax = calcBasePrice - calcPromoDiscount;
  const calcTaxAmount = calcSellPriceBeforeTax * (calcTax / 100);
  const calcFinalSellPrice = calcSellPriceBeforeTax + calcTaxAmount;
  const calcProfitPerUnit = calcSellPriceBeforeTax - calcCost;
  const calcTotalProfitProj = calcProfitPerUnit * calcVolume;
  const calcTotalRevenueProj = calcFinalSellPrice * calcVolume;
  const calcActualMargin = calcSellPriceBeforeTax > 0 ? (calcProfitPerUnit / calcSellPriceBeforeTax) * 100 : 0;

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  // Render SVG Chart
  const renderChart = () => {
    if (!stats || !stats.daily_trend || stats.daily_trend.length === 0) return null;

    const trend = stats.daily_trend;
    const maxVal = Math.max(...trend.map(d => Math.max(d.revenue, d.cogs, 100000)));
    const padding = 40;
    const width = 600;
    const height = 220;

    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const getX = (index: number) => padding + (index / (trend.length - 1 || 1)) * chartWidth;
    const getY = (val: number) => height - padding - (val / maxVal) * chartHeight;

    // Build SVG Path strings
    let revPath = "";
    let cogsPath = "";
    
    trend.forEach((d, i) => {
      const x = getX(i);
      const yRev = getY(d.revenue);
      const yCogs = getY(d.cogs);

      if (i === 0) {
        revPath = `M ${x} ${yRev}`;
        cogsPath = `M ${x} ${yCogs}`;
      } else {
        revPath += ` L ${x} ${yRev}`;
        cogsPath += ` L ${x} ${yCogs}`;
      }
    });

    return (
      <div className="relative w-full h-[220px] bg-card/65 rounded-2xl border p-2 overflow-hidden shadow-inner">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0"/>
            </linearGradient>
            <linearGradient id="cogsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2"/>
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0"/>
            </linearGradient>
          </defs>

          {/* Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
            <line 
              key={i} 
              x1={padding} 
              y1={height - padding - r * chartHeight} 
              x2={width - padding} 
              y2={height - padding - r * chartHeight} 
              stroke="currentColor" 
              strokeOpacity="0.07" 
              strokeDasharray="4 4"
            />
          ))}

          {/* COGS area/line */}
          <path d={`${cogsPath} L ${getX(trend.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`} fill="url(#cogsGrad)" />
          <path d={cogsPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />

          {/* Revenue area/line */}
          <path d={`${revPath} L ${getX(trend.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`} fill="url(#revGrad)" />
          <path d={revPath} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />

          {/* Dot Markers */}
          {trend.map((d, i) => (
            <g key={i}>
              <circle cx={getX(i)} cy={getY(d.revenue)} r="4" fill="#3b82f6" stroke="#fff" strokeWidth="1.5" className="transition-all hover:r-6" />
              <circle cx={getX(i)} cy={getY(d.cogs)} r="3.5" fill="#f59e0b" stroke="#fff" strokeWidth="1" />
            </g>
          ))}

          {/* Labels */}
          {trend.length > 0 && (
            <>
              {/* Start Label */}
              <text x={getX(0)} y={height - 12} fill="currentColor" fillOpacity="0.5" fontSize="9" textAnchor="start" fontWeight="bold">
                {trend[0].day_name}
              </text>
              {/* Mid Label */}
              {trend.length > 2 && (
                <text x={getX(Math.floor(trend.length / 2))} y={height - 12} fill="currentColor" fillOpacity="0.5" fontSize="9" textAnchor="middle" fontWeight="bold">
                  {trend[Math.floor(trend.length / 2)].day_name}
                </text>
              )}
              {/* End Label */}
              <text x={getX(trend.length - 1)} y={height - 12} fill="currentColor" fillOpacity="0.5" fontSize="9" textAnchor="end" fontWeight="bold">
                {trend[trend.length - 1].day_name}
              </text>
            </>
          )}

          {/* Y Axis Max Label */}
          <text x={padding - 5} y={padding + 10} fill="currentColor" fillOpacity="0.4" fontSize="8" fontWeight="bold" textAnchor="end">
            {formatRupiah(maxVal).replace(',00', '')}
          </text>
        </svg>

        {/* Floating Legends */}
        <div className="absolute top-2 right-4 flex gap-4 text-[10px] font-bold">
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            <span>Pendapatan</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span>HPP / Modal</span>
          </div>
        </div>
      </div>
    );
  };

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header and filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Landmark className="w-8 h-8 text-primary" /> Laporan & Ringkasan Keuangan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Pantau laba kotor, HPP, margin profitabilitas, dan unduh laporan resmi PDF.</p>
        </div>

        {/* Date Filter Panel */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-44">
            <Calendar className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
            <Input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border-border/70 focus-visible:ring-primary pl-9 h-10 text-xs font-semibold"
            />
          </div>
          <span className="text-muted-foreground text-xs font-bold uppercase">s.d</span>
          <div className="relative w-full md:w-44">
            <Calendar className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
            <Input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border-border/70 focus-visible:ring-primary pl-9 h-10 text-xs font-semibold"
            />
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={fetchSummary} 
            className="rounded-xl flex-shrink-0"
            title="Muat Ulang Data"
          >
            <RefreshCw className={cn("w-4 h-4", loadingStats && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl text-sm font-semibold animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-4 rounded-xl text-sm font-semibold animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Rangkuman Keuangan Live Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden border-blue-500/15 bg-blue-500/[0.02] shadow-sm">
          <CardContent className="p-5 space-y-2">
            <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
              <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-80">Total Pendapatan</span>
              <div className="p-1.5 rounded-lg bg-blue-500/10"><TrendingUp className="w-4 h-4" /></div>
            </div>
            {loadingStats ? (
              <div className="h-8 w-28 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-xl md:text-2xl font-black text-foreground">{formatRupiah(stats?.total_sales ?? 0)}</p>
            )}
            <p className="text-[10px] text-muted-foreground font-semibold">{stats?.transactions_count ?? 0} Transaksi Penjualan</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-amber-500/15 bg-amber-500/[0.02] shadow-sm">
          <CardContent className="p-5 space-y-2">
            <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
              <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-80">Total Modal / HPP</span>
              <div className="p-1.5 rounded-lg bg-amber-500/10"><Package className="w-4 h-4" /></div>
            </div>
            {loadingStats ? (
              <div className="h-8 w-28 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-xl md:text-2xl font-black text-foreground">{formatRupiah(stats?.total_cogs ?? 0)}</p>
            )}
            <p className="text-[10px] text-muted-foreground font-semibold">{stats?.total_items_sold ?? 0} Produk Terjual</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-emerald-500/15 bg-emerald-500/[0.02] shadow-sm">
          <CardContent className="p-5 space-y-2">
            <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
              <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-80">Laba Kotor</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10"><Landmark className="w-4 h-4" /></div>
            </div>
            {loadingStats ? (
              <div className="h-8 w-28 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatRupiah(stats?.gross_profit ?? 0)}</p>
            )}
            <p className="text-[10px] text-muted-foreground font-semibold">Pendapatan dikurangi HPP</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-purple-500/15 bg-purple-500/[0.02] shadow-sm">
          <CardContent className="p-5 space-y-2">
            <div className="flex justify-between items-center text-purple-600 dark:text-purple-400">
              <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-80">Margin Profit</span>
              <div className="p-1.5 rounded-lg bg-purple-500/10"><Percent className="w-4 h-4" /></div>
            </div>
            {loadingStats ? (
              <div className="h-8 w-28 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-xl md:text-2xl font-black text-purple-600 dark:text-purple-400">{stats?.profit_margin_percent ?? 0}%</p>
            )}
            <p className="text-[10px] text-muted-foreground font-semibold">Tingkat efisiensi laba kotor</p>
          </CardContent>
        </Card>
      </div>

      {/* Middle Grid: Trend Chart & Profit Simulator Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <Card className="lg:col-span-2 border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" /> Tren Penjualan & HPP Harian
            </CardTitle>
            <CardDescription className="text-xs">
              Representasi visual real-time perbandingan pendapatan dan modal selama periode yang dipilih.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="h-[220px] bg-muted animate-pulse rounded-2xl flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : stats?.daily_trend && stats.daily_trend.length > 0 ? (
              renderChart()
            ) : (
              <div className="h-[220px] border border-dashed rounded-2xl flex flex-col items-center justify-center text-muted-foreground font-bold text-xs gap-1.5">
                <TrendingUp className="w-8 h-8 opacity-40" />
                Tidak ada data transaksi untuk rentang tanggal ini.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing & Profit Simulator Calculator */}
        <Card className="border-border/60 shadow-sm relative overflow-hidden bg-muted/[0.15]">
          <div className="absolute top-0 right-0 p-3 text-muted-foreground/30"><Calculator className="w-16 h-16 pointer-events-none" /></div>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
              <Calculator className="w-4 h-4" /> Simulator Margin & Profit
            </CardTitle>
            <CardDescription className="text-xs">
              Kalkulator interaktif simulasi penentuan harga jual, laba, dan proyeksi volume.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Input Cost */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label htmlFor="calc-cost" className="text-xs font-bold text-muted-foreground uppercase">Modal (HPP) / Unit</Label>
                <span className="text-xs font-bold text-primary">{formatRupiah(calcCost)}</span>
              </div>
              <Input 
                id="calc-cost"
                type="number"
                value={calcCost}
                onChange={(e) => setCalcCost(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-9 rounded-lg border-border/80 text-xs font-semibold"
              />
            </div>

            {/* Margin Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label htmlFor="calc-margin" className="text-xs font-bold text-muted-foreground uppercase">Target Margin (%)</Label>
                <span className="text-xs font-bold text-emerald-600">{calcMargin}%</span>
              </div>
              <input 
                id="calc-margin"
                type="range"
                min="0"
                max="95"
                value={calcMargin}
                onChange={(e) => setCalcMargin(parseInt(e.target.value) || 0)}
                className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Vol & Promo Toggle Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="calc-vol" className="text-xs font-bold text-muted-foreground uppercase">Volume (Pcs)</Label>
                <Input 
                  id="calc-vol"
                  type="number"
                  value={calcVolume}
                  onChange={(e) => setCalcVolume(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-9 rounded-lg border-border/80 text-xs font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="calc-disc" className="text-xs font-bold text-muted-foreground uppercase">Diskon Promo (%)</Label>
                <Input 
                  id="calc-disc"
                  type="number"
                  min="0"
                  max="100"
                  value={calcDiscount}
                  onChange={(e) => setCalcDiscount(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                  className="h-9 rounded-lg border-border/80 text-xs font-semibold"
                />
              </div>
            </div>

            {/* Calculations Result Output */}
            <div className="border-t border-border/60 pt-3 space-y-2.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Harga Jual (Sebelum Pajak):</span>
                <span>{formatRupiah(calcSellPriceBeforeTax)}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Harga Jual Konsumen (+11% PPN):</span>
                <span className="font-extrabold text-foreground">{formatRupiah(calcFinalSellPrice)}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Laba Bersih Per Unit:</span>
                <span className="text-emerald-600 dark:text-emerald-400">{formatRupiah(calcProfitPerUnit)}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-muted-foreground block">Proyeksi Laba Bersih</span>
                  <span className="text-xs text-muted-foreground">Volume {calcVolume} Pcs</span>
                </div>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatRupiah(calcTotalProfitProj)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Third Grid: PDF Report Generation Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left/Middle: Select Report Type */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Ekspor Laporan Resmi (PDF)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReportCard 
              id="financial"
              title="Laba Kotor & Keuangan"
              description="Pendapatan kotor, COGS/HPP, total diskon, pajak penjualan, serta rincian pembelian barang (restock) secara kumulatif."
              icon={TrendingUp}
              selected={reportType === 'financial'}
              onClick={() => setReportType('financial')}
              accentClass="bg-blue-500"
            />
            <ReportCard 
              id="sales_by_product"
              title="Penjualan per Produk"
              description="Rincian kuantitas produk yang paling laku, diskon yang diberikan, dan kontribusi pendapatan kotor per produk."
              icon={FileText}
              selected={reportType === 'sales_by_product'}
              onClick={() => setReportType('sales_by_product')}
              accentClass="bg-emerald-500"
            />
            <ReportCard 
              id="stock_status"
              title="Status Stok & Bahan Baku"
              description="Informasi real-time stok produk jadi dan bahan baku, harga beli, status keamanan stok, serta nilai total valuasi aset gudang."
              icon={Package}
              selected={reportType === 'stock_status'}
              onClick={() => setReportType('stock_status')}
              accentClass="bg-amber-500"
            />
            <ReportCard 
              id="shift_reconciliation"
              title="Rekonsiliasi Shift Kasir"
              description="Riwayat shift kasir, saldo kas awal/akhir, nilai ekspektasi kas sistem, status shift, serta pencatatan selisih kas (discrepancy)."
              icon={Clock}
              selected={reportType === 'shift_reconciliation'}
              onClick={() => setReportType('shift_reconciliation')}
              accentClass="bg-purple-500"
            />
          </div>
        </div>

        {/* Right: Date Filter & Action Button */}
        <div className="space-y-6">
          <Card className="border-border/60 shadow-sm bg-card">
            <CardHeader>
              <CardTitle className="text-base font-bold">Parameter Cetak PDF</CardTitle>
              <CardDescription className="text-xs">
                {reportType === 'stock_status' 
                  ? "Laporan status stok tidak memerlukan rentang tanggal karena diambil secara real-time saat ini." 
                  : "Mengekstrak berkas PDF berdasarkan filter tanggal di atas."
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {reportType !== 'stock_status' ? (
                <div className="p-3 bg-muted/40 rounded-xl space-y-1 border">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Mulai:</span>
                    <span>{startDate}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Sampai:</span>
                    <span>{endDate}</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-muted/40 rounded-xl border flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                  <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span>Menggunakan kondisi stok ter-update saat ini.</span>
                </div>
              )}

              <Button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm text-sm"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Membuat PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Unduh Laporan PDF
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
