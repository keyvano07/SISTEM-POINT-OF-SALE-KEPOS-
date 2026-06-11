'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useShiftStore } from '@/store/useShiftStore';
import { 
  Package, Clipboard, ShoppingCart, UserCheck, ShieldCheck, Mail, Store,
  TrendingUp, DollarSign, Users, Award, AlertCircle, Clock, ArrowRight,
  Activity, Calendar, X, Loader2, ArrowUpRight, CheckCircle2, ChevronRight, Wallet
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Helper to format currency
const formatCurrency = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
};

const formatInputRupiah = (value: string) => {
  const clean = value.replace(/\D/g, '');
  if (!clean) return '';
  return new Intl.NumberFormat('id-ID').format(parseInt(clean, 10));
};

const parseRupiahToNumber = (formattedValue: string) => {
  const clean = formattedValue.replace(/\D/g, '');
  return clean ? parseInt(clean, 10) : 0;
};

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { activeShift, isLoading: shiftLoading, fetchActiveShift, openShift } = useShiftStore();
  
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    fetchActiveShift();
  }, [fetchActiveShift]);

  if (!isHydrated || !user) return null;

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseRupiahToNumber(openingCashInput);
    if (amount < 0) {
      setErrorMsg('Jumlah modal awal tidak valid.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await openShift(amount);
      setShowOpenShiftModal(false);
      setOpeningCashInput('');
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const modules = [
    {
      title: 'Manajemen Inventori',
      description: 'Atur produk, kategori, harga jual, dan status stok kritis toko.',
      icon: Package,
      path: '/dashboard/manager/products',
      roles: ['super_admin', 'manager'],
      featured: false,
    },
    {
      title: 'Gudang & Logistik',
      description: 'Pencatatan penyesuaian stok, restock barang masuk, dan monitoring log.',
      icon: Clipboard,
      path: '/dashboard/stocker',
      roles: ['super_admin', 'manager', 'supervisor', 'stocker'],
      featured: false,
    },
    {
      title: 'Point of Sale (Kasir)',
      description: 'Buka antarmuka kasir utama untuk melakukan checkout transaksi pelanggan.',
      icon: ShoppingCart,
      path: '/pos',
      roles: ['super_admin', 'manager', 'supervisor', 'kasir'],
      featured: true,
    },
    {
      title: 'Pramuniaga (Draft)',
      description: 'Buat keranjang belanja sementara untuk pelanggan sebelum diproses kasir.',
      icon: UserCheck,
      path: '/pramuniaga',
      roles: ['super_admin', 'manager', 'supervisor', 'pramuniaga'],
      featured: false,
    },
  ];

  // Role verification helper
  const isManagerial = ['super_admin', 'manager', 'supervisor'].includes(user.role);
  const isKasir = user.role === 'kasir';
  const isStocker = user.role === 'stocker';
  const isPramuniaga = user.role === 'pramuniaga';

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative bg-card border border-border/80 rounded-2xl p-6 lg:p-8 shadow-sm overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-extrabold text-xl shadow-inner">
            {user.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">
              Selamat Datang, {user.name}!
            </h2>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <span>Akses Panel Anda sebagai:</span>
              <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 font-bold text-xs uppercase tracking-wider px-2.5 py-0.5">
                {user.role.replace('_', ' ')}
              </Badge>
            </p>
          </div>
        </div>

        {/* Quick Connection Info */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-muted/40 border border-border/50 px-3 py-1.5 rounded-xl text-xs font-semibold">
            <Store className="w-3.5 h-3.5 text-primary" />
            <span>Store ID: <strong className="text-foreground">{user.store_id || 'Pusat'}</strong></span>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Sistem Terkoneksi</span>
          </div>
        </div>
      </div>

      {/* ================= MANAGERIAL / EXECUTIVE VIEW (Chart & Insights) ================= */}
      {isManagerial && (
        <div className="space-y-6">
          {/* Summary Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/60 hover:shadow-md transition-all">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Pendapatan Hari Ini</p>
                  <p className="text-2xl font-extrabold font-mono tracking-tight text-foreground">{formatCurrency(4250000)}</p>
                  <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> +12.5% vs Kemarin
                  </p>
                </div>
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <DollarSign className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 hover:shadow-md transition-all">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Total Transaksi</p>
                  <p className="text-2xl font-extrabold font-mono tracking-tight text-foreground">124 Order</p>
                  <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> +8.4% vs Minggu Lalu
                  </p>
                </div>
                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                  <ShoppingCart className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 hover:shadow-md transition-all">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Rata-rata Keranjang</p>
                  <p className="text-2xl font-extrabold font-mono tracking-tight text-foreground">{formatCurrency(34274)}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold">Konsisten tinggi</p>
                </div>
                <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
                  <Activity className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 hover:shadow-md transition-all">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Stok Kritis</p>
                  <p className="text-2xl font-extrabold font-mono tracking-tight text-destructive">3 Produk</p>
                  <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-bold px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-2.5 h-2.5" /> Butuh Restock
                  </span>
                </div>
                <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
                  <Package className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart & Insights Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Trend Chart Card */}
            <Card className="border-border/60 lg:col-span-2 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Tren Penjualan Mingguan
                  </CardTitle>
                  <Badge variant="secondary" className="text-[10px] font-bold">7 Hari Terakhir</Badge>
                </div>
                <CardDescription>Grafik tren omset harian toko</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {/* SVG Bezier Line Chart */}
                <div className="w-full h-[220px] relative">
                  <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>

                    {/* Grid Lines */}
                    <line x1="30" y1="30" x2="470" y2="30" stroke="rgba(150,150,150,0.1)" strokeDasharray="4" />
                    <line x1="30" y1="80" x2="470" y2="80" stroke="rgba(150,150,150,0.1)" strokeDasharray="4" />
                    <line x1="30" y1="130" x2="470" y2="130" stroke="rgba(150,150,150,0.1)" strokeDasharray="4" />
                    <line x1="30" y1="180" x2="470" y2="180" stroke="rgba(150,150,150,0.15)" />

                    {/* Area under the path */}
                    <path
                      d="M 30,132 C 65,121 65,110 100,110 C 135,110 135,123 170,123 C 205,123 205,82 240,82 C 275,82 275,101 310,101 C 345,101 345,30 380,30 C 415,30 415,52 450,52 L 450,180 L 30,180 Z"
                      fill="url(#chartGradient)"
                    />

                    {/* Main smooth Line */}
                    <path
                      d="M 30,132 C 65,121 65,110 100,110 C 135,110 135,123 170,123 C 205,123 205,82 240,82 C 275,82 275,101 310,101 C 345,101 345,30 380,30 C 415,30 415,52 450,52"
                      fill="none"
                      stroke="url(#lineGradient)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Data Node points */}
                    <circle cx="30" cy="132" r="5" className="fill-blue-500 stroke-background stroke-2 cursor-pointer hover:r-7 transition-all" />
                    <circle cx="100" cy="110" r="5" className="fill-blue-500 stroke-background stroke-2 cursor-pointer hover:r-7 transition-all" />
                    <circle cx="170" cy="123" r="5" className="fill-blue-500 stroke-background stroke-2 cursor-pointer hover:r-7 transition-all" />
                    <circle cx="240" cy="82" r="5" className="fill-emerald-500 stroke-background stroke-2 cursor-pointer hover:r-7 transition-all" />
                    <circle cx="310" cy="101" r="5" className="fill-emerald-500 stroke-background stroke-2 cursor-pointer hover:r-7 transition-all" />
                    <circle cx="380" cy="30" r="6" className="fill-emerald-500 stroke-background stroke-2 cursor-pointer hover:r-8 transition-all" />
                    <circle cx="450" cy="52" r="5" className="fill-emerald-500 stroke-background stroke-2 cursor-pointer hover:r-7 transition-all" />
                  </svg>
                </div>
                {/* Labels row */}
                <div className="flex justify-between text-[10px] text-muted-foreground font-bold px-2 mt-2">
                  <span>Sen (1.2jt)</span>
                  <span>Sel (1.9jt)</span>
                  <span>Rab (1.5jt)</span>
                  <span>Kam (2.8jt)</span>
                  <span>Jum (2.2jt)</span>
                  <span className="text-emerald-500 font-extrabold">Sab (4.5jt)</span>
                  <span>Min (3.8jt)</span>
                </div>
              </CardContent>
            </Card>

            {/* Top Products Card */}
            <Card className="border-border/60 shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  Produk Terlaris
                </CardTitle>
                <CardDescription>Barang dengan penjualan terbanyak</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2 flex-1 flex flex-col justify-center">
                {[
                  { name: 'Aqua Botol 600ml', cat: 'Minuman', qty: 320, pct: 100 },
                  { name: 'Indomie Bangladesh', cat: 'Makanan', qty: 250, pct: 78 },
                  { name: 'Indomie Kuah Special', cat: 'Makanan', qty: 180, pct: 56 },
                  { name: 'Rinso Cair 800ml', cat: 'Rumah Tangga', qty: 95, pct: 30 }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="min-w-0">
                        <p className="font-bold truncate text-foreground">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">{item.cat}</p>
                      </div>
                      <span className="font-mono font-bold text-primary pl-2">{item.qty} pcs</span>
                    </div>
                    {/* Sleek horizontal bar */}
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500" 
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ================= CASHIER PANEL HUB (Active Shift State) ================= */}
      {isKasir && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Shift State Card */}
          <Card className="border-border/60 lg:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Status Shift Anda saat ini
              </CardTitle>
              <CardDescription>Informasi status laci kas untuk transaksi kasir</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {shiftLoading ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-xs font-semibold">Memeriksa status shift...</span>
                </div>
              ) : activeShift ? (
                <div className="space-y-6">
                  {/* Active Shift Info block */}
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col sm:flex-row justify-between gap-4">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500 text-white font-bold text-[10px] rounded-full uppercase tracking-wider shadow-sm select-none">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        Aktif
                      </span>
                      <p className="text-sm font-bold text-foreground mt-2">Kode Shift: <span className="font-mono text-primary">{activeShift.shift_code}</span></p>
                      <p className="text-xs text-muted-foreground">Mulai Shift: {new Date(activeShift.opened_at).toLocaleString('id-ID')}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Modal Awal Laci</p>
                      <p className="text-xl font-extrabold text-foreground font-mono mt-1">{formatCurrency(activeShift.opening_cash)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={() => router.push('/pos')} 
                      className="flex-1 h-11 bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                    >
                      <ShoppingCart className="w-4 h-4" /> Masuk ke Terminal POS (Kasir)
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-start gap-4">
                    <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-foreground">Shift Kasir Belum Dibuka</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Anda tidak dapat membuka halaman Kasir (Point of Sale) sebelum membuka shift kas baru.
                        Silakan buka shift dengan memasukkan modal awal di bawah.
                      </p>
                    </div>
                  </div>

                  <Button 
                    onClick={() => setShowOpenShiftModal(true)} 
                    className="w-full h-11 bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                  >
                    <Wallet className="w-4 h-4" /> Buka Shift Baru Sekarang
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Guidelines / Cashier Tips Card */}
          <Card className="border-border/60 shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Panduan Operasional Kasir
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs leading-relaxed flex-1 flex flex-col justify-center">
              <div className="flex gap-2.5">
                <span className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">1</span>
                <p className="text-muted-foreground"><strong className="text-foreground">Cek Uang Kembalian:</strong> Pastikan persediaan uang tunai pecahan kecil di laci kas mencukupi sebelum melayani pembeli.</p>
              </div>
              <div className="flex gap-2.5">
                <span className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">2</span>
                <p className="text-muted-foreground"><strong className="text-foreground">Tanyakan Membership:</strong> Ingatkan pembeli untuk menyebutkan nomor HP/ID Member guna mengakumulasi poin belanja.</p>
              </div>
              <div className="flex gap-2.5">
                <span className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">3</span>
                <p className="text-muted-foreground"><strong className="text-foreground">Tutup Shift Harian:</strong> Selalu lakukan proses tutup shift kas saat pergantian kerja atau akhir jam operasional toko.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================= STOCKER DASHBOARD SECTION ================= */}
      {isStocker && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-500" />
              Gudang & Inventori Ringkasan
            </CardTitle>
            <CardDescription>Akses cepat untuk pencatatan restock dan pengecekan stok kritis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-foreground">Pemberitahuan Stok Gudang</p>
                <p className="text-muted-foreground mt-0.5">Ada beberapa barang yang stoknya berada di bawah batas aman. Harap lakukan penyesuaian/restok.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => router.push('/dashboard/stocker')} 
                className="flex-1 h-11 bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
              >
                <Clipboard className="w-4 h-4" /> Masuk ke Panel Gudang
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================= PRAMUNIAGA DASHBOARD SECTION ================= */}
      {isPramuniaga && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary" />
              Panel Pramuniaga (Draft Order)
            </CardTitle>
            <CardDescription>Buat dan kelola draft pesanan pembeli di lantai toko</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sebagai pramuniaga, Anda dapat mempercepat pelayanan pembeli dengan membuat draft keranjang belanjaan langsung dari gadget portabel Anda. 
              Draft belanja yang dikunci akan dikirimkan secara langsung ke terminal kasir untuk pembayaran instan.
            </p>
            <Button 
              onClick={() => router.push('/pramuniaga')} 
              className="w-full sm:w-auto px-6 h-11 bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
            >
              <UserCheck className="w-4 h-4" /> Buka Halaman Pramuniaga <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Access Modules List */}
      <div className="space-y-4">
        <h3 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Akses Cepat Modul Utama
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules
            .filter(mod => mod.roles.includes(user.role))
            .map((mod) => {
              const Icon = mod.icon;
              
              if (mod.featured) {
                return (
                  <button
                    key={mod.path}
                    onClick={() => router.push(mod.path)}
                    className="p-6 bg-primary hover:bg-primary/95 rounded-2xl text-left transition-all duration-200 group flex flex-col justify-between h-48 shadow-lg shadow-primary/15 relative overflow-hidden active:scale-[0.98]"
                  >
                    <div className="absolute -top-[10%] -right-[10%] w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="p-2.5 bg-white/20 text-primary-foreground rounded-xl w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform z-10">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="relative z-10 space-y-1">
                      <h4 className="font-extrabold text-primary-foreground text-lg tracking-tight flex items-center gap-1.5">
                        {mod.title}
                        <ArrowUpRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </h4>
                      <p className="text-xs text-primary-foreground/75 font-medium leading-relaxed">{mod.description}</p>
                    </div>
                  </button>
                );
              }
              
              return (
                <Card
                  key={mod.path}
                  className="border-border/60 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group h-48 flex flex-col justify-between active:scale-[0.99]"
                  onClick={() => router.push(mod.path)}
                >
                  <CardContent className="p-6 flex flex-col justify-between h-full">
                    <div className="p-2.5 bg-muted/60 text-muted-foreground rounded-xl w-10 h-10 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors duration-200">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-base tracking-tight text-foreground flex items-center justify-between">
                        <span>{mod.title}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{mod.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </div>

      {/* ===== OPEN SHIFT DIALOG MODAL (Integrated inside Dashboard) ===== */}
      {showOpenShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-2xl space-y-6 animate-scale-in">
            {/* Close button */}
            <button
              onClick={() => { setShowOpenShiftModal(false); setErrorMsg(null); }}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-accent text-muted-foreground hover:text-primary-foreground transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="mx-auto w-fit p-4 bg-primary/10 rounded-lg border border-primary/20">
                <DollarSign className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold mt-4">Buka Shift Baru</h3>
              <p className="text-sm text-muted-foreground">Masukkan jumlah uang tunai yang ada di laci kas sebagai modal awal.</p>
            </div>

            <form onSubmit={handleOpenShift} className="space-y-5">
              {errorMsg && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl font-semibold">
                  {errorMsg}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-semibold uppercase block">Modal Awal Laci Kas (IDR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">Rp</span>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="100.000"
                    value={openingCashInput}
                    onChange={(e) => setOpeningCashInput(formatInputRupiah(e.target.value))}
                    className="w-full bg-muted border border-border rounded-xl pl-12 pr-4 h-12 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground text-foreground font-mono"
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[50000, 100000, 150000, 200000, 300000, 500000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setOpeningCashInput(formatInputRupiah(amount.toString()))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 ${
                        parseRupiahToNumber(openingCashInput) === amount
                          ? 'bg-primary/20 border-primary/40 text-primary'
                          : 'bg-muted border-border text-muted-foreground hover:text-primary-foreground hover:border-border'
                      }`}
                    >
                      {formatCurrency(amount)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !openingCashInput}
                className="w-full h-12 bg-primary hover:bg-primary/95 disabled:bg-accent disabled:text-muted-foreground disabled:cursor-not-allowed text-primary-foreground font-bold text-xs rounded-xl shadow-lg shadow-primary/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                <span>Buka Shift</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
