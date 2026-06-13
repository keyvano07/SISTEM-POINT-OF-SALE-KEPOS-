'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';
import { 
  Search, Plus, Minus, Trash2, ShoppingBag, Utensils, 
  CalendarDays, Loader2, AlertCircle, X, CheckCircle, 
  ArrowRight, ShoppingCart, User, RefreshCw, Accessibility,
  ChevronRight, Heart, Sparkles, HelpCircle, Info, Monitor, Tablet as TabletIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  category_id: number;
  sku: string;
  barcode: string;
  name: string;
  description: string | null;
  sell_price: string;
  stock_quantity: number;
  available_stock: number;
  low_stock_threshold: number;
  is_active: boolean;
  image_url?: string | null;
  category?: Category;
}

interface KioskCustomization {
  size: 'Small' | 'Medium' | 'Large';
  sizePrice: number;
  bread: 'Wheat Roll' | 'White Roll' | 'Gluten Free';
  breadPrice: number;
  addOns: { name: string; price: number }[];
}

interface KioskCartItem {
  product: Product;
  quantity: number;
  customization: KioskCustomization;
  calculatedPrice: number;
}

interface CreatedDraft { 
  id: number; 
  queue_id: string; 
  order_type: 'dine_in' | 'take_away'; 
  table_number: string | null; 
  expires_at: string; 
}

