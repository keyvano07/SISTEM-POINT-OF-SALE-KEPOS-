'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  Sparkles, Terminal, Activity, ShoppingCart, ShieldCheck, 
  Tablet, ArrowRight, ExternalLink, Package, TrendingUp, Cpu
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const formatCurrency = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
};

export default function LandingPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'pos' | 'kiosk' | 'dashboard' | 'stocker'>('pos');
  const [mounted, setMounted] = useState(false);

  const tabs = [
    { id: 'pos', name: 'Kasir POS', icon: ShoppingCart },
    { id: 'kiosk', name: 'Self-Service Kiosk', icon: Tablet },
    { id: 'dashboard', name: 'Dashboard Stats', icon: TrendingUp },
    { id: 'stocker', name: 'Gudang (Stocker)', icon: Package },
  ] as const;

  useEffect(() => {
    setMounted(true);
    
    // Intersection Observer for scroll-driven animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'translate-y-0');
          entry.target.classList.remove('opacity-0', 'translate-y-12');
        }
      });
    }, { threshold: 0.1 });

    const animatedElements = document.querySelectorAll('.scroll-animate');
    animatedElements.forEach(el => observer.observe(el));

    return () => {
      animatedElements.forEach(el => observer.unobserve(el));
    };
  }, []);

  if (!mounted) return null;

  const features = [
    {
      icon: ShoppingCart,
      title: 'Point of Sale (Kasir)',
      description: 'Checkout transaksi secepat kilat dengan manajemen keranjang belanja dinamis, kalkulator kembalian otomatis, dan cetak struk terintegrasi.',
      color: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    },
    {
      icon: Tablet,
      title: 'Kiosk Pemesanan Mandiri',
      description: 'Dua opsi tampilan (vertikal & tablet) yang touch-friendly dengan penyesuaian kustomisasi produk (topping/ukuran) untuk kepuasan pelanggan.',
      color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    },
    {
      icon: TrendingUp,
      title: 'Analisis Real-Time',
      description: 'Pantau omset harian, total transaksi harian, nilai rata-rata transaksi, kontribusi metode pembayaran, dan grafik tren mingguan.',
      color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
    },
    {
      icon: Package,
      title: 'Manajemen Inventori & Gudang',
      description: 'Lacak persediaan produk secara otomatis dengan notifikasi stok kritis untuk menghentikan risiko kehabisan barang dagangan.',
      color: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    },
    {
      icon: ShieldCheck,
      title: 'Keamanan Multi-Role',
      description: 'Hak akses terdistribusi untuk Kasir, Pramuniaga, Stocker, Supervisor, dan Manager untuk mencegah penyalahgunaan data.',
      color: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
    },
    {
      icon: Cpu,
      title: 'Sinkronisasi Otomatis',
      description: 'Sinkronisasi instan antara input keranjang belanja Pramuniaga ke terminal Kasir untuk memangkas waktu tunggu antrean.',
      color: 'bg-purple-500/10 text-purple-500 border-purple-500/20'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden font-sans relative">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes glow {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.35; }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-glow {
          animation: glow 8s ease-in-out infinite;
        }
      `}</style>

      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none animate-glow" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-glow" style={{ animationDelay: '-2s' }} />
      <div className="absolute bottom-10 left-1/3 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none animate-glow" style={{ animationDelay: '-4s' }} />

      {/* Header / Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 transition-all">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-lg text-white shadow-lg shadow-blue-500/20">
              KE
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-400 via-indigo-200 to-white bg-clip-text text-transparent">KEPOS</span>
              <span className="text-[10px] block font-mono text-slate-500 uppercase tracking-widest -mt-1">Point of Sale</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-400">
            <a href="#fitur" className="hover:text-white transition-colors">Fitur Utama</a>
            <a href="#simulator" className="hover:text-white transition-colors">Simulasi Modul</a>
            <a href="#kreator" className="hover:text-white transition-colors">Kreator</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              href={user ? "/dashboard" : "/login"}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white text-slate-950 hover:bg-slate-200 active:scale-95 transition-all shadow-md shadow-white/5"
            >
              {user ? "Akses Dashboard" : "Masuk Aplikasi"}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Glow Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-400 mb-6 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Sistem Point of Sale Premium & Terintegrasi</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.15] max-w-4xl text-white">
          Kendali Penuh Bisnis Ritel & Kiosk dalam{" "}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
            Satu Genggaman
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl font-medium leading-relaxed">
          KEPOS menyajikan transaksi kasir instan, visualisasi analitik real-time, manajemen gudang cerdas, hingga pemesanan mandiri (self-service kiosk) yang dirancang secara profesional.
        </p>

        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Link 
            href={user ? "/dashboard" : "/login"}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-base font-extrabold shadow-lg shadow-blue-500/20 flex items-center gap-2 active:scale-95 transition-all"
          >
            {user ? "Masuk ke Dashboard" : "Mulai Sekarang"}
            <ArrowRight className="w-5 h-5" />
          </Link>
          <a 
            href="#fitur" 
            className="px-8 py-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-base font-bold active:scale-95 transition-all"
          >
            Pelajari Fitur
          </a>
        </div>

        {/* Hero Interactive Mockup */}
        <div className="mt-16 w-full max-w-5xl rounded-2xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur-sm shadow-2xl relative animate-float">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 opacity-20 blur-xl pointer-events-none" />
          {/* Top Bar Decoration */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 px-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="px-10 py-1 bg-slate-950/60 rounded-md text-[10px] font-mono text-slate-500 border border-slate-900">
              kepos-pos-app.local/dashboard
            </div>
            <span className="w-4 h-4" />
          </div>

          {/* Miniature Layout */}
          <div className="grid grid-cols-4 gap-4 h-[300px] md:h-[400px] overflow-hidden rounded-lg">
            {/* Sidebar Mock */}
            <div className="bg-slate-950/60 border border-slate-900 p-3 rounded-lg flex flex-col justify-between hidden md:flex">
              <div className="space-y-4">
                <div className="w-full h-8 bg-blue-600/10 border border-blue-500/20 rounded-md flex items-center px-2.5 gap-2">
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  <div className="w-16 h-2 bg-blue-400/40 rounded-full" />
                </div>
                <div className="space-y-2.5 pl-1.5">
                  <div className="w-20 h-2 bg-slate-800 rounded-full" />
                  <div className="w-16 h-2 bg-slate-800 rounded-full" />
                  <div className="w-24 h-2 bg-slate-800 rounded-full" />
                  <div className="w-12 h-2 bg-slate-800 rounded-full" />
                </div>
              </div>
              <div className="flex items-center gap-2 pl-1">
                <div className="w-6 h-6 rounded-full bg-slate-800" />
                <div className="w-16 h-1.5 bg-slate-800 rounded-full" />
              </div>
            </div>

            {/* Dashboard Stats & Mock Grid */}
            <div className="col-span-4 md:col-span-3 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950/40 border border-slate-900 p-3.5 rounded-lg space-y-2.5">
                  <div className="w-10 h-1.5 bg-slate-800 rounded-full" />
                  <div className="w-20 h-4 bg-slate-200/90 rounded-md" />
                  <div className="w-12 h-1.5 bg-emerald-500/20 rounded-full" />
                </div>
                <div className="bg-slate-950/40 border border-slate-900 p-3.5 rounded-lg space-y-2.5">
                  <div className="w-14 h-1.5 bg-slate-800 rounded-full" />
                  <div className="w-16 h-4 bg-slate-200/90 rounded-md" />
                  <div className="w-10 h-1.5 bg-emerald-500/20 rounded-full" />
                </div>
                <div className="bg-slate-950/40 border border-slate-900 p-3.5 rounded-lg space-y-2.5">
                  <div className="w-12 h-1.5 bg-slate-800 rounded-full" />
                  <div className="w-24 h-4 bg-slate-200/90 rounded-md" />
                  <div className="w-16 h-1.5 bg-rose-500/20 rounded-full" />
                </div>
              </div>

              {/* Chart Graphic Simulation */}
              <div className="bg-slate-950/50 border border-slate-900 p-4 rounded-lg h-[200px] md:h-[280px] flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-24 h-2 bg-slate-800 rounded-full" />
                  <div className="w-8 h-3.5 bg-slate-900 border border-slate-800 rounded-md" />
                </div>
                {/* SVG Polyline Animation */}
                <div className="w-full h-[120px] md:h-[180px] relative">
                  <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                    <path
                      d="M 20,95 C 60,85 80,45 120,45 C 160,45 180,90 220,90 C 260,90 280,15 320,15 C 340,15 360,60 380,60"
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="2.5"
                    />
                    <circle cx="120" cy="45" r="3" className="fill-blue-500" />
                    <circle cx="320" cy="15" r="3" className="fill-emerald-500" />
                  </svg>
                </div>
                <div className="flex justify-between">
                  <span className="w-8 h-1.5 bg-slate-800 rounded-full" />
                  <span className="w-8 h-1.5 bg-slate-800 rounded-full" />
                  <span className="w-8 h-1.5 bg-slate-800 rounded-full" />
                  <span className="w-8 h-1.5 bg-slate-800 rounded-full" />
                  <span className="w-8 h-1.5 bg-slate-800 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="fitur" className="py-24 border-t border-slate-900 px-6 relative bg-slate-950">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16 scroll-animate opacity-0 translate-y-12 transition-all duration-700 ease-out">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Fitur Lengkap POS Ritel Kelas Enterprise
            </h2>
            <p className="mt-4 text-slate-400 font-medium leading-relaxed">
              Kombinasi performa tinggi Next.js dan ketangguhan backend Laravel API untuk menjamin transaksi aman, sinkron, dan selalu termonitor.
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, idx) => (
              <div 
                key={idx} 
                className="scroll-animate opacity-0 translate-y-12 transition-all duration-700 ease-out p-6 rounded-2xl border border-slate-900 bg-slate-900/20 hover:border-slate-800 hover:bg-slate-900/30 hover:-translate-y-1 transition-all"
                style={{ transitionDelay: `${idx * 100}ms` }}
              >
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-5 ${feat.color}`}>
                  <feat.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Simulator Section */}
      <section id="simulator" className="py-24 border-t border-slate-900 px-6 relative bg-slate-950/40">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16 scroll-animate opacity-0 translate-y-12 transition-all duration-700 ease-out">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Eksplorasi Simulasi Antarmuka KEPOS
            </h2>
            <p className="mt-4 text-slate-400 font-medium leading-relaxed">
              Klik tab di bawah ini untuk melihat pratinjau bagaimana modul KEPOS bekerja mengelola operasional retail toko Anda.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="scroll-animate opacity-0 translate-y-12 transition-all duration-700 ease-out flex flex-wrap gap-2 justify-center max-w-xl mx-auto p-1.5 rounded-2xl bg-slate-900/50 border border-slate-900 mb-12">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </div>

          {/* Simulator Content Preview */}
          <div className="scroll-animate opacity-0 translate-y-12 transition-all duration-700 ease-out w-full max-w-4xl mx-auto rounded-2xl border border-slate-900 bg-slate-950/80 p-6 shadow-xl relative min-h-[350px] flex flex-col justify-between">
            {activeTab === 'pos' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <div>
                    <h4 className="font-bold text-white text-base">Terminal Kasir POS Utama</h4>
                    <p className="text-xs text-slate-500">Antarmuka transaksi kasir terintegrasi</p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Shift Aktif</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Keranjang Belanja</p>
                    <div className="space-y-1.5">
                      {[
                        { name: 'Aqua Botol 600ml', qty: 2, price: 4000 },
                        { name: 'Indomie Goreng', qty: 5, price: 3100 },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl text-xs border border-slate-900">
                          <span className="font-bold text-slate-200">{item.name} <span className="text-slate-500 pl-2">x{item.qty}</span></span>
                          <span className="font-mono font-bold text-slate-300">{formatCurrency(item.qty * item.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-900 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Subtotal</span>
                        <span className="font-mono font-bold text-slate-300">{formatCurrency(23500)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Pajak (11%)</span>
                        <span className="font-mono font-bold text-slate-300">{formatCurrency(2585)}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-slate-800 pt-2 font-black text-white">
                        <span>Grand Total</span>
                        <span className="font-mono text-blue-400">{formatCurrency(26085)}</span>
                      </div>
                    </div>
                    <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/10">
                      Proses Pembayaran
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'kiosk' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <div>
                    <h4 className="font-bold text-white text-base">Self-Service Kiosk Terminal</h4>
                    <p className="text-xs text-slate-500">Pemesanan mandiri responsif & disabilitas friendly</p>
                  </div>
                  <span className="text-xs bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md text-slate-400 font-bold">Portrait & Landscape</span>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {/* Category list */}
                  <div className="space-y-1 bg-slate-900/30 p-2 rounded-lg border border-slate-900/60 hidden md:block">
                    <div className="bg-blue-600 text-white text-[10px] font-bold p-2 rounded-md">Makanan</div>
                    <div className="text-slate-400 text-[10px] font-bold p-2 hover:text-white">Minuman</div>
                    <div className="text-slate-400 text-[10px] font-bold p-2 hover:text-white">Kebutuhan Rumah</div>
                  </div>
                  <div className="col-span-4 md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { name: 'Indomie Goreng', price: 3100, desc: 'Mi goreng original' },
                      { name: 'Aqua 600ml', price: 4000, desc: 'Air mineral botol' },
                      { name: 'Indomie Kuah', price: 3000, desc: 'Rasa soto spesial' },
                    ].map((item, idx) => (
                      <div key={idx} className="bg-slate-900/50 border border-slate-900 p-2.5 rounded-xl flex flex-col justify-between space-y-2">
                        <div>
                          <div className="w-full h-16 bg-slate-950 rounded-lg flex items-center justify-center text-slate-700 text-xs font-bold">
                            Product Image
                          </div>
                          <p className="text-xs font-bold text-slate-200 mt-2 truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-500 line-clamp-1">{item.desc}</p>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-900/50">
                          <span className="font-mono text-xs font-extrabold text-blue-400">{formatCurrency(item.price)}</span>
                          <button className="px-2 py-1 bg-blue-600 text-white rounded text-[9px] font-bold">Pilih</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'dashboard' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <div>
                    <h4 className="font-bold text-white text-base">Dashboard Analitik Eksekutif</h4>
                    <p className="text-xs text-slate-500">Agregasi performa toko real-time dari database</p>
                  </div>
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">Terhubung</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-900">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Omset Hari Ini</p>
                    <p className="text-lg font-black text-white font-mono mt-1">Rp 4.250.000</p>
                    <p className="text-[9px] text-emerald-500 font-semibold">+12.5% vs Kemarin</p>
                  </div>
                  <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-900">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Total Order</p>
                    <p className="text-lg font-black text-white font-mono mt-1">124 Transaksi</p>
                    <p className="text-[9px] text-emerald-500 font-semibold">+8.4% vs Kemarin</p>
                  </div>
                  <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-900">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Nilai Keranjang</p>
                    <p className="text-lg font-black text-white font-mono mt-1">Rp 34.274</p>
                    <p className="text-[9px] text-slate-500 font-semibold">Transaksi rata-rata</p>
                  </div>
                  <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-900">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Stok Kritis</p>
                    <p className="text-lg font-black text-rose-500 font-mono mt-1">3 Produk</p>
                    <p className="text-[9px] text-rose-500 font-semibold">Butuh Restock segera</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'stocker' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <div>
                    <h4 className="font-bold text-white text-base">Sistem Manajemen Stok & Gudang</h4>
                    <p className="text-xs text-slate-500">Pencatatan penyesuaian stok dan log masuk keluar barang</p>
                  </div>
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">Stocker Mode</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-900 text-slate-500 font-bold">
                        <th className="pb-2">SKU</th>
                        <th className="pb-2">Nama Barang</th>
                        <th className="pb-2 text-center">Jumlah Stok</th>
                        <th className="pb-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60">
                      {[
                        { sku: 'INDM-GRG-001', name: 'Indomie Goreng', stock: 100, status: 'Aman', color: 'text-emerald-400 bg-emerald-500/10' },
                        { sku: 'AQUA-600-002', name: 'Aqua Botol 600ml', stock: 50, status: 'Aman', color: 'text-emerald-400 bg-emerald-500/10' },
                        { sku: 'RNSP-800-003', name: 'Rinso Cair 800ml', stock: 3, status: 'Kritis', color: 'text-rose-400 bg-rose-500/10' },
                      ].map((prod, idx) => (
                        <tr key={idx} className="text-slate-300">
                          <td className="py-2.5 font-mono">{prod.sku}</td>
                          <td className="py-2.5">{prod.name}</td>
                          <td className="py-2.5 text-center font-bold font-mono">{prod.stock} pcs</td>
                          <td className="py-2.5 text-right">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border border-transparent ${prod.color}`}>
                              {prod.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Creator Showcase Section */}
      <section id="kreator" className="py-24 border-t border-slate-900 px-6 relative bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6 scroll-animate opacity-0 translate-y-12 transition-all duration-700 ease-out">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-400">
                <Terminal className="w-3.5 h-3.5" />
                <span>Lead Architect & Engineer</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Didesain & Dikembangkan Oleh Keyvano Rifqi Andriansyah
              </h2>
              <p className="text-slate-400 leading-relaxed text-base font-medium">
                Sebagai pengembang utama KEPOS, saya menyatukan teknologi web modern (Next.js, Tailwind CSS, TypeScript) di frontend dengan kekuatan backend Laravel framework untuk menghasilkan Point of Sale yang aman, performa super cepat, dan andal di berbagai resolusi layar.
              </p>
              <div className="pt-4 flex flex-wrap gap-4">
                <a 
                  href="https://github.com/keyvano07" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sm font-bold text-slate-200 transition-colors"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <span>Ikuti di GitHub</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </div>
            </div>

            {/* Right Graphic Mockup */}
            <div className="scroll-animate opacity-0 translate-y-12 transition-all duration-700 ease-out flex justify-center lg:justify-end">
              <div className="p-8 rounded-2xl border border-slate-900 bg-slate-900/10 backdrop-blur-sm max-w-md w-full relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-500/20">
                    KR
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-white text-lg">Keyvano Rifqi Andriansyah</h4>
                    <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Software Engineer</p>
                    <p className="text-xs text-slate-500">Purwokerto, Indonesia</p>
                  </div>
                </div>
                <div className="mt-6 border-t border-slate-900 pt-6 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Core Technologies</span>
                    <span className="font-bold text-slate-300">Laravel, Next.js, Tailwind, MySQL</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Target Pengembangan</span>
                    <span className="font-bold text-slate-300">Clean Architecture, High Performance POS</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Status Platform</span>
                    <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Production Ready
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA final Section */}
      <section className="py-24 border-t border-slate-900 px-6 relative bg-slate-950/40 text-center">
        <div className="max-w-4xl mx-auto space-y-6 scroll-animate opacity-0 translate-y-12 transition-all duration-700 ease-out">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Siap Mengakselerasi Bisnis Ritel Anda?
          </h2>
          <p className="text-slate-400 font-medium max-w-xl mx-auto text-sm sm:text-base">
            Masuk ke KEPOS sekarang dan nikmati ekosistem manajemen penjualan terbaik yang dirancang khusus untuk kemudahan operasional Anda.
          </p>
          <div className="pt-4">
            <Link 
              href={user ? "/dashboard" : "/login"}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-base font-extrabold shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
            >
              <span>Akses KEPOS Sekarang</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-12 px-6 bg-slate-950 text-slate-500 text-center text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-white">
              KE
            </div>
            <span className="font-extrabold text-sm text-slate-300">KEPOS</span>
          </div>
          <p className="font-medium">
            Copyright &copy; 2026 KEPOS. Hak Cipta Dilindungi. Dibuat dengan &hearts; oleh{" "}
            <span className="text-slate-300 font-bold">Keyvano Rifqi Andriansyah</span>.
          </p>
          <div className="flex items-center gap-4 text-slate-400 font-bold">
            <a href="https://github.com/keyvano07" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
