'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  Sparkles, Terminal, Activity, ShoppingCart, ShieldCheck, 
  Tablet, ArrowRight, ExternalLink, Package, TrendingUp, Cpu,
  ChevronDown, MessageSquare, ShieldAlert, Award, Trash2, Plus, Search, Zap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const formatCurrency = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
};

// DUMMY DATA FOR INTERACTIVE SIMULATOR
const DUMMY_KASIR_PRODUCTS = [
  { id: 1, name: 'Indomie Goreng', price: 3100, icon: '🍜' },
  { id: 2, name: 'Aqua Botol 600ml', price: 4000, icon: '🥤' },
  { id: 3, name: 'Rinso Cair 800ml', price: 18500, icon: '🧼' },
  { id: 4, name: 'Kopi Kapal Api', price: 1500, icon: '☕' },
];

const DUMMY_KIOSK_PRODUCTS = [
  { id: 101, name: 'Nasi Goreng Spesial', price: 15000, icon: '🍳', category: 'makanan' },
  { id: 102, name: 'Mie Goreng Telur', price: 12000, icon: '🍜', category: 'makanan' },
  { id: 103, name: 'Es Teh Manis', price: 4000, icon: '🥤', category: 'minuman' },
  { id: 104, name: 'Es Jeruk Peras', price: 6000, icon: '🍹', category: 'minuman' },
  { id: 105, name: 'Camilan Kentang', price: 8000, icon: '🍟', category: 'makanan' },
  { id: 106, name: 'Kopi Susu Aren', price: 10000, icon: '☕', category: 'minuman' },
];

const INITIAL_STOCK_ITEMS = [
  { sku: 'INDM-GRG-001', name: 'Indomie Goreng', stock: 12, maxStock: 100, status: 'Aman' },
  { sku: 'AQUA-600-002', name: 'Aqua Botol 600ml', stock: 50, maxStock: 100, status: 'Aman' },
  { sku: 'RNSP-800-003', name: 'Rinso Cair 800ml', stock: 3, maxStock: 25, status: 'Kritis' },
  { sku: 'KOPI-KPL-004', name: 'Kopi Kapal Api', stock: 150, maxStock: 200, status: 'Aman' },
];