export default function KioskPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  // Mode Tampilan: 'hp' (Vertikal 9:16) atau 'tablet' (Horizontal Landscape)
  const [viewMode, setViewMode] = useState<'hp' | 'tablet'>('hp');

  // Kiosk Session State
  const [sessionActive, setSessionActive] = useState(false);
  const [orderType, setOrderType] = useState<'dine_in' | 'take_away'>('dine_in');
  const [tableNumber, setTableNumber] = useState('');
  
  // Catalog Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cart State
  const [cart, setCart] = useState<KioskCartItem[]>([]);
  
  // Customization Modal
  const [customizeProduct, setCustomizeProduct] = useState<Product | null>(null);
  const [customSize, setCustomSize] = useState<'Small' | 'Medium' | 'Large'>('Small');
  const [customBread, setCustomBread] = useState<'Wheat Roll' | 'White Roll' | 'Gluten Free'>('White Roll');
  const [customAddOns, setCustomAddOns] = useState<{ name: string; price: number }[]>([]);

  // Accessibility State
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);

  // Review Order Drawer / Dialog (Used in Kiosk Mode)
  const [reviewOpen, setReviewOpen] = useState(false);

  // Order Submission State
  const [submitting, setSubmitting] = useState(false);
  const [successDraft, setSuccessDraft] = useState<CreatedDraft | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Kiosk does not require auth, so check login useEffect is removed

  // Load Products & Categories
  const loadCatalog = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        api.get('/kiosk/products'),
        api.get('/kiosk/categories')
      ]);

      if (prodRes.data.success) {
        const activeProds = (prodRes.data.data as Product[]).filter(p => p.is_active);
        setProducts(activeProds);
      }
      if (catRes.data.success) {
        setCategories(catRes.data.data);
      }
    } catch (err: any) {
      setError('Gagal memuat katalog menu. Silakan coba beberapa saat lagi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  // Reset Session
  const handleCancelSession = () => {
    setCart([]);
    setOrderType('dine_in');
    setTableNumber('');
    setSessionActive(false);
    setReviewOpen(false);
    setSuccessDraft(null);
  };

  // Start Session
  const handleStartSession = (type: 'dine_in' | 'take_away') => {
    setOrderType(type);
    setSessionActive(true);
  };

  // Open Customization Modal
  const handleProductClick = (product: Product) => {
    if (product.available_stock <= 0) return;
    setCustomizeProduct(product);
    setCustomSize('Small');
    setCustomBread('White Roll');
    setCustomAddOns([]);
  };

  // Toggle Add-on
  const handleToggleAddOn = (name: string, price: number) => {
    const exists = customAddOns.some(a => a.name === name);
    if (exists) {
      setCustomAddOns(customAddOns.filter(a => a.name !== name));
    } else {
      setCustomAddOns([...customAddOns, { name, price }]);
    }
  };

  // Calculate current customized unit price
  const calculateCustomizedPrice = () => {
    if (!customizeProduct) return 0;
    let base = parseFloat(customizeProduct.sell_price);
    if (customSize === 'Medium') base += 5000;
    if (customSize === 'Large') base += 10000;
    if (customBread === 'Gluten Free') base += 3000;
    const addonsTotal = customAddOns.reduce((sum, a) => sum + a.price, 0);
    return base + addonsTotal;
  };

  // Add to Kiosk Cart
  const handleAddToCart = () => {
    if (!customizeProduct) return;

    const calculatedPrice = calculateCustomizedPrice();
    const customization: KioskCustomization = {
      size: customSize,
      sizePrice: customSize === 'Small' ? 0 : (customSize === 'Medium' ? 5000 : 10000),
      bread: customBread,
      breadPrice: customBread === 'Gluten Free' ? 3000 : 0,
      addOns: customAddOns
    };

    const existingIndex = cart.findIndex(item => 
      item.product.id === customizeProduct.id &&
      item.customization.size === customSize &&
      item.customization.bread === customBread &&
      JSON.stringify(item.customization.addOns) === JSON.stringify(customAddOns)
    );

    if (existingIndex !== -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, {
        product: customizeProduct,
        quantity: 1,
        customization,
        calculatedPrice
      }]);
    }

    setCustomizeProduct(null);
  };

  // Update Kiosk item quantity
  const handleUpdateQty = (index: number, change: number) => {
    const updated = [...cart];
    const newQty = updated[index].quantity + change;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      const product = updated[index].product;
      if (change > 0) {
        const totalInCart = updated
          .filter(item => item.product.id === product.id)
          .reduce((sum, item) => sum + item.quantity, 0);
        
        if (totalInCart >= product.available_stock) {
          alert(`Stok tersedia untuk '${product.name}' hanya sisa ${product.available_stock} item.`);
          return;
        }
      }
      updated[index].quantity = newQty;
    }
    setCart(updated);
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.calculatedPrice * item.quantity), 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  // Submit Draft to Server
  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    if (orderType === 'dine_in' && !tableNumber.trim()) {
      setValidationError('Silakan masukkan nomor meja Anda.');
      return;
    }

    try {
      setSubmitting(true);
      setValidationError(null);

      const payloadItems = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.calculatedPrice,
        customizations: {
          size: item.customization.size,
          sizePrice: item.customization.sizePrice,
          bread: item.customization.bread,
          breadPrice: item.customization.breadPrice,
          addOns: item.customization.addOns
        }
      }));

      const response = await api.post('/kiosk/order-drafts', {
        order_type: orderType,
        table_number: orderType === 'dine_in' ? tableNumber : null,
        source: 'kiosk',
        items: payloadItems
      });

      if (response.data.success) {
        setSuccessDraft(response.data.data);
        setCart([]);
        setReviewOpen(false);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal mengirim pesanan. Silakan hubungi kasir.';
      setValidationError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategoryId === null || p.category_id === selectedCategoryId;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.barcode.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  // Toggle View Mode Floating Settings
  const renderModeToggle = () => (
    <div className="fixed top-4 right-4 z-50 flex items-center bg-zinc-900/95 border border-zinc-800 shadow-xl p-1.5 rounded-full backdrop-blur-sm transition-all hover:scale-105">
      <Button 
        variant={viewMode === 'hp' ? 'default' : 'ghost'} 
        size="sm"
        className={`rounded-full h-8 px-3 font-bold text-xs gap-1.5 flex ${viewMode === 'hp' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
        onClick={() => setViewMode('hp')}
      >
        <Monitor className="w-3.5 h-3.5" />
        Tampilan HP
      </Button>
      <Button 
        variant={viewMode === 'tablet' ? 'default' : 'ghost'} 
        size="sm"
        className={`rounded-full h-8 px-3 font-bold text-xs gap-1.5 flex ${viewMode === 'tablet' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
        onClick={() => setViewMode('tablet')}
      >
        <TabletIcon className="w-3.5 h-3.5" />
        Tampilan Tablet
      </Button>
    </div>
  );

  // Common Success Draft Voucher Modal Component
  const renderSuccessModal = () => (
    successDraft && (
      <Dialog open={true} onOpenChange={() => handleCancelSession()}>
        <DialogContent className="max-w-md p-6 bg-slate-950 border-zinc-800 text-white rounded-3xl">
          <DialogTitle className="hidden">Success Draft</DialogTitle>
          <DialogDescription className="hidden">Success Description</DialogDescription>
          <div className="flex flex-col items-center text-center space-y-5">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/30">
              <CheckCircle className="w-6 h-6 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black">Pesanan Berhasil Dikunci!</h2>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Silakan bawa tiket antrean di bawah ke Kasir untuk memproses pembayaran.
              </p>
            </div>

            {/* Voucher Ticket UI */}
            <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden shadow-2xl">
              <div className="absolute top-1/2 -left-3 w-6 h-6 bg-slate-950 rounded-full border border-zinc-800 transform -translate-y-1/2"></div>
              <div className="absolute top-1/2 -right-3 w-6 h-6 bg-slate-950 rounded-full border border-zinc-800 transform -translate-y-1/2"></div>
              
              <div className="flex flex-col items-center space-y-4">
                <div className="text-center">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">NOMOR ANTREAN / QUEUE ID</p>
                  <h3 className="text-2xl font-black font-mono text-amber-400 tracking-wider mt-1">
                    {successDraft.queue_id}
                  </h3>
                </div>

                {/* Barcode Simulator */}
                <div className="flex flex-col items-center space-y-1.5 py-1">
                  <div className="flex gap-[2px] items-center h-12 bg-white px-5 py-2.5 rounded-lg border border-zinc-700">
                    {Array.from({ length: 26 }).map((_, i) => (
                      <div 
                        key={i} 
                        className="bg-black h-full"
                        style={{ 
                          width: i % 3 === 0 ? '3px' : (i % 5 === 0 ? '1px' : '2px'),
                          opacity: i % 7 === 0 ? 0.3 : 1
                        }}
                      ></div>
                    ))}
                  </div>
                  <p className="text-[8px] text-zinc-400 font-mono tracking-widest">*{successDraft.queue_id}*</p>
                </div>

                <div className="w-full space-y-2 text-xs border-t border-zinc-800/80 pt-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Tipe Layanan:</span>
                    <span className="font-bold">{successDraft.order_type === 'dine_in' ? 'Makan Di Sini' : 'Bawa Pulang'}</span>
                  </div>
                  {successDraft.table_number && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Nomor Meja:</span>
                      <span className="font-extrabold text-amber-300">{successDraft.table_number}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Berlaku Hingga:</span>
                    <span className="text-rose-400 font-mono text-[10px]">
                      {new Date(successDraft.expires_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} (15 Menit)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => handleCancelSession()}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black h-12 rounded-xl text-sm"
            >
              Selesai & Buat Pesanan Baru
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  );

  // Common Customization Modal Component
  const renderCustomizationModal = () => (
    customizeProduct && (
      <Dialog open={true} onOpenChange={() => setCustomizeProduct(null)}>
        <DialogContent className="max-w-md p-6 bg-slate-900 rounded-3xl border border-zinc-800 text-white shadow-2xl">
          <DialogTitle className="hidden">Customize Product</DialogTitle>
          <DialogDescription className="hidden">Customize Product Description</DialogDescription>
          <div className="space-y-5">
            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-zinc-500">
                {customizeProduct.image_url ? (
                  <img src={customizeProduct.image_url} alt={customizeProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-black">{customizeProduct.name.substring(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div>
                <h3 className="font-black text-sm text-zinc-100">{customizeProduct.name}</h3>
                <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">{customizeProduct.description || 'Tidak ada deskripsi produk.'}</p>
                <span className="font-extrabold text-xs text-amber-400 font-mono block mt-1">
                  Harga dasar: Rp {parseFloat(customizeProduct.sell_price).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <Separator className="bg-zinc-800" />

            {/* Customization Options */}
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {/* 1. Size Selection */}
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">Pilih Ukuran (Size)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'Small', label: 'Small', extra: 0 },
                    { key: 'Medium', label: 'Medium', extra: 5000 },
                    { key: 'Large', label: 'Large', extra: 10000 },
                  ].map(opt => (
                    <div 
                      key={opt.key}
                      onClick={() => setCustomSize(opt.key as any)}
                      className={`cursor-pointer p-2.5 rounded-xl border text-center transition-all ${
                        customSize === opt.key 
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 font-bold' 
                          : 'border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <span className="text-xs block leading-none">{opt.label}</span>
                      <span className="text-[9px] text-zinc-400 mt-1 block">
                        {opt.extra === 0 ? 'Normal' : `+Rp ${opt.extra.toLocaleString('id-ID')}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Bread Modifier */}
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">Pilih Roti / Karbo</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'Wheat Roll', label: 'Gandum', extra: 0 },
                    { key: 'White Roll', label: 'Biasa', extra: 0 },
                    { key: 'Gluten Free', label: 'Gluten-Free', extra: 3000 },
                  ].map(opt => (
                    <div 
                      key={opt.key}
                      onClick={() => setCustomBread(opt.key as any)}
                      className={`cursor-pointer p-2.5 rounded-xl border text-center transition-all ${
                        customBread === opt.key 
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 font-bold' 
                          : 'border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <span className="text-xs block leading-none">{opt.label}</span>
                      <span className="text-[9px] text-zinc-400 mt-1 block">
                        {opt.extra === 0 ? 'Normal' : `+Rp ${opt.extra.toLocaleString('id-ID')}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Checkbox Add-ons */}
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">Ekstra Topping (Add-Ons)</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { name: 'Ekstra Keju', price: 3000 },
                    { name: 'Ekstra Daging (Double Meat)', price: 8000 },
                    { name: 'Ekstra Saus Spesial', price: 1500 },
                  ].map(addOn => {
                    const isChecked = customAddOns.some(a => a.name === addOn.name);
                    return (
                      <div 
                        key={addOn.name}
                        onClick={() => handleToggleAddOn(addOn.name, addOn.price)}
                        className={`cursor-pointer p-2.5 rounded-xl border flex justify-between items-center transition-all ${
                          isChecked 
                            ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 font-semibold' 
                            : 'border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <span className="text-xs">{addOn.name}</span>
                        <span className="text-[10px] font-mono text-zinc-400">
                          +Rp {addOn.price.toLocaleString('id-ID')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <Separator className="bg-zinc-800" />

            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[9px] text-zinc-400 font-bold animate-pulse">ESTIMASI HARGA</span>
                <span className="font-black text-base text-amber-400 font-mono">
                  Rp {calculateCustomizedPrice().toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex gap-2">
                <DialogClose asChild>
                  <Button variant="outline" className="h-10 text-xs font-bold rounded-xl px-4 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white bg-transparent">
                    Batal
                  </Button>
                </DialogClose>
                <Button 
                  onClick={handleAddToCart}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black h-10 text-xs rounded-xl px-5"
                >
                  Tambah
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  );

  // ==========================================
  // VIEW MODE 1: KIOSK MODE (Vertical 9:16)
  // ==========================================
  const renderKioskMode = () => {
    // Welcome Screen
    if (!sessionActive) {
      return (
        <div className={`w-full max-w-md min-h-[85vh] md:min-h-[90vh] flex flex-col justify-between items-center relative p-6 select-none overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-xl transition-all duration-300 ${
          highContrast ? 'text-white font-black' : 'bg-gradient-to-br from-indigo-950 via-slate-900 to-zinc-950 text-white'
        }`}>
          {/* Floating sparkles */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none"></div>

          {/* Top Header info */}
          <div className="w-full flex justify-between items-center z-10">
            <div className="flex items-center gap-2.5">
              <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-lg">
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              </div>
              <div>
                <h1 className="font-black tracking-wider text-sm font-sans leading-none">KEPOS <span className="text-amber-300">KIOSK</span></h1>
                <p className="text-[8px] text-white/70 font-mono uppercase tracking-widest mt-0.5">Self-Service</p>
              </div>
            </div>
            <Badge className="bg-white/10 text-white border-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm">
              TERMINAL #01
            </Badge>
          </div>

          {/* Hero Section */}
          <div className="flex flex-col items-center justify-center text-center space-y-6 my-auto z-10 w-full px-2">
            <div className="relative w-32 h-32 bg-white/5 border border-white/10 backdrop-blur-md rounded-full flex items-center justify-center shadow-2xl animate-pulse">
              <Utensils className="w-14 h-14 text-amber-300" />
            </div>
            
            <div className="space-y-2">
              <h2 className={`font-black tracking-tight font-sans leading-none ${largeText ? 'text-4xl' : 'text-3xl'}`}>
                Pesan Mudah & Cepat
              </h2>
              <p className={`text-white/80 leading-relaxed ${largeText ? 'text-lg' : 'text-xs'}`}>
                Pilih menu favorit Anda, kustomisasi sesuka hati, dan ambil struk antrean untuk pembayaran di Kasir.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 w-full pt-4 max-w-[320px]">
              <Card 
                onClick={() => handleStartSession('dine_in')}
                className={`cursor-pointer group border-zinc-800 hover:border-indigo-500/50 hover:scale-[1.03] transition-all duration-300 shadow-xl overflow-hidden bg-zinc-900/40 text-white`}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="bg-indigo-600 text-white p-2.5 rounded-full shadow-lg group-hover:scale-110 transition-transform shrink-0">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-extrabold text-sm">Makan Di Sini</h3>
                    <p className="text-[8px] text-zinc-400 font-semibold uppercase tracking-wider mt-0.5">Dine In</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 ml-auto group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </CardContent>
              </Card>

              <Card 
                onClick={() => handleStartSession('take_away')}
                className={`cursor-pointer group border-zinc-800 hover:border-indigo-500/50 hover:scale-[1.03] transition-all duration-300 shadow-xl overflow-hidden bg-zinc-900/40 text-white`}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="bg-indigo-600 text-white p-2.5 rounded-full shadow-lg group-hover:scale-110 transition-transform shrink-0">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-extrabold text-sm">Bawa Pulang</h3>
                    <p className="text-[8px] text-zinc-400 font-semibold uppercase tracking-wider mt-0.5">Take Away</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 ml-auto group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Accessibility Panel Bottom */}
          <div className="w-full flex justify-between items-center z-10 border-t border-white/15 pt-4">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setHighContrast(!highContrast)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 font-bold text-[10px] h-7 px-2.5"
              >
                <Accessibility className="w-3.5 h-3.5 mr-1" />
                Kontras
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLargeText(!largeText)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 font-bold text-[10px] h-7 px-2.5"
              >
                Teks Besar
              </Button>
            </div>
            <span className="text-[8px] text-white/50 font-mono">v1.2.0-kiosk</span>
          </div>

          {renderSuccessModal()}
        </div>
      );
    }

    // Catalog Screen in Kiosk Mode
    return (
      <div className={`w-full max-w-md min-h-[85vh] md:min-h-[90vh] flex flex-col justify-between relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl text-white`}>
        {/* Header */}
        <header className="border-b border-zinc-800 bg-slate-900 px-4 py-3 flex justify-between items-center sticky top-0 z-20 text-white">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-extrabold text-xs tracking-wide">KEPOS Kiosk</h1>
              <p className="text-[8px] text-zinc-400 font-mono uppercase tracking-wider">
                {orderType === 'dine_in' ? "Dine In" : "Take Away"}
              </p>
            </div>
          </div>

          <div className="relative max-w-[140px] w-full">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-500" />
            <Input 
              placeholder="Cari..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-7 text-[10px] rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-indigo-500/20"
            />
          </div>

          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCancelSession}
            className="text-[10px] font-bold rounded-lg h-7 px-2.5 border-zinc-850 hover:bg-zinc-800 text-zinc-300 bg-transparent"
          >
            Batal
          </Button>
        </header>

        {/* Categories Pills */}
        <div className="px-4 py-2 border-b border-zinc-800 bg-slate-900/50 flex gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
          <Button 
            size="sm" 
            onClick={() => setSelectedCategoryId(null)} 
            className={`whitespace-nowrap text-[10px] rounded-lg font-bold h-7 px-2.5 shrink-0 ${
              selectedCategoryId === null 
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                : 'bg-zinc-900/60 border border-zinc-800 text-zinc-450 hover:text-zinc-200'
            }`}
          >
            Semua
          </Button>
          {categories.map(cat => (
            <Button 
              key={cat.id} 
              size="sm" 
              onClick={() => setSelectedCategoryId(cat.id)} 
              className={`whitespace-nowrap text-[10px] rounded-lg font-bold h-7 px-2.5 shrink-0 ${
                selectedCategoryId === cat.id 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                  : 'bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {cat.name}
            </Button>
          ))}
        </div>

        {/* Catalog Menu Grid */}
        <ScrollArea className="flex-1 px-4 py-3">
          {loading ? (
            <div className="h-64 flex flex-col justify-center items-center gap-2">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="text-[10px] text-muted-foreground font-bold">Memuat menu...</span>
            </div>
          ) : error ? (
            <div className="p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="text-[10px] font-semibold">{error}</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="w-8 h-8 text-muted-foreground/30 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-muted-foreground">Tidak ada menu ditemukan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-16">
              {filteredProducts.map(product => {
                const isOutOfStock = product.available_stock <= 0;
                const isLowStock = !isOutOfStock && product.available_stock <= product.low_stock_threshold;
                const quantityInCart = cart
                  .filter(item => item.product.id === product.id)
                  .reduce((sum, item) => sum + item.quantity, 0);

                return (
                  <Card 
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className={`hover:border-indigo-500/40 bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800/80 transition-all duration-300 group flex flex-col justify-between overflow-hidden rounded-xl cursor-pointer ${
                      quantityInCart > 0 ? 'border-indigo-500/60 ring-1 ring-indigo-500/20 bg-indigo-500/[0.02]' : ''
                    } ${isOutOfStock ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <CardContent className="p-2.5 flex flex-col justify-between h-full space-y-2">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start">
                          <span className="text-[8px] text-indigo-400 font-mono bg-indigo-950/30 px-1.5 py-0.5 rounded border border-indigo-500/10">
                            {product.sku}
                          </span>
                          <div className="flex flex-col items-end gap-0.5">
                            {isOutOfStock && (
                              <Badge variant="destructive" className="text-[7px] px-1 py-0.1 font-bold uppercase rounded text-white bg-red-650">
                                Habis
                              </Badge>
                            )}
                            {isLowStock && (
                              <Badge className="bg-amber-500 text-white text-[7px] px-1 py-0.1 font-bold uppercase rounded">
                                Tipis ({product.available_stock})
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Product Image */}
                        <div className="w-full h-20 bg-zinc-950/80 border border-zinc-800/80 rounded-lg overflow-hidden flex items-center justify-center text-zinc-500 relative">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <span className="text-xs font-bold">{product.name.substring(0,2).toUpperCase()}</span>
                          )}
                        </div>

                        <h3 className="font-extrabold text-[11px] leading-tight text-zinc-150 line-clamp-2">
                          {product.name}
                        </h3>
                      </div>

                      <div className="flex justify-between items-center pt-0.5 border-t border-zinc-800/60">
                        <span className="font-black text-[10px] text-amber-400 font-mono">
                          Rp {parseFloat(product.sell_price).toLocaleString('id-ID')}
                        </span>
                        {quantityInCart > 0 ? (
                          <Badge className="bg-indigo-600 text-white text-[8px] font-bold rounded-full px-1.5 py-0.2">
                            {quantityInCart}
                          </Badge>
                        ) : (
                          <span className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline">+ Pilih</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Sticky Kiosk Footer Bar */}
        {cart.length > 0 && (
          <div className="p-3 bg-slate-900 border-t border-zinc-800 shadow-lg flex justify-between items-center rounded-t-2xl z-30">
            <div className="flex flex-col">
              <span className="text-[8px] text-zinc-400 font-black uppercase tracking-wider">TOTAL ({getCartItemCount()} Item)</span>
              <span className="font-black text-sm text-amber-400 font-mono">
                Rp {getCartTotal().toLocaleString('id-ID')}
              </span>
            </div>

            <Button 
              onClick={() => setReviewOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] px-4 rounded-xl h-9 shadow-md flex gap-1 items-center"
            >
              Tinjau Pesanan
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* Review Dialog in Kiosk Mode */}
        {reviewOpen && (
          <Dialog open={true} onOpenChange={setReviewOpen}>
            <DialogContent className="max-w-xs p-4 bg-slate-900 rounded-2xl border border-zinc-800 text-white flex flex-col max-h-[75vh]">
              <DialogTitle className="hidden">Review Order</DialogTitle>
              <DialogDescription className="hidden">Review Order Description</DialogDescription>
              <div className="space-y-3 flex flex-col flex-1 overflow-hidden">
                <div className="flex justify-between items-center">
                  <span className="font-black text-xs">Keranjang Belanja</span>
                  <Badge className="bg-indigo-950/40 text-indigo-400 border border-indigo-900/40 text-[8px] font-bold">
                    {orderType === 'dine_in' ? 'Dine In' : 'Take Away'}
                  </Badge>
                </div>

                <Separator className="bg-zinc-800" />

                <ScrollArea className="flex-1 pr-1">
                  <div className="space-y-2.5">
                    {cart.map((item, idx) => (
                      <div key={idx} className="p-2 bg-zinc-950/40 rounded-lg border border-zinc-850 text-[10px] space-y-1">
                        <h4 className="font-extrabold truncate">{item.product.name}</h4>
                        <p className="text-[8px] text-zinc-400">
                          Sz: {item.customization.size} | Rd: {item.customization.bread}
                        </p>
                        <div className="flex justify-between items-center mt-1 border-t border-zinc-800/40 pt-1">
                          <span className="text-amber-400 font-bold font-mono">
                            Rp {(item.calculatedPrice * item.quantity).toLocaleString('id-ID')}
                          </span>
                          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded p-0.5">
                            <button onClick={() => handleUpdateQty(idx, -1)} className="p-0.5 text-zinc-400 hover:text-white">
                              {item.quantity === 1 ? <Trash2 className="w-2.5 h-2.5 text-red-400" /> : <Minus className="w-2.5 h-2.5" />}
                            </button>
                            <span className="font-bold px-1 text-[9px] font-mono">{item.quantity}</span>
                            <button onClick={() => handleUpdateQty(idx, 1)} className="p-0.5 text-zinc-400 hover:text-white">
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Separator className="bg-zinc-800" />

                {orderType === 'dine_in' && (
                  <div className="space-y-1">
                    <label className="text-[8px] text-zinc-400 font-black uppercase">Nomor Meja</label>
                    <Input 
                      type="text" 
                      placeholder="Contoh: Meja 12"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      className="h-7 text-[10px] rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 focus-visible:ring-1 focus-visible:ring-indigo-500/20"
                    />
                  </div>
                )}

                {validationError && (
                  <div className="p-2 bg-rose-950/20 text-rose-450 text-[8px] rounded border border-rose-900/30 leading-normal font-semibold">
                    {validationError}
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold">Total:</span>
                    <span className="font-black text-amber-400 font-mono">Rp {getCartTotal().toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <Button variant="outline" onClick={() => setReviewOpen(false)} className="w-1/3 h-8 text-[10px] border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white">
                      Kembali
                    </Button>
                    <Button 
                      disabled={submitting}
                      onClick={handleSubmitOrder}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8 text-[10px]"
                    >
                      {submitting ? 'Mengirim...' : 'Simpan'}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {renderCustomizationModal()}
      </div>
    );
  };

  // ==========================================
  // VIEW MODE 2: TABLET MODE (Horizontal 16:9/16:10)
  // ==========================================
  const renderTabletMode = () => {
    // Welcome Screen
    if (!sessionActive) {
      return (
        <div className={`w-full max-w-5xl min-h-[75vh] md:min-h-[80vh] flex flex-col justify-between items-center relative p-8 select-none overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl transition-all duration-300 ${
          highContrast ? 'text-white font-black' : 'bg-gradient-to-br from-indigo-950 via-slate-900 to-zinc-950 text-white'
        }`}>
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none"></div>

          <div className="w-full flex justify-between items-center z-10">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-2xl border border-white/10 shadow-lg">
                <Sparkles className="w-6 h-6 text-amber-300 animate-bounce" />
              </div>
              <div>
                <h1 className="font-black tracking-wider text-lg font-sans leading-none">KEPOS <span className="text-amber-300">TABLET</span></h1>
                <p className="text-[10px] text-white/70 font-mono uppercase tracking-widest mt-1">Self-Service Counter Terminal</p>
              </div>
            </div>
            <Badge className="bg-white/10 text-white border-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
              TABLET STATION #02
            </Badge>
          </div>

          {/* Landscape Layout buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-4xl w-full my-auto z-10 px-4">
            <div className="space-y-4 text-left">
              <h2 className={`font-black tracking-tight font-sans leading-none ${largeText ? 'text-5xl' : 'text-4xl'}`}>
                Sentuh untuk Mulai Memesan
              </h2>
              <p className={`text-white/80 leading-relaxed max-w-md ${largeText ? 'text-xl' : 'text-sm'}`}>
                Nikmati kemudahan pesan langsung dari layar tablet. Kustomisasi pesanan Anda, kumpulkan antrean, dan bayar di kasir.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card 
                onClick={() => handleStartSession('dine_in')}
                className={`cursor-pointer group border-zinc-800 hover:border-indigo-500/50 hover:scale-[1.03] transition-all duration-300 shadow-xl overflow-hidden bg-zinc-900/40 text-white`}
              >
                <CardContent className="p-6 flex flex-col items-center justify-center space-y-4">
                  <div className="bg-indigo-600 text-white p-3.5 rounded-full shadow-lg group-hover:scale-110 transition-transform">
                    <Utensils className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-extrabold text-base">Makan Di Sini</h3>
                    <p className="text-[9px] text-zinc-400 font-semibold uppercase tracking-wider mt-1">Dine In</p>
                  </div>
                </CardContent>
              </Card>

              <Card 
                onClick={() => handleStartSession('take_away')}
                className={`cursor-pointer group border-zinc-800 hover:border-indigo-500/50 hover:scale-[1.03] transition-all duration-300 shadow-xl overflow-hidden bg-zinc-900/40 text-white`}
              >
                <CardContent className="p-6 flex flex-col items-center justify-center space-y-4">
                  <div className="bg-indigo-600 text-white p-3.5 rounded-full shadow-lg group-hover:scale-110 transition-transform">
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-extrabold text-base">Bawa Pulang</h3>
                    <p className="text-[9px] text-zinc-400 font-semibold uppercase tracking-wider mt-1">Take Away</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="w-full flex justify-between items-center z-10 border-t border-white/15 pt-4">
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setHighContrast(!highContrast)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 font-bold text-xs"
              >
                <Accessibility className="w-4 h-4 mr-2" />
                Kontras Tinggi
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLargeText(!largeText)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 font-bold text-xs"
              >
                Teks Besar
              </Button>
            </div>
            <span className="text-[10px] text-white/50 font-mono">v1.2.0-tablet</span>
          </div>

          {renderSuccessModal()}
        </div>
      );
    }

    // Catalog Screen in Tablet Mode (Landscape 3 columns layout: Left Sidebar, Middle Products Grid, Right Persistent Cart)
    return (
      <div className={`w-full max-w-[1200px] min-h-[75vh] md:min-h-[80vh] flex flex-col justify-between relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl text-white`}>
        
        {/* Top Mini Header */}
        <header className="border-b border-zinc-800 bg-slate-900 px-6 py-3 flex justify-between items-center sticky top-0 z-20 shrink-0 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-wide">KEPOS Tablet Station</h1>
              <p className="text-[9px] text-zinc-400 font-mono uppercase tracking-wider">
                {orderType === 'dine_in' ? 'Makan Di Sini' : 'Bawa Pulang'}
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative max-w-sm w-full mx-6">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
            <Input 
              placeholder="Cari makanan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-indigo-500/20"
            />
          </div>

          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCancelSession}
            className="text-xs font-bold rounded-xl h-8 px-4 border-zinc-800 hover:bg-zinc-800 text-zinc-350 bg-transparent"
          >
            Selesai / Batal
          </Button>
        </header>

        {/* 3-Column main area */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Column 1: Left Categories list (Width: 20%) */}
          <div className="w-[20%] border-r border-zinc-800 bg-slate-950 flex flex-col p-4 space-y-2 overflow-y-auto">
            <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider px-2 mb-1">Kategori Menu</span>
            <Button 
              size="sm" 
              onClick={() => setSelectedCategoryId(null)} 
              className={`justify-start text-left font-bold text-xs rounded-xl h-10 px-4 w-full ${
                selectedCategoryId === null 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                  : 'bg-zinc-900/40 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Semua Menu
            </Button>
            {categories.map(cat => (
              <Button 
                key={cat.id} 
                size="sm" 
                onClick={() => setSelectedCategoryId(cat.id)} 
                className={`justify-start text-left font-bold text-xs rounded-xl h-10 px-4 w-full ${
                  selectedCategoryId === cat.id 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                    : 'bg-zinc-900/40 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cat.name}
              </Button>
            ))}
          </div>

          {/* Column 2: Middle Catalog Products Grid (Width: 52%) */}
          <div className="w-[52%] flex flex-col p-5 bg-slate-950/60 overflow-y-auto">
            {loading ? (
              <div className="m-auto flex flex-col justify-center items-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <span className="text-xs text-zinc-400 font-bold">Memuat daftar menu...</span>
              </div>
            ) : error ? (
              <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-2xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-xs font-semibold">{error}</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="m-auto text-center space-y-2">
                <ShoppingBag className="w-10 h-10 text-zinc-650 mx-auto" />
                <p className="text-sm font-bold text-zinc-400">Tidak ada menu yang cocok.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredProducts.map(product => {
                  const isOutOfStock = product.available_stock <= 0;
                  const isLowStock = !isOutOfStock && product.available_stock <= product.low_stock_threshold;
                  const quantityInCart = cart
                    .filter(item => item.product.id === product.id)
                    .reduce((sum, item) => sum + item.quantity, 0);

                  return (
                    <Card 
                      key={product.id}
                      onClick={() => handleProductClick(product)}
                      className={`hover:border-indigo-500/40 bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-805 transition-all duration-300 group flex flex-col justify-between overflow-hidden rounded-2xl cursor-pointer ${
                        quantityInCart > 0 ? 'border-indigo-500/60 ring-1 ring-indigo-500/20 bg-indigo-500/[0.02]' : ''
                      } ${isOutOfStock ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-3">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] text-indigo-400 font-mono bg-indigo-950/30 px-1.5 py-0.5 rounded border border-indigo-500/10">
                              {product.sku}
                            </span>
                            <div className="flex flex-col items-end gap-1">
                              {isOutOfStock && (
                                <Badge variant="destructive" className="text-[8px] px-1.5 py-0.5 rounded font-extrabold uppercase text-white bg-red-650">
                                  Habis
                                </Badge>
                              )}
                              {isLowStock && (
                                <Badge className="bg-amber-500 text-white text-[8px] px-1.5 py-0.5 rounded font-extrabold uppercase">
                                  Tipis ({product.available_stock})
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Product Image */}
                          <div className="w-full h-24 bg-zinc-950/80 border border-zinc-800/80 rounded-xl overflow-hidden flex items-center justify-center text-zinc-500 relative">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <span className="text-sm font-black tracking-widest">{product.name.substring(0,2).toUpperCase()}</span>
                            )}
                          </div>

                          <h3 className="font-extrabold text-xs text-zinc-150 line-clamp-2 leading-snug">
                            {product.name}
                          </h3>
                        </div>

                        <div className="flex justify-between items-center pt-1.5 border-t border-zinc-800/60">
                          <span className="font-black text-xs text-amber-400 font-mono">
                            Rp {parseFloat(product.sell_price).toLocaleString('id-ID')}
                          </span>
                          
                          {quantityInCart > 0 ? (
                            <Badge className="bg-indigo-600 text-white text-[9px] font-bold rounded-full px-2 py-0.5">
                              {quantityInCart} Dipilih
                            </Badge>
                          ) : (
                            <Button size="sm" variant="outline" disabled={isOutOfStock} className="h-7 text-[10px] rounded-lg font-bold border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white bg-transparent">
                              + Pilih
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column 3: Right Persistent Cart / Checkout (Width: 28%) */}
          <div className="w-[28%] border-l border-zinc-800 bg-slate-950 flex flex-col justify-between p-4 overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden space-y-4">
              
              {/* Cart Header */}
              <div className="flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-indigo-400" />
                  <span className="font-black text-xs text-zinc-100">Keranjang Belanja</span>
                </div>
                <Badge className="bg-indigo-955 text-indigo-400 border border-indigo-900/40 text-[9px] font-bold">
                  {getCartItemCount()} Item
                </Badge>
              </div>

              <Separator className="bg-zinc-805" />

              {/* Cart Scroll list */}
              <ScrollArea className="flex-1 pr-1">
                {cart.length === 0 ? (
                  <div className="text-center py-16 text-zinc-500">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-zinc-700 animate-pulse" />
                    <p className="text-xs font-semibold">Keranjang Kosong</p>
                    <p className="text-[10px] mt-1 max-w-[130px] mx-auto text-zinc-500">Pilih menu dari katalog di sebelah kiri.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item, idx) => (
                      <div key={idx} className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-850 text-xs shadow-sm space-y-2 text-white">
                        <div>
                          <h4 className="font-extrabold leading-snug">{item.product.name}</h4>
                          <p className="text-[9px] text-zinc-400 mt-0.5">
                            Ukuran: {item.customization.size} | Roti: {item.customization.bread}
                          </p>
                          {item.customization.addOns.length > 0 && (
                            <p className="text-[9px] text-zinc-500 mt-0.5">
                              + {item.customization.addOns.map(a => a.name).join(', ')}
                            </p>
                          )}
                        </div>

                        <div className="flex justify-between items-center pt-1 border-t border-zinc-800/60">
                          <span className="text-amber-400 font-black font-mono">
                            Rp {(item.calculatedPrice * item.quantity).toLocaleString('id-ID')}
                          </span>
                          
                          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                            <button onClick={() => handleUpdateQty(idx, -1)} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white">
                              {item.quantity === 1 ? <Trash2 className="w-3 h-3 text-red-400" /> : <Minus className="w-3 h-3" />}
                            </button>
                            <span className="text-xs font-bold font-mono px-1">{item.quantity}</span>
                            <button onClick={() => handleUpdateQty(idx, 1)} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Table number inputs if Dine-In */}
              {orderType === 'dine_in' && cart.length > 0 && (
                <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-2xl border border-zinc-850 shrink-0">
                  <label className="text-[9px] text-zinc-450 font-black uppercase tracking-wider">Masukkan Nomor Meja Makan</label>
                  <Input 
                    type="text" 
                    placeholder="Contoh: Meja 12"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="h-8 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus-visible:ring-1 focus-visible:ring-indigo-500/20"
                  />
                </div>
              )}

              {validationError && (
                <div className="p-2.5 bg-rose-955/20 border border-rose-900/30 text-rose-400 rounded-xl text-[10px] font-semibold shrink-0">
                  {validationError}
                </div>
              )}
            </div>

            {/* Persistent Checkout Summary */}
            {cart.length > 0 && (
              <div className="pt-4 border-t border-zinc-805 space-y-3 shrink-0">
                <div className="flex justify-between items-end">
                  <span className="text-xs text-zinc-400 font-extrabold uppercase">Total Belanja</span>
                  <span className="font-black text-base text-amber-400 font-mono">
                    Rp {getCartTotal().toLocaleString('id-ID')}
                  </span>
                </div>

                <Button 
                  disabled={submitting}
                  onClick={handleSubmitOrder}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black h-11 text-xs rounded-xl flex gap-2 items-center justify-center shadow-lg"
                >
                  {submitting ? 'Mengirim...' : 'Konfirmasi & Kirim'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

        </div>

        {renderCustomizationModal()}
      </div>
    );
  };

  // Main wrapper for both View Modes
  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 relative ${
      highContrast ? 'bg-black text-white' : 'bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-zinc-950 text-foreground'
    }`}>
      {/* View Mode Switching controls */}
      {renderModeToggle()}

      {/* Actual page views rendering based on active option */}
      {viewMode === 'hp' ? renderKioskMode() : renderTabletMode()}
    </div>
  );
}
