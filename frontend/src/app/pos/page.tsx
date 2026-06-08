'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useShiftStore } from '@/store/useShiftStore';
import api from '@/services/api';
import {
  LogOut, ShoppingCart, Shield, DollarSign,
  Loader2, Clock, AlertTriangle, CheckCircle, X,
  Wallet, CreditCard, Search, Plus, Minus, Trash2,
  Lock, Unlock, RefreshCw, ShoppingBag, ClipboardList
} from 'lucide-react';

interface Product {
  id: number;
  category_id: number;
  sku: string;
  barcode: string;
  name: string;
  sell_price: string;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  category?: { id: number; name: string };
}

interface Category {
  id: number;
  name: string;
}

interface OrderDraftItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: string;
  subtotal: string;
  product?: Product;
}

interface OrderDraft {
  id: number;
  queue_id: string;
  order_type: 'dine_in' | 'take_away';
  table_number: string | null;
  status: 'pending' | 'locked' | 'completed' | 'expired';
  expires_at: string;
  items?: OrderDraftItem[];
  creator?: { id: number; name: string };
}

interface PosCartItem {
  product: Product;
  quantity: number;
}

export default function PosPage() {
  const router = useRouter();
  const { user, clearAuth, token } = useAuthStore();
  const { activeShift, isLoading: shiftLoading, fetchActiveShift, openShift, closeShift } = useShiftStore();

  const [isHydrated, setIsHydrated] = useState(false);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState('');
  const [physicalCashInput, setPhysicalCashInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Catalog State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // Cart State
  const [cartItems, setCartItems] = useState<PosCartItem[]>([]);
  const [orderType, setOrderType] = useState<'dine_in' | 'take_away'>('dine_in');
  const [tableNumber, setTableNumber] = useState('');

  // Draft pulling state
  const [draftsList, setDraftsList] = useState<OrderDraft[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<OrderDraft | null>(null);
  const [isDraftLocked, setIsDraftLocked] = useState(false);

  // Supervisor PIN unlock modal
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPin, setUnlockPin] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated && !token) {
      router.push('/login');
    }
  }, [token, router, isHydrated]);

  // Fetch active shift on mount
  useEffect(() => {
    if (isHydrated && token) {
      fetchActiveShift();
    }
  }, [isHydrated, token, fetchActiveShift]);

  // Auto-show open shift modal if no active shift
  useEffect(() => {
    if (isHydrated && !shiftLoading && !activeShift && token) {
      setShowOpenShiftModal(true);
    }
  }, [isHydrated, shiftLoading, activeShift, token]);

  // Fetch Catalog & Drafts when shift is active
  useEffect(() => {
    if (isHydrated && token && activeShift) {
      fetchCatalog();
      fetchDrafts();
    }
  }, [isHydrated, token, activeShift]);

  const triggerAlert = useCallback((type: 'success' | 'error', text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 5000);
  }, []);

  const fetchCatalog = async () => {
    setLoadingProducts(true);
    setProductsError(null);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories')
      ]);
      const activeProducts = (prodRes.data.data || []).filter((p: Product) => p.is_active);
      setProducts(activeProducts);
      setCategories(catRes.data.data || []);
    } catch (err) {
      console.error(err);
      setProductsError('Gagal memuat katalog produk dari server.');
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchDrafts = async () => {
    setLoadingDrafts(true);
    try {
      const res = await api.get('/order-drafts');
      setDraftsList(res.data.data || []);
    } catch (err) {
      console.error('Gagal mengambil draft antrean:', err);
    } finally {
      setLoadingDrafts(false);
    }
  };

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(openingCashInput);
    if (isNaN(amount) || amount < 0) {
      triggerAlert('error', 'Jumlah modal awal tidak valid.');
      return;
    }
    setSubmitting(true);
    try {
      const shiftData = await openShift(amount);
      setShowOpenShiftModal(false);
      setOpeningCashInput('');
      triggerAlert('success', `Shift ${shiftData.shift_code} berhasil dibuka.`);
    } catch (err) {
      triggerAlert('error', (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(physicalCashInput);
    if (isNaN(amount) || amount < 0) {
      triggerAlert('error', 'Jumlah uang fisik tidak valid.');
      return;
    }
    setSubmitting(true);
    try {
      await closeShift(amount);
      setShowCloseShiftModal(false);
      setPhysicalCashInput('');
      // Clear auth and redirect to login
      document.cookie = 'pos_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      clearAuth();
      router.push('/login');
    } catch (err) {
      triggerAlert('error', (err as Error).message);
      setSubmitting(false);
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
      router.push('/login');
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  // Draft and Cart Syncing logic
  const syncCartToServer = async (updatedItems: PosCartItem[]) => {
    if (!selectedDraft || isDraftLocked) return;
    try {
      const payload = {
        items: updatedItems.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity
        }))
      };
      await api.put(`/order-drafts/${selectedDraft.id}`, payload);
    } catch (err) {
      console.error('Failed to sync cart changes to server draft:', err);
    }
  };

  const handleAddItem = (product: Product) => {
    if (isDraftLocked) {
      triggerAlert('error', 'Keranjang terkunci (Draft dari Pramuniaga). Silakan buka kunci terlebih dahulu.');
      return;
    }

    const existingIndex = cartItems.findIndex(item => item.product.id === product.id);
    let newItems: PosCartItem[] = [];

    if (existingIndex !== -1) {
      newItems = cartItems.map((item, idx) => 
        idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      newItems = [...cartItems, { product, quantity: 1 }];
    }

    setCartItems(newItems);
    syncCartToServer(newItems);
  };

  const handleRemoveItem = (productId: number) => {
    if (isDraftLocked) {
      triggerAlert('error', 'Keranjang terkunci (Draft dari Pramuniaga). Silakan buka kunci terlebih dahulu.');
      return;
    }

    const newItems = cartItems.filter(item => item.product.id !== productId);
    setCartItems(newItems);
    syncCartToServer(newItems);
  };

  const handleUpdateQuantity = (productId: number, newQty: number) => {
    if (isDraftLocked) {
      triggerAlert('error', 'Keranjang terkunci (Draft dari Pramuniaga). Silakan buka kunci terlebih dahulu.');
      return;
    }

    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    const newItems = cartItems.map(item => 
      item.product.id === productId ? { ...item, quantity: newQty } : item
    );
    setCartItems(newItems);
    syncCartToServer(newItems);
  };

  const handlePullDraft = async (draft: OrderDraft) => {
    setSubmitting(true);
    try {
      // 1. Lock the draft on server
      const lockRes = await api.post(`/order-drafts/${draft.id}/lock`);
      if (lockRes.data.success) {
        // 2. Fetch full detail to ensure we have all items
        const detailRes = await api.get(`/order-drafts/${draft.id}`);
        const fullDraft = detailRes.data.data;

        const itemsToLoad = (fullDraft.items || []).map((item: OrderDraftItem) => ({
          product: item.product!,
          quantity: item.quantity
        }));

        setCartItems(itemsToLoad);
        setOrderType(fullDraft.order_type);
        setTableNumber(fullDraft.table_number || '');
        setSelectedDraft(fullDraft);
        setIsDraftLocked(true);
        setShowDraftModal(false);
        triggerAlert('success', `Antrean ${fullDraft.queue_id} berhasil ditarik dan dikunci.`);
      } else {
        triggerAlert('error', lockRes.data.message || 'Gagal mengunci draf.');
      }
    } catch (err) {
      console.error(err);
      let errMsg = 'Gagal menarik draf pesanan.';
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string } } }).response;
        if (response?.data?.message) {
          errMsg = response.data.message;
        }
      }
      triggerAlert('error', errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlockDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDraft) return;
    setUnlocking(true);
    setUnlockError(null);
    try {
      const res = await api.post(`/order-drafts/${selectedDraft.id}/unlock`, {
        pin: unlockPin
      });
      if (res.data.success) {
        setIsDraftLocked(false);
        setShowUnlockModal(false);
        setUnlockPin('');
        triggerAlert('success', 'Kunci draf pesanan berhasil dibuka. Keranjang sekarang dapat diedit.');
      }
    } catch (err) {
      console.error(err);
      let errMsg = 'PIN otorisasi tidak valid.';
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string } } }).response;
        if (response?.data?.message) {
          errMsg = response.data.message;
        }
      }
      setUnlockError(errMsg);
    } finally {
      setUnlocking(false);
    }
  };

  const handleResetCart = () => {
    setCartItems([]);
    setOrderType('dine_in');
    setTableNumber('');
    setSelectedDraft(null);
    setIsDraftLocked(false);
    triggerAlert('success', 'Keranjang kasir berhasil di-reset.');
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const match = products.find(p => 
        p.barcode === searchQuery.trim() || 
        p.sku.toLowerCase() === searchQuery.trim().toLowerCase()
      );
      if (match) {
        handleAddItem(match);
        setSearchQuery('');
        triggerAlert('success', `Produk ${match.name} berhasil ditambahkan.`);
      }
    }
  };

  const getSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + parseFloat(item.product.sell_price) * item.quantity, 0);
  };

  const getTax = () => {
    return getSubtotal() * 0.11;
  };

  const getGrandTotal = () => {
    return getSubtotal() + getTax();
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
    <div className="min-h-screen bg-[#020617] text-white font-sans flex flex-col justify-between selection:bg-violet-500/35 selection:text-white">
      {/* Alert Toast */}
      {alertMsg && (
        <div className="fixed top-6 right-6 z-[60] animate-fadeIn">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border shadow-2xl backdrop-blur-md ${
            alertMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            {alertMsg.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
            <span className="text-xs font-semibold leading-none">{alertMsg.text}</span>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <nav className="border-b border-slate-800 px-6 py-4 flex justify-between items-center bg-[#0F172A] shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#7C3AED] rounded-xl shadow-lg shadow-[#7C3AED]/20">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-wide bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">POS Terminal</h1>
            {activeShift && (
              <span className="ml-3 text-xs font-mono font-bold text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-lg border border-violet-500/20">
                {activeShift.shift_code}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Shift Info */}
          {activeShift && (
            <div className="hidden md:flex items-center gap-2.5 px-4 py-1.5 rounded-xl bg-slate-800/40 border border-slate-850">
              <Wallet className="w-4 h-4 text-violet-400" />
              <span className="text-xs text-slate-400">Modal:</span>
              <span className="text-xs font-bold text-violet-400 font-mono">{formatCurrency(activeShift.opening_cash)}</span>
            </div>
          )}

          {/* User Info */}
          <div className="flex items-center gap-2.5 bg-slate-800/40 border border-slate-850 px-4 py-1.5 rounded-xl">
            <Shield className="w-4 h-4 text-violet-400" />
            <div className="text-left">
              <p className="text-xs font-semibold leading-tight">{user.name}</p>
              <p className="text-[10px] text-slate-400 capitalize leading-tight">{user.role}</p>
            </div>
          </div>

          {/* Close Shift Button */}
          {activeShift && (
            <button
              onClick={() => setShowCloseShiftModal(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 h-9 text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl transition-all active:scale-95"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Tutup Shift</span>
            </button>
          )}

          {/* Logout Button */}
          {!activeShift && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3.5 py-1.5 h-9 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition-all active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          )}
        </div>
      </nav>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col justify-start">
        {shiftLoading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-500 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-violet-500" />
            <span className="font-semibold text-sm">Memeriksa status shift...</span>
          </div>
        ) : !activeShift ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl">
              <AlertTriangle className="w-16 h-16 text-amber-400" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Shift Belum Dibuka</h2>
              <p className="text-slate-400 max-w-md text-sm">
                Anda harus membuka shift terlebih dahulu sebelum dapat melayani transaksi pelanggan. Masukkan jumlah modal awal laci kas untuk memulai.
              </p>
            </div>
            <button
              onClick={() => setShowOpenShiftModal(true)}
              className="flex items-center gap-3 px-8 py-4 text-base font-bold bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl shadow-xl shadow-[#7C3AED]/20 transition-all active:scale-[0.98]"
            >
              <DollarSign className="w-5 h-5" />
              <span>Buka Shift Sekarang</span>
            </button>
          </div>
        ) : (
          /* Active Shift - 3-Pane POS Layout */
          <div className="px-6 py-6 grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
            
            {/* COLUMN 1 & 2: Product Catalog & Search */}
            <div className="xl:col-span-2 bg-[#0F172A] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              
              {/* Search & Scan Box */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="w-5 h-5 text-slate-500" />
                </span>
                <input
                  type="text"
                  placeholder="Cari menu, SKU, atau scan barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyPress}
                  className="w-full pl-11 pr-4 h-11 bg-[#020617] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSelectedCategoryId(null)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap active:scale-95 ${
                    selectedCategoryId === null
                      ? 'bg-[#7C3AED] border-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/25'
                      : 'bg-[#020617] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  Semua
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap active:scale-95 ${
                      selectedCategoryId === cat.id
                        ? 'bg-[#7C3AED] border-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/25'
                        : 'bg-[#020617] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Products Catalog Grid */}
              {loadingProducts ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                  <span className="text-xs">Memuat katalog...</span>
                </div>
              ) : productsError ? (
                <div className="text-center py-12 text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4">
                  <p className="text-xs font-semibold">{productsError}</p>
                  <button onClick={fetchCatalog} className="mt-3 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs hover:bg-white/10">Coba Lagi</button>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p className="text-xs">Tidak ada menu yang sesuai pencarian.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[550px] overflow-y-auto pr-1 scrollbar-thin">
                  {filteredProducts.map(product => {
                    const isOutOfStock = product.stock_quantity <= 0;
                    const isLowStock = !isOutOfStock && product.stock_quantity <= product.low_stock_threshold;
                    
                    return (
                      <div 
                        key={product.id}
                        onClick={() => !isOutOfStock && handleAddItem(product)}
                        className={`bg-[#020617] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-md hover:-translate-y-1 hover:border-[#7C3AED]/30 hover:shadow-lg hover:shadow-[#7C3AED]/5 transition-all duration-200 cubic-bezier(0.4, 0, 0.2, 1) group relative cursor-pointer active:scale-98 overflow-hidden ${
                          isOutOfStock ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      >
                        <div>
                          {isOutOfStock ? (
                            <span className="absolute top-2 right-2 px-2 py-0.5 text-[9px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full">Habis</span>
                          ) : isLowStock ? (
                            <span className="absolute top-2 right-2 px-2 py-0.5 text-[9px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full">Stok {product.stock_quantity}</span>
                          ) : null}

                          <span className="text-[9px] text-violet-400 font-mono tracking-tight block">{product.sku}</span>
                          <h4 className="font-bold text-xs text-slate-200 mt-1.5 leading-snug group-hover:text-white transition-colors">{product.name}</h4>
                          {product.category && (
                            <span className="text-[9px] text-slate-400 block mt-0.5">{product.category.name}</span>
                          )}
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                          <span className="font-bold text-emerald-400 text-xs font-mono">
                            Rp {parseFloat(product.sell_price).toLocaleString('id-ID')}
                          </span>
                          <span className="p-1 bg-[#7C3AED]/10 rounded-lg group-hover:bg-[#7C3AED]/20 text-[#7C3AED] transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

            {/* COLUMN 3: Cart Items */}
            <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between" style={{ minHeight: '520px' }}>
              
              {/* Cart Header */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-violet-400" />
                  <h3 className="font-bold text-sm">Keranjang</h3>
                </div>
                <button
                  onClick={() => { fetchDrafts(); setShowDraftModal(true); }}
                  className="h-9 px-3.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-[#7C3AED]/15"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tarik Antrean</span>
                </button>
              </div>

              {/* Locked State Banner */}
              {selectedDraft && (
                <div className={`p-3 rounded-2xl flex items-center justify-between border ${
                  isDraftLocked 
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>
                  <div className="flex items-center gap-2">
                    {isDraftLocked ? <Lock className="w-4 h-4 flex-shrink-0" /> : <Unlock className="w-4 h-4 flex-shrink-0" />}
                    <div className="text-left">
                      <p className="text-xs font-bold font-mono leading-none">{selectedDraft.queue_id}</p>
                      <p className="text-[10px] text-slate-400 capitalize">
                        {isDraftLocked ? 'Antrean Terkunci' : 'Kunci Terbuka'} ({selectedDraft.order_type === 'dine_in' ? `Meja ${tableNumber}` : 'Take Away'})
                      </p>
                    </div>
                  </div>
                  {isDraftLocked && (
                    <button
                      onClick={() => setShowUnlockModal(true)}
                      className="h-8 px-3 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-all active:scale-95"
                    >
                      Buka Kunci
                    </button>
                  )}
                </div>
              )}

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto max-h-[350px] space-y-3 pr-1 scrollbar-thin py-2">
                {cartItems.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-slate-600 animate-pulse" />
                    <p className="text-xs font-semibold text-slate-400">Keranjang Kosong</p>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-[160px] mx-auto">Scan barcode atau pilih menu di sebelah kiri.</p>
                  </div>
                ) : (
                  cartItems.map(item => (
                    <div key={item.product.id} className="bg-[#020617] border border-slate-800 rounded-2xl p-3.5 flex justify-between gap-2 shadow-inner" style={{ minHeight: '56px' }}>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-xs text-slate-200 leading-normal truncate">{item.product.name}</h5>
                        <span className="text-[9px] text-slate-400 font-mono block">Rp {parseFloat(item.product.sell_price).toLocaleString('id-ID')} / pcs</span>
                        <span className="font-bold text-xs text-emerald-400 font-mono block mt-1">
                          Rp {(parseFloat(item.product.sell_price) * item.quantity).toLocaleString('id-ID')}
                        </span>
                      </div>
                      
                      <div className="flex flex-col items-end justify-between gap-1">
                        {!isDraftLocked ? (
                          <button
                            onClick={() => handleRemoveItem(item.product.id)}
                            className="text-slate-500 hover:text-rose-400 w-7 h-7 flex items-center justify-center rounded transition-colors active:scale-95"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <Lock className="w-3 h-3 text-slate-650" />
                        )}

                        <div className="flex items-center bg-[#0F172A] border border-slate-850 rounded-lg overflow-hidden p-0.5">
                          <button
                            onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                            disabled={isDraftLocked}
                            className={`w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded transition-colors active:scale-95 ${
                              isDraftLocked ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/5'
                            }`}
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="w-6 text-center text-xs font-mono font-bold text-slate-200">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                            disabled={isDraftLocked}
                            className={`w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded transition-colors active:scale-95 ${
                              isDraftLocked ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/5'
                            }`}
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Cart Reset Button */}
              {cartItems.length > 0 && (
                <button
                  onClick={handleResetCart}
                  className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition-all active:scale-98"
                >
                  Reset / Batalkan Transaksi
                </button>
              )}

            </div>

            {/* COLUMN 4: Payment Summary */}
            <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <h3 className="text-sm font-bold flex items-center gap-2 pb-3 border-b border-slate-800">
                <CreditCard className="w-4 h-4 text-violet-400" />
                <span>Panel Pembayaran</span>
              </h3>

              {/* Order Info */}
              <div className="space-y-3 text-xs bg-[#020617] p-4 rounded-2xl border border-slate-850">
                <div className="flex justify-between">
                  <span className="text-slate-400">Tipe Pesanan:</span>
                  <span className="font-bold text-slate-200 capitalize">{orderType === 'dine_in' ? 'Dine In' : 'Take Away'}</span>
                </div>
                {orderType === 'dine_in' && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nomor Meja:</span>
                    <span className="font-bold text-slate-200">{tableNumber || '-'}</span>
                  </div>
                )}
                {selectedDraft && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Masa Berlaku:</span>
                    <span className="font-bold text-amber-400 font-mono text-[10px]">
                      s/d {new Date(selectedDraft.expires_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>

              {/* Pricing breakdown */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-400 font-semibold">Subtotal</span>
                  <span className="font-bold font-mono text-slate-200">{formatCurrency(getSubtotal())}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-400 font-semibold">Pajak PPN (11%)</span>
                  <span className="font-bold font-mono text-slate-300">{formatCurrency(getTax())}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm font-bold text-emerald-400">Grand Total</span>
                  <span className="text-xl font-extrabold text-emerald-400 font-mono">{formatCurrency(getGrandTotal())}</span>
                </div>
              </div>

              {/* Checkout trigger placeholder */}
              <button
                disabled
                className="w-full h-12 bg-slate-800 text-slate-500 font-bold rounded-xl cursor-not-allowed text-center text-xs flex items-center justify-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                <span>Bayar & Selesai (Fase 5)</span>
              </button>

            </div>

          </div>
        )}
      </div>

      {/* ===== OPEN SHIFT MODAL ===== */}
      {showOpenShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0F172A] border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
            {/* Close button */}
            <button
              onClick={() => { setShowOpenShiftModal(false); if (!activeShift) handleLogout(); }}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="mx-auto w-fit p-4 bg-violet-650/10 rounded-2xl border border-violet-500/20">
                <DollarSign className="w-10 h-10 text-violet-400" />
              </div>
              <h3 className="text-xl font-bold mt-4">Buka Shift Baru</h3>
              <p className="text-sm text-slate-400">Masukkan jumlah uang tunai yang ada di laci kas sebagai modal awal.</p>
            </div>

            <form onSubmit={handleOpenShift} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold uppercase block">Modal Awal Laci Kas (IDR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">Rp</span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1000"
                    autoFocus
                    placeholder="100000"
                    value={openingCashInput}
                    onChange={(e) => setOpeningCashInput(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-800 rounded-xl pl-12 pr-4 h-12 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 placeholder-slate-700 text-white"
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[50000, 100000, 150000, 200000, 300000, 500000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setOpeningCashInput(amount.toString())}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 ${
                        openingCashInput === amount.toString()
                          ? 'bg-violet-500/20 border-violet-500/40 text-violet-400'
                          : 'bg-[#020617] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
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
                className="w-full h-12 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg shadow-[#7C3AED]/15 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                <span>Buka Shift</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== CLOSE SHIFT MODAL (Blind Cash Drop) ===== */}
      {showCloseShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0F172A] border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
            {/* Close button */}
            <button
              onClick={() => setShowCloseShiftModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="mx-auto w-fit p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                <Clock className="w-10 h-10 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold mt-4">Tutup Shift</h3>
              <p className="text-sm text-slate-400">
                Hitung uang fisik di laci kas Anda secara manual, lalu masukkan jumlahnya di bawah. Anda <strong className="text-amber-400">tidak akan melihat</strong> jumlah yang diharapkan sistem (Blind Cash Drop).
              </p>
            </div>

            {/* Warning box */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-305 leading-relaxed">
                Setelah shift ditutup, Anda akan <strong>otomatis logout</strong> dari sistem. Pastikan semua transaksi sudah selesai diproses.
              </p>
            </div>

            <form onSubmit={handleCloseShift} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold uppercase block">Total Uang Fisik di Laci (IDR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">Rp</span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="500"
                    autoFocus
                    placeholder="Jumlah setelah dihitung manual..."
                    value={physicalCashInput}
                    onChange={(e) => setPhysicalCashInput(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-800 rounded-xl pl-12 pr-4 h-12 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder-slate-700 text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !physicalCashInput}
                className="w-full h-12 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-black font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                <span>Tutup Shift & Logout</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== DRAFS PULL MODAL ===== */}
      {showDraftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#0F172A] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-violet-400" />
                <span>Daftar Antrean Draft Pesanan (Pramuniaga)</span>
              </h3>
              <button
                onClick={() => setShowDraftModal(false)}
                className="p-1 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDrafts ? (
              <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                <span className="text-xs">Mengambil daftar draft...</span>
              </div>
            ) : draftsList.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 text-slate-650" />
                <p className="text-sm">Tidak ada antrean draf aktif saat ini.</p>
                <button
                  onClick={fetchDrafts}
                  className="mt-3 px-3.5 py-2 bg-[#020617] border border-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-800 flex items-center gap-1 mx-auto active:scale-95 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Segarkan</span>
                </button>
              </div>
            ) : (
              <div className="max-h-[350px] overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                {draftsList.map(draft => (
                  <div 
                    key={draft.id}
                    className="bg-[#020617] border border-slate-850 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-violet-500/20 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm font-mono text-violet-400">{draft.queue_id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          draft.order_type === 'dine_in' 
                            ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' 
                            : 'bg-violet-500/10 border border-violet-500/20 text-violet-400'
                        }`}>
                          {draft.order_type === 'dine_in' ? `Dine In (Meja ${draft.table_number})` : 'Take Away'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Dibuat oleh: <span className="text-slate-350 font-semibold">{draft.creator?.name || 'Staff'}</span> • Berlaku s/d {new Date(draft.expires_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-850">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] text-slate-500 block">Total Est.</span>
                        <span className="text-xs font-bold text-emerald-450 font-mono">
                          {formatCurrency(draft.items?.reduce((sum, it) => sum + parseFloat(it.subtotal), 0) || 0)}
                        </span>
                      </div>
                      <button
                        onClick={() => handlePullDraft(draft)}
                        disabled={submitting}
                        className="h-10 px-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                      >
                        {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Tarik Antrean</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== SUPERVISOR PIN UNLOCK MODAL ===== */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-sm bg-[#0F172A] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <button
              onClick={() => { setShowUnlockModal(false); setUnlockPin(''); setUnlockError(null); }}
              className="absolute top-4 right-4 p-1 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-2">
              <div className="mx-auto w-fit p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-450">
                <Lock className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold">Otorisasi Supervisor</h4>
              <p className="text-xs text-slate-400">Masukkan PIN supervisor/manager untuk membuka kunci draft antrean ini.</p>
            </div>

            <form onSubmit={handleUnlockDraft} className="space-y-4">
              <div className="space-y-2">
                <input
                  type="password"
                  required
                  maxLength={6}
                  autoFocus
                  placeholder="------"
                  value={unlockPin}
                  onChange={(e) => setUnlockPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-[#020617] border border-slate-800 rounded-xl py-3 text-center text-xl font-bold tracking-[0.75em] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 placeholder-slate-800 text-white"
                />
                {unlockError && (
                  <p className="text-[11px] text-rose-400 font-semibold text-center mt-1.5">{unlockError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={unlocking || unlockPin.length !== 6}
                className="w-full h-11 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-black font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition-all flex items-center justify-center gap-1.5 active:scale-98"
              >
                {unlocking && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Verifikasi PIN</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-3 px-6 border-t border-slate-800 bg-[#020617]/85 text-center text-[10px] text-slate-500">
        KEPOS Point of Sale © 2026. All rights reserved.
      </footer>
    </div>
  );
}