export default function LandingPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'pos' | 'kiosk' | 'dashboard' | 'stocker'>('pos');
  const [mounted, setMounted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // --- KASIR STATE ---
  const [kasirCart, setKasirCart] = useState<{ id: number; name: string; qty: number; price: number; icon: string }[]>([
    { id: 1, name: 'Indomie Goreng', qty: 2, price: 3100, icon: '🍜' },
    { id: 2, name: 'Aqua Botol 600ml', qty: 3, price: 4000, icon: '🥤' }
  ]);
  const [kasirPaymentModal, setKasirPaymentModal] = useState(false);
  const [kasirPaymentMethod, setKasirPaymentMethod] = useState<'tunai' | 'qris' | 'kartu'>('tunai');
  const [kasirCashPaid, setKasirCashPaid] = useState('');
  const [kasirSuccessMessage, setKasirSuccessMessage] = useState(false);

  // --- KIOSK STATE ---
  const [kioskCategory, setKioskCategory] = useState<'makanan' | 'minuman'>('makanan');
  const [kioskCart, setKioskCart] = useState<{ id: number; name: string; price: number; qty: number; modifier: string }[]>([]);
  const [selectedKioskProduct, setSelectedKioskProduct] = useState<typeof DUMMY_KIOSK_PRODUCTS[0] | null>(null);
  const [kioskSweetness, setKioskSweetness] = useState('Normal');
  const [kioskSendingQueue, setKioskSendingQueue] = useState(false);
  const [kioskSuccessQueue, setKioskSuccessQueue] = useState(false);

  // --- DASHBOARD STATE ---
  const [dbFilter, setDbFilter] = useState<'hari' | 'minggu' | 'bulan'>('hari');

  // --- STOCKER STATE ---
  const [stockItems, setStockItems] = useState(INITIAL_STOCK_ITEMS);
  const [stockSearch, setStockSearch] = useState('');

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
    }, { threshold: 0.05 });

    const animatedElements = document.querySelectorAll('.scroll-animate');
    animatedElements.forEach(el => observer.observe(el));

    return () => {
      animatedElements.forEach(el => observer.unobserve(el));
    };
  }, []);

  if (!mounted) return null;

  // --- KASIR LOGIC ---
  const addProductToKasir = (p: typeof DUMMY_KASIR_PRODUCTS[0]) => {
    const existing = kasirCart.find(item => item.id === p.id);
    if (existing) {
      setKasirCart(kasirCart.map(item => item.id === p.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setKasirCart([...kasirCart, { ...p, qty: 1 }]);
    }
  };

  const removeProductFromKasir = (id: number) => {
    setKasirCart(kasirCart.filter(item => item.id !== id));
  };

  const calculateKasirTotals = () => {
    const subtotal = kasirCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = Math.round(subtotal * 0.11);
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleKasirPaymentSubmit = () => {
    setKasirPaymentModal(false);
    setKasirSuccessMessage(true);
    setTimeout(() => {
      setKasirSuccessMessage(false);
      setKasirCart([]);
      setKasirCashPaid('');
    }, 3500);
  };

  // --- KIOSK LOGIC ---
  const handleKioskProductClick = (p: typeof DUMMY_KIOSK_PRODUCTS[0]) => {
    if (p.category === 'minuman') {
      setSelectedKioskProduct(p);
      setKioskSweetness('Normal');
    } else {
      // Makanan doesn't need sweetness level, add directly
      addKioskCartItem(p, '-');
    }
  };

  const addKioskCartItem = (p: typeof DUMMY_KIOSK_PRODUCTS[0], modifier: string) => {
    const existing = kioskCart.find(item => item.id === p.id && item.modifier === modifier);
    if (existing) {
      setKioskCart(kioskCart.map(item => (item.id === p.id && item.modifier === modifier) ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setKioskCart([...kioskCart, { id: p.id, name: p.name, price: p.price, qty: 1, modifier }]);
    }
    setSelectedKioskProduct(null);
  };

  const sendKioskOrderToKasir = () => {
    setKioskSendingQueue(true);
    setTimeout(() => {
      setKioskSendingQueue(false);
      setKioskSuccessQueue(true);
      // Automatically add Kiosk items to Kasir POS cart as dummy interaction!
      const transferItems = kioskCart.map(item => ({
        id: item.id,
        name: item.name + (item.modifier !== '-' ? ` (${item.modifier})` : ''),
        qty: item.qty,
        price: item.price,
        icon: item.id === 101 ? '🍳' : item.id === 102 ? '🍜' : item.id === 103 ? '🥤' : '🍹'
      }));
      setKasirCart(prev => [...prev, ...transferItems]);
      setKioskCart([]);
      setTimeout(() => {
        setKioskSuccessQueue(false);
      }, 3500);
    }, 1500);
  };

  // --- STOCKER LOGIC ---
  const restockItem = (sku: string) => {
    setStockItems(stockItems.map(item => {
      if (item.sku === sku) {
        return { ...item, stock: item.stock + 50, status: 'Aman' };
      }
      return item;
    }));
  };

  const filteredStockItems = stockItems.filter(item => 
    item.name.toLowerCase().includes(stockSearch.toLowerCase()) || 
    item.sku.toLowerCase().includes(stockSearch.toLowerCase())
  );

  const tabs = [
    { id: 'pos', name: 'Kasir POS', icon: ShoppingCart },
    { id: 'kiosk', name: 'Self-Service Kiosk', icon: Tablet },
    { id: 'dashboard', name: 'Dashboard Stats', icon: TrendingUp },
    { id: 'stocker', name: 'Gudang (Stocker)', icon: Package },
  ] as const;

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

  const workflowSteps = [
    {
      step: '01',
      title: 'Pilih & Pesan',
      desc: 'Pelanggan memilih menu secara mandiri melalui Kiosk atau dilayani oleh Pramuniaga.',
      icon: Tablet,
      bg: 'from-blue-600 to-indigo-600'
    },
    {
      step: '02',
      title: 'Antrean Instan',
      desc: 'Draft pesanan otomatis tersinkronisasi dan masuk ke daftar antrean Kasir.',
      icon: Cpu,
      bg: 'from-indigo-600 to-purple-600'
    },
    {
      step: '03',
      title: 'Pembayaran Kilat',
      desc: 'Kasir menyelesaikan pembayaran (Tunai/QRIS/Kartu) dan struk langsung tercetak.',
      icon: ShoppingCart,
      bg: 'from-purple-600 to-pink-600'
    },
    {
      step: '04',
      title: 'Analisis Real-Time',
      desc: 'Stok barang otomatis terpotong dan diagram keuangan masuk ke dashboard manajer.',
      icon: TrendingUp,
      bg: 'from-pink-600 to-emerald-600'
    }
  ];

  const faqs = [
    {
      q: 'Apakah KEPOS memerlukan koneksi internet terus-menerus?',
      a: 'KEPOS dirancang menggunakan sinkronisasi pintar. Transaksi lokal di kasir dan kiosk tetap berjalan lancar walaupun internet terputus, dan data penjualan akan disinkronisasikan secara otomatis saat jaringan kembali stabil.'
    },
    {
      q: 'Bagaimana cara kerja sinkronisasi antara Pramuniaga dan Kasir?',
      a: 'Setiap order draft yang dibuat oleh Pramuniaga di tablet disimpan secara instan di backend dan memicu event antrean. Kasir di kasir utama dapat langsung memuat keranjang belanja tersebut tanpa menginput ulang produk.'
    },
    {
      q: 'Apakah KEPOS mendukung kustomisasi menu di Kiosk?',
      a: 'Ya, KEPOS mendukung penambahan varian/modifier produk (seperti topping, tingkat kepedasan, atau ukuran gelas) lengkap dengan penyesuaian harga dinamis yang langsung dihitung saat checkout.'
    },
    {
      q: 'Apakah data transaksi dijamin aman dari manipulasi?',
      a: 'Keamanan adalah prioritas kami. Dengan arsitektur sistem multi-role, setiap tindakan sensitif (seperti pembukaan/penutupan shift kasir, audit stok, dan perubahan harga) dicatat secara mendalam dan hanya bisa diakses oleh supervisor/manajer.'
    }
  ];

  const testimonials = [
    {
      quote: 'Sistem Kiosk Pemesanan Mandiri KEPOS sangat mendongkrak penjualan kami. Pelanggan tidak perlu lagi antre panjang di depan kasir dan proses pemesanan menjadi sangat praktis.',
      name: 'Rian Hidayat',
      role: 'Owner Kopi Sentosa',
      initials: 'RH'
    },
    {
      quote: 'Dashboard manajer sangat memudahkan saya mengontrol keuangan dan memantau stok kritis dari rumah. Laporan mingguan dan grafik tren penjualannya benar-benar akurat.',
      name: 'Dewi Lestari',
      role: 'Finance Manager Toko Retail Kita',
      initials: 'DL'
    }
  ];

  const platformStats = [
    { label: 'Kecepatan Sinkronisasi', value: '< 50ms', desc: 'Pengiriman data antrean instan', icon: Activity, color: 'text-blue-400' },
    { label: 'Ketersediaan Sistem', value: '99.99%', desc: 'Uptime server aman terkendali', icon: ShieldCheck, color: 'text-emerald-400' },
    { label: 'Akurasi Laporan Keuangan', value: '100%', desc: 'Tanpa selisih antara kas & sistem', icon: Award, color: 'text-indigo-400' },
    { label: 'Efisiensi Waktu Transaksi', value: '3x Lebih Cepat', desc: 'Mengurangi antrean pembeli', icon: Zap, color: 'text-amber-400' }
  ];

  // Dashboard Stats calculation based on simulated periods
  const getDbStats = () => {
    switch (dbFilter) {
      case 'minggu':
        return {
          revenue: 'Rp 28.400.000',
          orders: '810 Order',
          lowStock: '4 SKU',
          badgeText: '+15.2% vs Minggu Lalu',
          orderBadgeText: '+11.8% vs Minggu Lalu',
          chartPath: 'M 20,80 C 60,60 80,85 120,40 C 160,25 180,95 220,50 C 260,30 280,75 320,20 C 340,15 360,45 380,30'
        };
      case 'bulan':
        return {
          revenue: 'Rp 120.500.000',
          orders: '3.420 Order',
          lowStock: '2 SKU',
          badgeText: '+24.1% vs Bulan Lalu',
          orderBadgeText: '+19.5% vs Bulan Lalu',
          chartPath: 'M 20,90 C 60,50 80,30 120,25 C 160,20 180,60 220,55 C 260,40 280,30 320,10 C 340,8 360,20 380,15'
        };
      case 'hari':
      default:
        return {
          revenue: 'Rp 4.250.000',
          orders: '124 Order',
          lowStock: '3 SKU',
          badgeText: '+12.5% vs Kemarin',
          orderBadgeText: '+8.4% vs Kemarin',
          chartPath: 'M 20,95 C 60,85 80,45 120,45 C 160,45 180,90 220,90 C 260,90 280,15 320,15 C 340,15 360,60 380,60'
        };
    }
  };

  const dbStats = getDbStats();

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
            <a href="#alur" className="hover:text-white transition-colors">Alur Kerja</a>
            <a href="#simulator" className="hover:text-white transition-colors">Simulasi Modul</a>
            <a href="#faq" className="hover:text-white transition-colors">Tanya Jawab</a>
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

        {/* Hero Interactive Mockup (No blank spaces/skeletons) */}
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
            <div className="w-4 h-4" />
          </div>

          {/* Miniature Layout */}
          <div className="grid grid-cols-4 gap-4 h-[300px] md:h-[400px] overflow-hidden rounded-lg">
            {/* Sidebar Mock (Filled with real text navigation) */}
            <div className="bg-slate-950/60 border border-slate-900 p-3 rounded-lg flex flex-col justify-between hidden md:flex">
              <div className="space-y-4">
                <div className="w-full h-8 bg-blue-600/10 border border-blue-500/20 rounded-md flex items-center px-2.5 gap-2 text-blue-400">
                  <Activity className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold tracking-wider">Dashboard</span>
                </div>
                <div className="space-y-3 pl-1">
                  <div className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors cursor-pointer">
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold">Point of Sale</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors cursor-pointer">
                    <Tablet className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold">Kiosk Order</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors cursor-pointer">
                    <Package className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold">Stok Barang</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors cursor-pointer">
                    <Terminal className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold">Log Audit</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-1 pt-3 border-t border-slate-900">
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-[9px] text-white">KM</div>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-bold text-slate-200">Budi Manager</span>
                  <span className="text-[7px] text-slate-500 font-mono">ID: KEPOS-001</span>
                </div>
              </div>
            </div>

            {/* Dashboard Stats & Mock Grid */}
            <div className="col-span-4 md:col-span-3 space-y-4 text-left">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950/40 border border-slate-900 p-3.5 rounded-lg space-y-1 relative overflow-hidden">
                  <div className="absolute top-2 right-2 text-emerald-500/20"><TrendingUp className="w-6 h-6" /></div>
                  <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">Omset Hari Ini</p>
                  <p className="text-sm md:text-base font-black text-slate-100 font-mono">Rp 4.250.000</p>
                  <p className="text-[8px] text-emerald-400 font-bold flex items-center gap-0.5">
                    <span className="text-xs">↑</span> +12.5% vs kemarin
                  </p>
                </div>
                <div className="bg-slate-950/40 border border-slate-900 p-3.5 rounded-lg space-y-1 relative overflow-hidden">
                  <div className="absolute top-2 right-2 text-blue-500/20"><ShoppingCart className="w-6 h-6" /></div>
                  <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">Total Transaksi</p>
                  <p className="text-sm md:text-base font-black text-slate-100 font-mono">124 Order</p>
                  <p className="text-[8px] text-emerald-400 font-bold flex items-center gap-0.5">
                    <span className="text-xs">↑</span> +8.4% vs kemarin
                  </p>
                </div>
                <div className="bg-slate-950/40 border border-slate-900 p-3.5 rounded-lg space-y-1 relative overflow-hidden">
                  <div className="absolute top-2 right-2 text-rose-500/20"><ShieldAlert className="w-6 h-6" /></div>
                  <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">Stok Kritis</p>
                  <p className="text-sm md:text-base font-black text-rose-500 font-mono">3 Produk</p>
                  <p className="text-[8px] text-rose-400 font-bold flex items-center gap-0.5">
                    Membutuhkan Restock
                  </p>
                </div>
              </div>

              {/* Chart Graphic Simulation */}
              <div className="bg-slate-950/50 border border-slate-900 p-4 rounded-lg h-[200px] md:h-[280px] flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-bold text-slate-300">Tren Grafik Mingguan</span>
                  </div>
                  <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">7 Hari Terakhir</span>
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
                    <circle cx="120" cy="45" r="4" className="fill-blue-500 stroke-slate-950 stroke-2" />
                    <circle cx="320" cy="15" r="4" className="fill-emerald-500 stroke-slate-950 stroke-2" />
                  </svg>
                </div>
                <div className="flex justify-between text-[8px] font-mono text-slate-500 pt-2 border-t border-slate-900">
                  <span>Senin</span>
                  <span>Selasa</span>
                  <span>Rabu</span>
                  <span>Kamis</span>
                  <span>Jumat</span>
                  <span>Sabtu</span>
                  <span>Minggu</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Stats Metrics */}
      <section className="py-20 border-t border-slate-900 px-6 bg-slate-950/20 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {platformStats.map((stat, idx) => (
              <div 
                key={idx} 
                className="scroll-animate opacity-0 translate-y-12 transition-all duration-700 ease-out p-6 rounded-2xl border border-slate-900 bg-slate-900/10 text-center relative overflow-hidden"
                style={{ transitionDelay: `${idx * 100}ms` }}
              >
                <div className="absolute top-2 right-2 opacity-10">
                  <stat.icon className="w-12 h-12" />
                </div>
                <div className={`w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white font-mono">{stat.value}</p>
                <p className="text-xs font-bold text-slate-300 mt-2">{stat.label}</p>
                <p className="text-[10px] text-slate-500 mt-1">{stat.desc}</p>
              </div>
            ))}
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

      {/* Workflow Section */}
      <section id="alur" className="py-24 border-t border-slate-900 px-6 relative bg-slate-950/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 scroll-animate opacity-0 translate-y-12 transition-all duration-700 ease-out">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Alur Kerja Transaksi KEPOS
            </h2>
            <p className="mt-4 text-slate-400 font-medium leading-relaxed">
              Bagaimana KEPOS menghubungkan setiap lini operasional toko Anda dalam 4 langkah terstruktur.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {workflowSteps.map((ws, idx) => (
              <div 
                key={idx}
                className="scroll-animate opacity-0 translate-y-12 transition-all duration-700 ease-out p-6 rounded-2xl border border-slate-900 bg-slate-950 relative overflow-hidden"
                style={{ transitionDelay: `${idx * 150}ms` }}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-tr from-transparent to-white/5 rounded-bl-full pointer-events-none" />
                <span className="text-3xl font-black text-slate-800 font-mono">{ws.step}</span>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${ws.bg} text-white flex items-center justify-center my-4`}>
                  <ws.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{ws.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{ws.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Simulator Section (FULLY INTERACTIVE SHOWCASE) */}
      <section id="simulator" className="py-24 border-t border-slate-900 px-6 relative bg-slate-950/20">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16 scroll-animate opacity-0 translate-y-12 transition-all duration-700 ease-out">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Eksplorasi Simulasi Antarmuka KEPOS
            </h2>
            <p className="mt-4 text-slate-400 font-medium leading-relaxed">
              Mainkan simulasi interaktif di bawah ini untuk melihat bagaimana fitur-fitur premium KEPOS mempermudah pengelolaan transaksi dan stok secara real-time.
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

          {/* Simulator Content Preview (Highly Interactive & Premium) */}
          <div className="scroll-animate opacity-0 translate-y-12 transition-all duration-700 ease-out w-full max-w-4xl mx-auto rounded-2xl border border-slate-900 bg-slate-950/80 p-6 shadow-xl relative min-h-[420px] flex flex-col justify-between text-left overflow-hidden">
            
            {/* Overlay: Kasir Payment Modal */}
            {kasirPaymentModal && (
              <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full space-y-4">
                  <h4 className="font-extrabold text-white text-base">Metode Pembayaran</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {(['tunai', 'qris', 'kartu'] as const).map((method) => (
                      <button
                        key={method}
                        onClick={() => setKasirPaymentMethod(method)}
                        className={`py-3 rounded-lg font-bold text-xs uppercase border transition-all ${
                          kasirPaymentMethod === method 
                            ? 'bg-blue-600 border-blue-500 text-white' 
                            : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>

                  {kasirPaymentMethod === 'tunai' && (
                    <div className="space-y-2 text-left">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Jumlah Uang Diterima</label>
                      <input
                        type="number"
                        placeholder="Contoh: 30000"
                        value={kasirCashPaid}
                        onChange={(e) => setKasirCashPaid(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  {kasirPaymentMethod === 'qris' && (
                    <div className="flex flex-col items-center py-2 space-y-2">
                      <div className="w-24 h-24 bg-white p-1.5 rounded-lg flex items-center justify-center font-black text-slate-950 text-xl font-mono">
                        QRIS
                      </div>
                      <p className="text-[9px] text-slate-500 font-bold">Pindai QR untuk simulasi pembayaran instan</p>
                    </div>
                  )}

                  {kasirPaymentMethod === 'kartu' && (
                    <div className="py-4 border border-slate-800 border-dashed rounded-lg flex flex-col items-center text-slate-400 text-xs">
                      <span>💳 Masukkan atau Gesek Kartu</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setKasirPaymentModal(false)}
                      className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 rounded-lg text-xs font-bold"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleKasirPaymentSubmit}
                      disabled={kasirPaymentMethod === 'tunai' && !kasirCashPaid}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                    >
                      Konfirmasi
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Overlay: Kasir Payment Success Message */}
            {kasirSuccessMessage && (
              <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h4 className="font-extrabold text-white text-lg">Transaksi Sukses!</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-2 leading-relaxed">
                  Pembayaran berhasil dikonfirmasi. Printer thermal sedang mencetak struk belanja, stok gudang otomatis terpotong!
                </p>
                {kasirCashPaid && (
                  <div className="mt-4 p-3 bg-slate-900/60 rounded-xl border border-slate-800 font-mono text-[10px] text-slate-300 w-full max-w-xs text-left space-y-1">
                    <div className="flex justify-between">
                      <span>Total Transaksi:</span>
                      <span>{formatCurrency(calculateKasirTotals().total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Uang Tunai:</span>
                      <span>{formatCurrency(parseFloat(kasirCashPaid))}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800 pt-1 text-emerald-400 font-bold">
                      <span>Kembalian:</span>
                      <span>{formatCurrency(parseFloat(kasirCashPaid) - calculateKasirTotals().total)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Overlay: Kiosk Modifier Modal */}
            {selectedKioskProduct && (
              <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{selectedKioskProduct.icon}</span>
                    <div className="text-left">
                      <h4 className="font-extrabold text-white text-sm">{selectedKioskProduct.name}</h4>
                      <p className="text-xs text-blue-400 font-bold font-mono">{formatCurrency(selectedKioskProduct.price)}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tingkat Kemanisan</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Less Sugar', 'Normal', 'Extra Sweet'].map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() => setKioskSweetness(lvl)}
                          className={`py-2 rounded-lg text-[10px] font-bold border transition-all ${
                            kioskSweetness === lvl 
                              ? 'bg-blue-600 border-blue-500 text-white' 
                              : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-white'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedKioskProduct(null)}
                      className="flex-1 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 rounded-lg text-xs font-bold"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => addKioskCartItem(selectedKioskProduct, kioskSweetness)}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold"
                    >
                      Tambahkan
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Overlay: Kiosk Sending Queue */}
            {kioskSendingQueue && (
              <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-10 h-10 border-4 border-t-blue-500 border-blue-500/10 rounded-full animate-spin mb-4" />
                <h4 className="font-extrabold text-white text-base">Mengirim Pesanan...</h4>
                <p className="text-xs text-slate-400 mt-1">Mengirim draft keranjang ke terminal Kasir POS secara real-time</p>
              </div>
            )}

            {/* Overlay: Kiosk Success Queue */}
            {kioskSuccessQueue && (
              <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
                  <Cpu className="w-8 h-8" />
                </div>
                <h4 className="font-extrabold text-white text-lg">Pesanan Dikirim!</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-2 leading-relaxed">
                  Draft order berhasil didaftarkan di Antrean Kasir. Silakan pilih tab **Kasir POS** untuk memproses pembayaran keranjang yang baru Anda kirim!
                </p>
              </div>
            )}

            {/* TAB CONTENT: KASIR POS */}
            {activeTab === 'pos' && (
              <div className="space-y-4 animate-fade-in flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <div>
                    <h4 className="font-bold text-white text-sm">Terminal Kasir POS Utama</h4>
                    <p className="text-[10px] text-slate-500">Antarmuka transaksi kasir terintegrasi (Klik item untuk menambahkan)</p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Shift Aktif</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                  {/* Left: Product Catalog */}
                  <div className="md:col-span-2 space-y-2">
                    <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Katalog Produk Fast-Input</p>
                    <div className="grid grid-cols-2 gap-2">
                      {DUMMY_KASIR_PRODUCTS.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => addProductToKasir(p)}
                          className="flex items-center gap-3 p-3 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-900 rounded-xl text-left transition-all active:scale-95 group"
                        >
                          <span className="text-2xl group-hover:scale-110 transition-transform">{p.icon}</span>
                          <div>
                            <p className="text-xs font-bold text-slate-200">{p.name}</p>
                            <p className="text-[10px] text-blue-400 font-semibold font-mono">{formatCurrency(p.price)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right: Cart Summary */}
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-900 flex flex-col justify-between space-y-3">
                    <div className="space-y-2 flex-1 overflow-y-auto max-h-[160px] pr-1">
                      <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Keranjang</p>
                      {kasirCart.length === 0 ? (
                        <div className="py-8 text-center text-slate-600 text-xs font-medium">Keranjang Kosong</div>
                      ) : (
                        <div className="space-y-1.5">
                          {kasirCart.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-2 bg-slate-950/40 border border-slate-900 rounded-lg text-[11px]">
                              <div className="flex flex-col text-left">
                                <span className="font-bold text-slate-200 truncate max-w-[100px]">{item.name}</span>
                                <span className="text-[9px] text-slate-500">{formatCurrency(item.price)} x{item.qty}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-300 font-bold">{formatCurrency(item.price * item.qty)}</span>
                                <button 
                                  onClick={() => removeProductFromKasir(item.id)}
                                  className="text-slate-500 hover:text-rose-500 p-0.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 border-t border-slate-800 pt-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">Subtotal</span>
                        <span className="font-mono text-slate-400 font-bold">{formatCurrency(calculateKasirTotals().subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">Pajak (11%)</span>
                        <span className="font-mono text-slate-400 font-bold">{formatCurrency(calculateKasirTotals().tax)}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-800/50 pt-1 font-black text-white">
                        <span>Grand Total</span>
                        <span className="font-mono text-blue-400">{formatCurrency(calculateKasirTotals().total)}</span>
                      </div>
                      <button
                        onClick={() => setKasirPaymentModal(true)}
                        disabled={kasirCart.length === 0}
                        className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/10 active:scale-95 transition-all"
                      >
                        Proses Pembayaran
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: SELF-SERVICE KIOSK */}
            {activeTab === 'kiosk' && (
              <div className="space-y-4 animate-fade-in flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <div>
                    <h4 className="font-bold text-white text-sm">Self-Service Kiosk Terminal</h4>
                    <p className="text-[10px] text-slate-500">Pemesanan mandiri layar sentuh (Klik item untuk menambahkan)</p>
                  </div>
                  <div className="flex gap-1">
                    {(['makanan', 'minuman'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setKioskCategory(cat)}
                        className={`px-3 py-1 rounded text-[9px] font-bold uppercase transition-all ${
                          kioskCategory === cat 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                  {/* Left: Product Selection */}
                  <div className="md:col-span-2 grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {DUMMY_KIOSK_PRODUCTS
                      .filter((p) => p.category === kioskCategory)
                      .map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleKioskProductClick(p)}
                          className="flex items-center gap-3 p-3 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-900 rounded-xl text-left transition-all active:scale-95 group relative"
                        >
                          <span className="text-2xl group-hover:scale-110 transition-transform">{p.icon}</span>
                          <div>
                            <p className="text-xs font-extrabold text-slate-200">{p.name}</p>
                            <p className="text-[10px] text-emerald-400 font-bold font-mono">{formatCurrency(p.price)}</p>
                          </div>
                          <div className="absolute top-2 right-2 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="w-3 h-3" />
                          </div>
                        </button>
                      ))}
                  </div>

                  {/* Right: Kiosk Cart & Send to POS */}
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-900 flex flex-col justify-between space-y-3">
                    <div className="space-y-2 flex-1 overflow-y-auto max-h-[160px] pr-1">
                      <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Draft Pesanan Kiosk</p>
                      {kioskCart.length === 0 ? (
                        <div className="py-8 text-center text-slate-600 text-xs font-medium">Belum ada menu terpilih</div>
                      ) : (
                        <div className="space-y-1.5">
                          {kioskCart.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-slate-950/40 border border-slate-900 rounded-lg text-[10px]">
                              <div className="flex flex-col text-left">
                                <span className="font-bold text-slate-200 truncate max-w-[100px]">{item.name}</span>
                                <span className="text-[8px] text-blue-400 font-semibold">{item.modifier !== '-' ? `Mod: ${item.modifier}` : 'Original'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-300 font-bold">x{item.qty}</span>
                                <span className="font-mono text-slate-300 font-bold">{formatCurrency(item.price * item.qty)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 border-t border-slate-800 pt-2 text-xs">
                      <div className="flex justify-between border-t border-slate-800/50 pt-1 font-black text-white">
                        <span>Total Kiosk</span>
                        <span className="font-mono text-emerald-400">
                          {formatCurrency(kioskCart.reduce((sum, i) => sum + (i.price * i.qty), 0))}
                        </span>
                      </div>
                      <button
                        onClick={sendKioskOrderToKasir}
                        disabled={kioskCart.length === 0}
                        className="w-full mt-2 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/10 active:scale-95 transition-all"
                      >
                        Kirim Order Ke Kasir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: DASHBOARD STATS */}
            {activeTab === 'dashboard' && (
              <div className="space-y-4 animate-fade-in flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <div>
                    <h4 className="font-bold text-white text-sm">Dashboard Analitik Eksekutif</h4>
                    <p className="text-[10px] text-slate-500">Agregasi performa toko real-time dari database</p>
                  </div>
                  
                  {/* Period Filter Buttons */}
                  <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                    {(['hari', 'minggu', 'bulan'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setDbFilter(filter)}
                        className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${
                          dbFilter === filter 
                            ? 'bg-blue-600 text-white shadow' 
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {filter === 'hari' ? 'Hari Ini' : filter === 'minggu' ? 'Minggu Ini' : 'Bulan Ini'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-900 relative overflow-hidden transition-all">
                    <p className="text-[8px] text-slate-500 font-extrabold uppercase tracking-wider">Omset Revenue</p>
                    <p className="text-base font-black text-white font-mono mt-1">{dbStats.revenue}</p>
                    <p className="text-[8px] text-emerald-500 font-semibold">{dbStats.badgeText}</p>
                  </div>
                  <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-900 relative overflow-hidden transition-all">
                    <p className="text-[8px] text-slate-500 font-extrabold uppercase tracking-wider">Total Order</p>
                    <p className="text-base font-black text-white font-mono mt-1">{dbStats.orders}</p>
                    <p className="text-[8px] text-emerald-500 font-semibold">{dbStats.orderBadgeText}</p>
                  </div>
                  <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-900 relative overflow-hidden transition-all col-span-2 sm:col-span-1">
                    <p className="text-[8px] text-slate-500 font-extrabold uppercase tracking-wider">Stok Kritis</p>
                    <p className="text-base font-black text-rose-500 font-mono mt-1">{dbStats.lowStock}</p>
                    <p className="text-[8px] text-rose-500 font-semibold">Tindakan Restock Diperlukan</p>
                  </div>
                </div>

                {/* SVG Chart updates based on selected period */}
                <div className="bg-slate-950/50 border border-slate-900 p-4 rounded-xl flex-1 flex flex-col justify-between min-h-[140px]">
                  <div className="w-full h-[100px] relative">
                    <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                      <path
                        d={dbStats.chartPath}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="3"
                        className="transition-all duration-700 ease-in-out"
                      />
                    </svg>
                  </div>
                  <p className="text-[8px] font-mono text-center text-slate-500 pt-2 border-t border-slate-900 uppercase tracking-wider">
                    Periode analisis saat ini: {dbFilter === 'hari' ? '7 Jam Terakhir' : dbFilter === 'minggu' ? '7 Hari Terakhir' : '4 Minggu Terakhir'}
                  </p>
                </div>
              </div>
            )}

            {/* TAB CONTENT: GUDANG (STOCKER) */}
            {activeTab === 'stocker' && (
              <div className="space-y-4 animate-fade-in flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <div>
                    <h4 className="font-bold text-white text-sm">Sistem Manajemen Stok & Gudang</h4>
                    <p className="text-[10px] text-slate-500">Pencatatan penyesuaian stok produk (Coba tombol Restock)</p>
                  </div>
                  
                  {/* Search Bar inside simulator */}
                  <div className="relative max-w-[150px] w-full">
                    <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Cari SKU..."
                      value={stockSearch}
                      onChange={(e) => setStockSearch(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-7 pr-2.5 py-1.5 text-[10px] text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-900 text-slate-500 font-bold">
                        <th className="pb-2">SKU</th>
                        <th className="pb-2">Nama Barang</th>
                        <th className="pb-2 text-center">Stok</th>
                        <th className="pb-2 text-center">Status</th>
                        <th className="pb-2 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60">
                      {filteredStockItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-600 font-medium">Produk tidak ditemukan</td>
                        </tr>
                      ) : (
                        filteredStockItems.map((prod) => (
                          <tr key={prod.sku} className="text-slate-300 group hover:bg-slate-900/10 transition-colors">
                            <td className="py-2.5 font-mono text-[10px]">{prod.sku}</td>
                            <td className="py-2.5 font-bold text-slate-200">{prod.name}</td>
                            <td className="py-2.5 text-center font-mono font-bold">{prod.stock} / {prod.maxStock}</td>
                            <td className="py-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase ${
                                prod.status === 'Kritis' 
                                  ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20' 
                                  : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                              }`}>
                                {prod.status}
                              </span>
                            </td>
                            <td className="py-2.5 text-right">
                              <button
                                onClick={() => restockItem(prod.sku)}
                                className="px-2 py-1 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 hover:border-blue-500 rounded text-[9px] font-bold transition-all"
                              >
                                Restock +50
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 border-t border-slate-900 px-6 relative bg-slate-950">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16 scroll-animate opacity-0 translate-y-12 transition-all duration-700 ease-out">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Dipercaya oleh Pemilik Usaha Ritel
            </h2>
            <p className="mt-4 text-slate-400 font-medium leading-relaxed">
              Lihat bagaimana KEPOS mengubah operasional kasir dan meningkatkan omset harian bisnis mereka.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((t, idx) => (
              <div 
                key={idx}
                className="scroll-animate opacity-0 translate-y-12 transition-all duration-700 ease-out p-8 rounded-2xl border border-slate-900 bg-slate-900/10 relative text-left"
                style={{ transitionDelay: `${idx * 150}ms` }}
              >
                <div className="absolute top-6 right-8 text-blue-500/10"><MessageSquare className="w-12 h-12" /></div>
                <p className="text-slate-300 italic text-sm leading-relaxed mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 border-t border-slate-900 pt-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/20 flex items-center justify-center font-black text-sm">
                    {t.initials}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs">{t.name}</h4>
                    <p className="text-[10px] text-slate-500 font-medium">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-24 border-t border-slate-900 px-6 relative bg-slate-950/40">
        <div className="max-w-4xl mx-auto text-left">
          <div className="text-center mb-16 scroll-animate opacity-0 translate-y-12 transition-all duration-700 ease-out">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="mt-4 text-slate-400 font-medium leading-relaxed">
              Informasi lengkap tentang cara kerja, integrasi, dan fitur-fitur teknis platform KEPOS.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="scroll-animate opacity-0 translate-y-12 transition-all duration-700 ease-out rounded-2xl border border-slate-900 bg-slate-900/20 overflow-hidden transition-all"
                style={{ transitionDelay: `${idx * 100}ms` }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-6 flex items-center justify-between text-left font-bold text-white text-sm sm:text-base hover:bg-slate-900/30 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown 
                    className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${
                      openFaq === idx ? 'transform rotate-180 text-blue-400' : ''
                    }`} 
                  />
                </button>
                <div 
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    openFaq === idx ? 'max-h-[200px] border-t border-slate-900' : 'max-h-0'
                  }`}
                >
                  <p className="p-6 text-xs sm:text-sm text-slate-400 leading-relaxed bg-slate-950/40">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Creator Showcase Section */}
      <section id="kreator" className="py-24 border-t border-slate-900 px-6 relative bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6 scroll-animate opacity-0 translate-y-12 transition-all duration-700 ease-out text-left">
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
              <div className="p-8 rounded-2xl border border-slate-900 bg-slate-900/10 backdrop-blur-sm max-w-md w-full relative text-left">
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
