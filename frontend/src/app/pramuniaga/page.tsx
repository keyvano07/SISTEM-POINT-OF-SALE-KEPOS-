'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore, Product, Category } from '@/store/useCartStore';
import api from '@/services/api';
import { 
  LogOut, ClipboardList, Shield, Search, Plus, Minus, Trash2, 
  ShoppingBag, Utensils, CalendarDays, Loader2, AlertCircle, X, 
  CheckCircle, ArrowRight, ShoppingCart, User, RefreshCw, Store 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdDraft, setCreatedDraft] = useState<CreatedDraft | null>(null);
  const [showMobileCart, setShowMobileCart] = useState(false);

  useEffect(() => { setIsHydrated(true); }, []);
  
  useEffect(() => {
    if (isHydrated && !token) router.push('/login');
    else if (isHydrated && token) fetchData();
  }, [token, router, isHydrated]);

  const fetchData = async () => {
    setLoading(true); 
    setError(null);
    try {
      const [prodRes, catRes] = await Promise.all([api.get('/products'), api.get('/categories')]);
      setProducts((prodRes.data.data || []).filter((p: Product) => p.is_active));
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
        setShowMobileCart(false);
      } else { 
        setSubmitError(response.data.message || 'Gagal menyimpan draf pesanan.'); 
      }
    } catch (err) { 
      console.error(err);
      let msg = 'Terjadi kesalahan saat menghubungi server.';
      if (err && typeof err === 'object' && 'response' in err) { 
        const response = (err as { response?: { data?: { message?: string } } }).response; 
        if (response?.data?.message) msg = response.data.message; 
      }
      setSubmitError(msg);
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.sku.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.barcode.includes(searchQuery);
    const matchesCategory = selectedCategoryId === null || product.category_id === selectedCategoryId;
    return matchesSearch && matchesCategory;
  });

  if (!isHydrated || !user) return null;

  const totalCartQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Cart Component to avoid duplication between Sidebar & Mobile Sheet
  const CartContentSection = () => (
    <div className="flex flex-col h-full justify-between">
      {/* Scrollable Items */}
      <ScrollArea className="flex-1 px-4 py-2">
        {cartItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20 text-center space-y-3">
            <div className="p-4 bg-muted/40 rounded-2xl border border-border">
              <ShoppingBag className="w-10 h-10 text-muted-foreground/60" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">Keranjang Kosong</p>
              <p className="text-xs text-muted-foreground max-w-[200px]">Pilih menu lezat di daftar sebelah kiri untuk memulai pesanan.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pr-2">
            {cartItems.map(item => (
              <Card key={item.product.id} className="border-border/60 bg-muted/20 hover:border-primary/20 transition-all duration-200">
                <CardContent className="p-3.5 flex justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="font-bold text-xs truncate text-foreground">{item.product.name}</h4>
                    <span className="text-[10px] text-muted-foreground font-mono bg-muted border border-border/40 px-1.5 py-0.5 rounded">
                      Rp {parseFloat(item.product.sell_price).toLocaleString('id-ID')}
                    </span>
                    <span className="font-mono font-bold text-xs text-emerald-600 block pt-1">
                      Rp {(parseFloat(item.product.sell_price) * item.quantity).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex flex-col items-end justify-between gap-2.5">
                    <button 
                      onClick={() => removeItem(item.product.id)}
                      className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center bg-card border border-border/80 rounded-xl overflow-hidden shadow-sm h-7.5">
                      <button 
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="h-full px-2 hover:bg-muted text-muted-foreground font-bold active:scale-95 transition-all text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center text-xs font-mono font-bold text-foreground">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        disabled={item.product.stock_quantity <= item.quantity}
                        className="h-full px-2 hover:bg-muted text-muted-foreground font-bold active:scale-95 transition-all text-xs disabled:opacity-50"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Cart Summary & CTA */}
      <div className="p-4 border-t border-border bg-card space-y-4 rounded-b-2xl">
        <div className="space-y-3">
          {/* Order Type Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Tipe Pesanan</label>
            <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-xl">
              <Button 
                variant={orderType === 'dine_in' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setOrderType('dine_in')} 
                className={`gap-1.5 text-xs h-9 rounded-lg font-bold transition-all ${orderType === 'dine_in' ? 'shadow-sm' : ''}`}
              >
                <Utensils className="w-3.5 h-3.5" /> Dine In
              </Button>
              <Button 
                variant={orderType === 'take_away' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setOrderType('take_away')} 
                className={`gap-1.5 text-xs h-9 rounded-lg font-bold transition-all ${orderType === 'take_away' ? 'shadow-sm' : ''}`}
              >
                <CalendarDays className="w-3.5 h-3.5" /> Take Away
              </Button>
            </div>
          </div>

          {/* Table Number Input for Dine In */}
          {orderType === 'dine_in' && (
            <div className="space-y-1.5 animate-fade-in">
              <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Nomor Meja</label>
              <Input 
                placeholder="Contoh: Meja 04, Meja 10..." 
                value={tableNumber} 
                onChange={(e) => setTableNumber(e.target.value)} 
                className="h-9.5 text-xs rounded-xl focus-visible:ring-primary/20"
              />
            </div>
          )}

          {submitError && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-xs animate-shake">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="font-semibold">{submitError}</span>
            </div>
          )}
        </div>

        <Separator className="bg-border/60" />
        
        <div className="flex justify-between items-center px-1">
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Subtotal</span>
          <span className="font-mono font-black text-xl text-emerald-600">
            Rp {getSubtotal().toLocaleString('id-ID')}
          </span>
        </div>

        <Button 
          className="w-full h-11 font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all duration-300 active:scale-[0.98]" 
          disabled={cartItems.length === 0 || isSubmitting || (orderType === 'dine_in' && !tableNumber.trim())} 
          onClick={handleSubmitDraft}
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
          ) : (
            <><CheckCircle className="w-4 h-4" /> Simpan Draf Pesanan</>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      {/* Top Navbar */}
      <nav className="border-b bg-card shadow-sm sticky top-0 z-30 px-6 py-3.5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 border border-primary/20 text-primary rounded-xl shadow-inner flex items-center justify-center">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight leading-none text-foreground flex items-center gap-1.5">
              KEPOS Tablet
              <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-[9px] font-extrabold rounded-full text-primary uppercase tracking-wider">
                Staf Toko
              </span>
            </h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">
              Modul Pramuniaga / Order Taker
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-muted/50 border border-border/80 px-3 py-1.5 rounded-xl text-xs font-semibold">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span>ID: <strong className="text-foreground">{user.name}</strong></span>
          </div>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleLogout} 
            className="gap-1.5 h-9 rounded-xl font-bold text-xs px-4 shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" /> 
            <span>Keluar</span>
          </Button>
        </div>
      </nav>

      {/* Main Layout Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Pane: Catalog & Filter */}
        <main className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 lg:pb-24 pb-28">
          {/* Search Card & Category Scroller */}
          <Card className="border-border/60 shadow-sm rounded-2xl">
            <CardContent className="p-4 space-y-4">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="w-4.5 h-4.5 text-muted-foreground" />
                </span>
                <Input 
                  placeholder="Cari menu, SKU, atau barcode produk..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="pl-10 h-11 rounded-xl border-border/80 focus-visible:ring-primary/20 text-sm" 
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')} 
                    className="absolute inset-y-0 right-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Category Scroller */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <Button 
                  variant={selectedCategoryId === null ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setSelectedCategoryId(null)} 
                  className="whitespace-nowrap text-xs rounded-lg font-semibold h-8"
                >
                  Semua Menu
                </Button>
                {categories.map(cat => (
                  <Button 
                    key={cat.id} 
                    variant={selectedCategoryId === cat.id ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setSelectedCategoryId(cat.id)} 
                    className="whitespace-nowrap text-xs rounded-lg font-semibold h-8"
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Product Grid Area */}
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm font-semibold">Memuat menu...</span>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20 text-destructive text-center">
              <AlertCircle className="w-8 h-8" />
              <span className="font-semibold text-sm">{error}</span>
              <Button variant="outline" size="sm" onClick={fetchData} className="rounded-xl font-bold">Coba Lagi</Button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-20 text-center gap-3">
              <ShoppingBag className="w-12 h-12 opacity-30" />
              <span className="text-sm font-semibold">Tidak ada menu yang sesuai.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => {
                const isOutOfStock = product.stock_quantity <= 0;
                const isLowStock = !isOutOfStock && product.stock_quantity <= product.low_stock_threshold;
                
                // Check quantity in cart
                const cartItem = cartItems.find(item => item.product.id === product.id);
                const quantityInCart = cartItem ? cartItem.quantity : 0;

                const initials = product.name.substring(0, 2).toUpperCase();

                const handleCardClick = () => {
                  if (isOutOfStock) return;
                  if (quantityInCart === 0) addItem(product);
                };

                return (
                  <Card 
                    key={product.id} 
                    onClick={handleCardClick}
                    className={`hover:border-primary/40 hover:shadow-md transition-all duration-300 group relative flex flex-col justify-between overflow-hidden rounded-2xl border-border/80 cursor-pointer ${
                      quantityInCart > 0 ? 'border-primary/30 ring-1 ring-primary/10 bg-primary/5' : ''
                    } ${isOutOfStock ? 'opacity-65 cursor-not-allowed' : ''}`}
                  >
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
                      {/* Top section: SKU & badges */}
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded border border-primary/10">
                            {product.sku}
                          </span>
                          <div className="flex flex-col items-end gap-1">
                            {isOutOfStock && (
                              <Badge variant="destructive" className="text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide">
                                Habis
                              </Badge>
                            )}
                            {isLowStock && (
                              <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide">
                                Tipis ({product.stock_quantity})
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Image Placeholder or Actual Image */}
                        <div className="w-full h-24 bg-muted/60 dark:bg-muted/30 rounded-xl overflow-hidden flex items-center justify-center text-muted-foreground/45 relative">
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={product.name} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                            />
                          ) : (
                            <span className="text-xl font-extrabold font-sans tracking-wide">{initials}</span>
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <h3 className="font-extrabold text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors duration-200">
                            {product.name}
                          </h3>
                          {product.category && (
                            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                              {product.category.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Section: Price & Action Counter */}
                      <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-1">
                        <span className="font-semibold text-emerald-600 text-sm font-mono block">
                          Rp {parseFloat(product.sell_price).toLocaleString('id-ID')}
                        </span>
                        
                        {/* Dynamic Button or Counter */}
                        {quantityInCart > 0 ? (
                          <div className="flex items-center bg-primary text-primary-foreground rounded-xl overflow-hidden shadow-sm h-8 border border-primary">
                            <button 
                              onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, quantityInCart - 1); }}
                              className="px-2 h-full hover:bg-primary-hover active:scale-95 transition-all text-sm font-bold"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-7 text-center text-xs font-mono font-extrabold">{quantityInCart}</span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, quantityInCart + 1); }}
                              disabled={product.stock_quantity <= quantityInCart}
                              className="px-2 h-full hover:bg-primary-hover active:scale-95 transition-all text-sm font-bold disabled:opacity-50"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <Button 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); addItem(product); }} 
                            disabled={isOutOfStock} 
                            className="gap-1.5 h-8 rounded-xl font-bold text-xs"
                          >
                            <Plus className="w-3.5 h-3.5" /> Pilih
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>

        {/* Right Sidebar: Cart (Always visible on large screens) */}
        <aside className="hidden lg:flex w-96 bg-card border-l border-border flex-col shadow-lg">
          <div className="p-4 border-b border-border flex justify-between items-center bg-muted/15">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primary" />
              <h2 className="font-extrabold text-sm text-foreground">Keranjang Belanja</h2>
            </div>
            <Badge className="font-mono bg-primary/10 text-primary border-primary/20 font-bold">
              {totalCartQty} Item
            </Badge>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden py-2">
            <CartContentSection />
          </div>
        </aside>

        {/* Mobile Floating Cart Summary (Sticky Bottom Bar) */}
        {totalCartQty > 0 && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border p-4 z-40 flex justify-between items-center shadow-lg animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="relative p-2.5 bg-primary/10 text-primary rounded-xl">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-primary-foreground font-mono text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {totalCartQty}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Estimasi Total</p>
                <p className="font-mono font-black text-sm text-emerald-600">
                  Rp {getSubtotal().toLocaleString('id-ID')}
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setShowMobileCart(true)} 
              size="sm" 
              className="rounded-xl font-bold text-xs h-10 px-5 flex items-center gap-1.5 shadow-md"
            >
              <span>Lihat Keranjang</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* Mobile Cart Full Drawer / Dialog */}
        <Dialog open={showMobileCart} onOpenChange={setShowMobileCart}>
          <DialogContent className="max-w-md h-[90vh] flex flex-col p-0 overflow-hidden gap-0 rounded-t-3xl border-t">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/15">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-primary" />
                <DialogTitle className="font-extrabold text-sm text-foreground">Keranjang Belanja</DialogTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="font-mono bg-primary/10 text-primary border-primary/20 font-bold">
                  {totalCartQty} Item
                </Badge>
                <DialogClose className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                  <X className="w-4 h-4" />
                </DialogClose>
              </div>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden py-2">
              <CartContentSection />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Success Dialog: Printed Queue Slip Theme */}
      <Dialog open={!!createdDraft} onOpenChange={(open) => !open && setCreatedDraft(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border bg-card shadow-2xl">
          <div className="p-6 text-center space-y-6">
            
            {/* Header Status */}
            <div className="flex flex-col items-center gap-2.5">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-full shadow-inner">
                <CheckCircle className="w-8 h-8" />
              </div>
              <DialogTitle className="text-xl font-black text-foreground">Draf Pesanan Tersimpan!</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                Draf belanja berhasil dikunci. Berikan nomor antrean di bawah kepada Kasir untuk memproses pembayaran.
              </DialogDescription>
            </div>

            {createdDraft && (
              <div className="space-y-4">
                
                {/* Print Ticket Slip Visual */}
                <div className="relative bg-muted/40 border border-border/80 rounded-2xl p-5 overflow-hidden flex flex-col items-center gap-1.5 shadow-inner">
                  {/* Decorative ticket notch left & right */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-6 h-6 bg-card border-r border-border/80 rounded-full" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-6 h-6 bg-card border-l border-border/80 rounded-full" />
                  
                  <p className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest">Nomor Antrean / Queue ID</p>
                  <h3 className="text-4xl font-black tracking-widest text-primary font-mono py-1.5 select-all">
                    {createdDraft.queue_id}
                  </h3>

                  {/* Barcode Simulator */}
                  <div className="flex flex-col items-center gap-1 w-full max-w-[200px] pt-3 border-t border-dashed border-border/60 mt-1">
                    <div className="flex h-10 items-end justify-center w-full gap-[3px] opacity-80">
                      {[1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2].map((w, i) => (
                        <div 
                          key={i} 
                          className="bg-foreground h-full" 
                          style={{ width: `${w}px` }} 
                        />
                      ))}
                    </div>
                    <span className="font-mono text-[8px] text-muted-foreground tracking-widest uppercase">
                      *{createdDraft.queue_id}*
                    </span>
                  </div>
                </div>

                {/* Details Slip Card */}
                <Card className="border-border/60">
                  <CardContent className="p-4 text-left text-xs space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-semibold">Tipe Layanan:</span>
                      <span className="font-bold capitalize bg-muted px-2 py-0.5 rounded text-foreground text-[11px] border border-border/40">
                        {createdDraft.order_type === 'dine_in' ? 'Dine-In (Makan di Sini)' : 'Take-Away (Bawa Pulang)'}
                      </span>
                    </div>
                    {createdDraft.order_type === 'dine_in' && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground font-semibold">Nomor Meja:</span>
                        <span className="font-bold text-foreground bg-primary/10 text-primary px-2.5 py-0.5 rounded text-[11px] border border-primary/10">
                          {createdDraft.table_number}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-semibold">Batas Berlaku Draf:</span>
                      <span className="font-bold text-amber-600 bg-amber-500/10 px-2.5 py-0.5 rounded text-[11px] border border-amber-500/20">
                        s/d {new Date(createdDraft.expires_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} (Hari Ini)
                      </span>
                    </div>
                    
                    <Separator className="bg-border/60 my-2" />
                    
                    <div className="flex justify-between items-center text-sm font-extrabold">
                      <span className="text-muted-foreground font-bold uppercase tracking-wider text-[11px]">Estimasi Total</span>
                      <span className="text-emerald-600 font-mono text-base">
                        Rp {createdDraft.items?.reduce((sum: number, item: OrderDraftItem) => sum + parseFloat(item.subtotal), 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Button 
                  className="w-full h-11 font-bold text-xs rounded-xl shadow-md mt-2" 
                  onClick={() => setCreatedDraft(null)}
                >
                  Selesai & Buat Pesanan Baru
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
