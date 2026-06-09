'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore, Product, Category } from '@/store/useCartStore';
import api from '@/services/api';
import { 
  LogOut, ClipboardList, Shield, Search, 
  Plus, Minus, Trash2, ShoppingBag, 
  Utensils, CalendarDays, Loader2, AlertCircle, X, CheckCircle 
} from 'lucide-react';

interface OrderDraftItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

interface CreatedDraft {
  id: number;
  queue_id: string;
  order_type: 'dine_in' | 'take_away';
  table_number: string | null;
  expires_at: string;
  items?: OrderDraftItem[];
}

export default function PramuniagaPage() {
  const router = useRouter();
  const { user, clearAuth, token } = useAuthStore();
  
  // Cart state from Zustand
  const { 
    items: cartItems, 
    orderType, 
    tableNumber, 
    addItem, 
    removeItem, 
    updateQuantity, 
    clearCart, 
    setOrderType, 
    setTableNumber,
    getSubtotal
  } = useCartStore();

  const [isHydrated, setIsHydrated] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null); // null means All

  // Submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdDraft, setCreatedDraft] = useState<CreatedDraft | null>(null); // For Queue ID modal

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated && !token) {
      router.push('/login');
    } else if (isHydrated && token) {
      fetchData();
    }
  }, [token, router, isHydrated]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories')
      ]);
      
      // Filter only active products
      const activeProducts = (prodRes.data.data || []).filter((p: Product) => p.is_active);
      setProducts(activeProducts);
      setCategories(catRes.data.data || []);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data menu dari server.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout request failed', e);
    } finally {
      document.cookie = 'pos_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      clearAuth();
      clearCart();
      router.push('/login');
    }
  };

  const handleSubmitDraft = async () => {
    if (cartItems.length === 0) return;
    if (orderType === 'dine_in' && !tableNumber.trim()) {
      setSubmitError('Nomor meja harus diisi untuk pesanan dine-in.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      order_type: orderType,
      table_number: orderType === 'dine_in' ? tableNumber : null,
      items: cartItems.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity
      }))
    };

    try {
      const response = await api.post('/order-drafts', payload);
      if (response.data.success) {
        setCreatedDraft(response.data.data);
        clearCart();
      } else {
        setSubmitError(response.data.message || 'Gagal menyimpan draf pesanan.');
      }
    } catch (err) {
      console.error(err);
      let msg = 'Terjadi kesalahan saat menghubungi server.';
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string } } }).response;
        if (response?.data?.message) {
          msg = response.data.message;
        }
      }
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter products based on search query and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.barcode.includes(searchQuery);
    const matchesCategory = selectedCategoryId === null || product.category_id === selectedCategoryId;
    return matchesSearch && matchesCategory;
  });

  if (!isHydrated || !user) return null;

  return (
    <div className="min-h-screen bg-background text-on-background font-sans flex flex-col selection:bg-violet-500/30 selection:text-white">
      {/* Top Navbar */}
      <nav className="border-b border-outline-variant px-6 py-4 flex justify-between items-center bg-surface-container-lowest shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/10">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-wide bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">KEPOS Tablet</h1>
            <p className="text-[10px] text-primary font-semibold uppercase tracking-wider">Modul Pramuniaga</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 bg-surface-container border border-outline-variant px-4 py-1.5 rounded-2xl">
            <Shield className="w-4 h-4 text-primary" />
            <div className="text-left">
              <p className="text-xs font-semibold leading-tight">{user.name}</p>
              <p className="text-[10px] text-on-surface-variant capitalize leading-tight">{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3.5 py-1.5 h-9 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition-all active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </nav>

      {/* Main Workspace Layout (Two-Pane) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Pane: Product Catalog */}
        <main className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
          
          {/* Search and Filters Card */}
          <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-3xl shadow-xl space-y-4">
            
            {/* Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-on-surface-variant" />
              </span>
              <input
                type="text"
                placeholder="Cari menu, SKU, atau barcode produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 h-11 bg-surface-container border border-outline-variant rounded-xl text-white placeholder-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-on-surface-variant hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap active:scale-95 ${
                  selectedCategoryId === null
                    ? 'bg-primary border-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/25'
                    : 'bg-surface-container border-outline-variant text-on-surface-variant hover:text-white hover:border-outline-variant'
                }`}
              >
                Semua Menu
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap active:scale-95 ${
                    selectedCategoryId === cat.id
                      ? 'bg-primary border-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/25'
                      : 'bg-surface-container border-outline-variant text-on-surface-variant hover:text-white hover:border-outline-variant'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

          </div>

          {/* Product Grid Area */}
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-24 text-on-surface-variant gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <span className="text-sm">Memuat daftar menu...</span>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center py-24 text-rose-400 font-semibold gap-3 text-center border border-dashed border-rose-500/20 rounded-3xl bg-rose-500/5">
              <AlertCircle className="w-8 h-8" />
              <span>{error}</span>
              <button onClick={fetchData} className="px-4 py-2.5 text-xs bg-surface-container-lowest border border-outline-variant text-white rounded-xl hover:bg-surface-container-high transition-all mt-2">Coba Lagi</button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-24 text-on-surface-variant border border-dashed border-outline-variant rounded-3xl">
              <ShoppingBag className="w-10 h-10 mb-2 text-slate-600" />
              <span className="text-sm">Tidak ada menu yang sesuai pencarian.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.map(product => {
                const isOutOfStock = product.stock_quantity <= 0;
                const isLowStock = !isOutOfStock && product.stock_quantity <= product.low_stock_threshold;
                
                return (
                  <div 
                    key={product.id}
                    className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-4 flex flex-col justify-between shadow-md hover:-translate-y-1 hover:border-[#7C3AED]/30 hover:shadow-lg hover:shadow-[#7C3AED]/5 transition-all duration-200 cubic-bezier(0.4, 0, 0.2, 1) group relative overflow-hidden"
                  >
                    <div>
                      {/* Low stock indicators */}
                      {isOutOfStock ? (
                        <span className="absolute top-2 right-2 px-2 py-0.5 text-[9px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full">Habis</span>
                      ) : isLowStock ? (
                        <span className="absolute top-2 right-2 px-2 py-0.5 text-[9px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full">Stok Tipis ({product.stock_quantity})</span>
                      ) : null}

                      <span className="text-[10px] text-primary font-mono tracking-tight block">{product.sku}</span>
                      <h3 className="font-bold text-sm text-on-surface mt-1.5 leading-snug group-hover:text-white transition-colors">{product.name}</h3>
                      {product.category && (
                        <span className="text-[10px] text-on-surface-variant mt-0.5 block">{product.category.name}</span>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-outline-variant">
                      <span className="font-bold text-emerald-600 text-sm font-mono">
                        Rp {parseFloat(product.sell_price).toLocaleString('id-ID')}
                      </span>
                      
                      <button
                        onClick={() => addItem(product)}
                        disabled={isOutOfStock}
                        className={`h-10 px-4 rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm transition-all active:scale-95 ${
                          isOutOfStock
                            ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
                            : 'bg-primary hover:bg-primary/95 text-white shadow-[#7C3AED]/10'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Pilih</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </main>

        {/* Right Pane: Cart & Settings */}
        <aside className="w-[380px] bg-surface-container-lowest border-l border-outline-variant flex flex-col justify-between shadow-2xl relative z-20">
          
          {/* Cart Header */}
          <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface-container/30">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-sm">Keranjang Pesanan</h2>
            </div>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-primary/10 border border-[#7C3AED]/20 text-primary rounded-full font-mono">
              {cartItems.reduce((sum, item) => sum + item.quantity, 0)} item
            </span>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3.5 scrollbar-thin">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-on-surface-variant text-center py-16">
                <ShoppingBag className="w-12 h-12 mb-3 text-slate-600 animate-bounce" />
                <p className="text-sm font-semibold text-on-surface-variant">Keranjang Kosong</p>
                <p className="text-xs text-on-surface-variant mt-1 max-w-[200px]">Pilih menu di sebelah kiri untuk ditambahkan.</p>
              </div>
            ) : (
              cartItems.map(item => (
                <div 
                  key={item.product.id}
                  className="bg-surface-container border border-outline-variant rounded-2xl p-3.5 flex justify-between gap-3 shadow-inner"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs text-on-surface leading-normal truncate">{item.product.name}</h4>
                    <span className="text-[10px] text-on-surface-variant font-mono block mt-0.5">Rp {parseFloat(item.product.sell_price).toLocaleString('id-ID')} / pcs</span>
                    <span className="font-extrabold text-xs text-emerald-450 font-mono block mt-1">
                      Rp {(parseFloat(item.product.sell_price) * item.quantity).toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="flex flex-col items-end justify-between gap-2.5">
                    {/* Delete button */}
                    <button 
                      onClick={() => removeItem(item.product.id)}
                      className="text-on-surface-variant hover:text-rose-400 w-9 h-9 flex items-center justify-center rounded-lg hover:bg-rose-500/10 transition-colors active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Qty Adjustment */}
                    <div className="flex items-center bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden p-0.5">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-9 h-9 flex items-center justify-center hover:bg-surface-container-high text-on-surface-variant hover:text-white rounded-lg transition-colors active:scale-95"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold font-mono text-on-surface">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-9 h-9 flex items-center justify-center hover:bg-surface-container-high text-on-surface-variant hover:text-white rounded-lg transition-colors active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Settings & Action Panel */}
          <div className="p-5 border-t border-outline-variant bg-surface-container/50 space-y-4">
            
            {/* Tipe Order Toggle */}
            <div className="space-y-2">
              <label className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Tipe Pesanan</label>
              <div className="grid grid-cols-2 gap-2 bg-surface-container p-1 rounded-2xl border border-outline-variant">
                <button
                  onClick={() => setOrderType('dine_in')}
                  className={`flex items-center justify-center gap-1.5 h-11 rounded-xl text-xs font-bold transition-all active:scale-[0.97] ${
                    orderType === 'dine_in'
                      ? 'bg-primary text-white shadow-md shadow-primary/10'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5" />
                  <span>Dine In</span>
                </button>
                <button
                  onClick={() => setOrderType('take_away')}
                  className={`flex items-center justify-center gap-1.5 h-11 rounded-xl text-xs font-bold transition-all active:scale-[0.97] ${
                    orderType === 'take_away'
                      ? 'bg-primary text-white shadow-md shadow-primary/10'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Take Away</span>
                </button>
              </div>
            </div>

            {/* Table Number Input for Dine In */}
            {orderType === 'dine_in' && (
              <div className="space-y-2 animate-fadeIn">
                <label className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Nomor Meja</label>
                <input
                  type="text"
                  placeholder="Contoh: Meja 04, Meja 10..."
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full h-11 px-4 bg-surface-container border border-outline-variant rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-xs"
                />
              </div>
            )}

            {/* Submit Error Message */}
            {submitError && (
              <div className="flex items-start gap-2 p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="font-medium leading-tight">{submitError}</span>
              </div>
            )}

            {/* Subtotal Display */}
            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Subtotal</span>
              <span className="font-extrabold text-lg text-emerald-600 font-mono">
                Rp {getSubtotal().toLocaleString('id-ID')}
              </span>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitDraft}
              disabled={cartItems.length === 0 || isSubmitting || (orderType === 'dine_in' && !tableNumber.trim())}
              className={`w-full h-12 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${
                cartItems.length === 0 || isSubmitting || (orderType === 'dine_in' && !tableNumber.trim())
                  ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed shadow-none'
                  : 'bg-primary hover:bg-primary/95 text-white shadow-[#7C3AED]/10'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan Draf...</span>
                </>
              ) : (
                <span>Simpan Draf Pesanan</span>
              )}
            </button>

          </div>

        </aside>

      </div>

      {/* SUCCESS MODAL: Show Queue ID */}
      {createdDraft && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl w-full max-w-md p-8 text-center shadow-2xl space-y-6">
            
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/25">
                <CheckCircle className="w-10 h-10 animate-bounce" />
              </div>
              <h2 className="text-xl font-black text-white">Draf Pesanan Tersimpan!</h2>
              <p className="text-xs text-on-surface-variant">Silakan berikan nomor antrean berikut kepada kasir.</p>
            </div>

            {/* Queue ID Box */}
            <div className="bg-surface-container border border-outline-variant rounded-2xl p-5 shadow-inner">
              <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Nomor Antrean</p>
              <h3 className="text-3xl font-black tracking-widest text-[#7C3AED] font-mono mt-1 select-all">{createdDraft.queue_id}</h3>
            </div>

            {/* Order Details Summary */}
            <div className="bg-surface-container-high border border-outline-variant/80 rounded-2xl p-4 text-left text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Tipe Pesanan:</span>
                <span className="font-semibold text-on-surface capitalize">
                  {createdDraft.order_type === 'dine_in' ? 'Makan Di Tempat (Dine-In)' : 'Bawa Pulang (Take-Away)'}
                </span>
              </div>
              {createdDraft.order_type === 'dine_in' && (
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Nomor Meja:</span>
                  <span className="font-semibold text-on-surface">{createdDraft.table_number}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Masa Berlaku:</span>
                <span className="font-semibold text-amber-400">2 Jam (s/d {new Date(createdDraft.expires_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})})</span>
              </div>
              <div className="flex justify-between border-t border-outline-variant pt-2.5 font-bold text-sm">
                <span className="text-on-surface-variant">Estimasi Subtotal:</span>
                <span className="text-emerald-600 font-mono">
                  Rp {createdDraft.items?.reduce((sum: number, item: OrderDraftItem) => sum + parseFloat(item.subtotal), 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Acknowledge Button */}
            <button
              onClick={() => setCreatedDraft(null)}
              className="w-full h-12 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl shadow-lg shadow-primary/10 transition-all active:scale-[0.98]"
            >
              Selesai & Buat Pesanan Baru
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
