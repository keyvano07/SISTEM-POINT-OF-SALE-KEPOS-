'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore, Product, Category } from '@/store/useCartStore';
import api from '@/services/api';
import { LogOut, ClipboardList, Shield, Search, Plus, Minus, Trash2, ShoppingBag, Utensils, CalendarDays, Loader2, AlertCircle, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface OrderDraftItem { id: number; product_id: number; quantity: number; unit_price: string; subtotal: string; }
interface CreatedDraft { id: number; queue_id: string; order_type: 'dine_in' | 'take_away'; table_number: string | null; expires_at: string; items?: OrderDraftItem[]; }

export default function PramuniagaPage() {
  const router = useRouter();
  const { user, clearAuth, token } = useAuthStore();
  const { items: cartItems, orderType, tableNumber, addItem, removeItem, updateQuantity, clearCart, setOrderType, setTableNumber, getSubtotal } = useCartStore();

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

  useEffect(() => { setIsHydrated(true); }, []);
  useEffect(() => {
    if (isHydrated && !token) router.push('/login');
    else if (isHydrated && token) fetchData();
  }, [token, router, isHydrated]);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const [prodRes, catRes] = await Promise.all([api.get('/products'), api.get('/categories')]);
      setProducts((prodRes.data.data || []).filter((p: Product) => p.is_active));
      setCategories(catRes.data.data || []);
    } catch (err) { console.error(err); setError('Gagal memuat data menu dari server.'); }
    finally { setLoading(false); }
  };

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch (e) { console.error('Logout request failed', e); }
    finally { document.cookie = 'pos_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;'; clearAuth(); clearCart(); router.push('/login'); }
  };

  const handleSubmitDraft = async () => {
    if (cartItems.length === 0) return;
    if (orderType === 'dine_in' && !tableNumber.trim()) { setSubmitError('Nomor meja harus diisi untuk pesanan dine-in.'); return; }
    setIsSubmitting(true); setSubmitError(null);
    const payload = { order_type: orderType, table_number: orderType === 'dine_in' ? tableNumber : null, items: cartItems.map(item => ({ product_id: item.product.id, quantity: item.quantity })) };
    try {
      const response = await api.post('/order-drafts', payload);
      if (response.data.success) { setCreatedDraft(response.data.data); clearCart(); }
      else { setSubmitError(response.data.message || 'Gagal menyimpan draf pesanan.'); }
    } catch (err) { console.error(err);
      let msg = 'Terjadi kesalahan saat menghubungi server.';
      if (err && typeof err === 'object' && 'response' in err) { const response = (err as { response?: { data?: { message?: string } } }).response; if (response?.data?.message) msg = response.data.message; }
      setSubmitError(msg);
    } finally { setIsSubmitting(false); }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || product.sku.toLowerCase().includes(searchQuery.toLowerCase()) || product.barcode.includes(searchQuery);
    const matchesCategory = selectedCategoryId === null || product.category_id === selectedCategoryId;
    return matchesSearch && matchesCategory;
  });

  if (!isHydrated || !user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      {/* Top Navbar */}
      <nav className="border-b px-5 py-3 flex justify-between items-center bg-card shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary rounded-lg text-primary-foreground shadow-sm"><ClipboardList className="w-4 h-4" /></div>
          <div>
            <h1 className="font-bold text-sm">KEPOS Tablet</h1>
            <p className="text-[10px] text-primary font-semibold uppercase tracking-wider">Modul Pramuniaga</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <div><p className="text-xs font-semibold leading-tight">{user.name}</p><p className="text-[10px] text-muted-foreground capitalize leading-tight">{user.role}</p></div>
          </div>
          <Button variant="destructive" size="sm" onClick={handleLogout} className="gap-1.5 h-8"><LogOut className="w-3.5 h-3.5" /> Keluar</Button>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Catalog */}
        <main className="flex-1 p-5 overflow-y-auto flex flex-col gap-5">
          <Card><CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari menu, SKU, atau barcode..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-10" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Button variant={selectedCategoryId === null ? "default" : "outline"} size="sm" onClick={() => setSelectedCategoryId(null)} className="whitespace-nowrap text-xs">Semua Menu</Button>
              {categories.map(cat => (
                <Button key={cat.id} variant={selectedCategoryId === cat.id ? "default" : "outline"} size="sm" onClick={() => setSelectedCategoryId(cat.id)} className="whitespace-nowrap text-xs">{cat.name}</Button>
              ))}
            </div>
          </CardContent></Card>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin text-primary" /><span className="text-sm">Memuat menu...</span></div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-destructive"><AlertCircle className="w-8 h-8" /><span>{error}</span><Button variant="outline" size="sm" onClick={fetchData}>Coba Lagi</Button></div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground"><ShoppingBag className="w-10 h-10 mb-2 opacity-40" /><span className="text-sm">Tidak ada menu yang sesuai.</span></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredProducts.map(product => {
                const isOutOfStock = product.stock_quantity <= 0;
                const isLowStock = !isOutOfStock && product.stock_quantity <= product.low_stock_threshold;
                return (
                  <Card key={product.id} className="hover:border-primary/30 hover:shadow-md transition-all group relative">
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                      <div>
                        {isOutOfStock && <Badge variant="destructive" className="absolute top-2 right-2 text-[9px]">Habis</Badge>}
                        {isLowStock && <Badge variant="warning" className="absolute top-2 right-2 text-[9px]">Tipis ({product.stock_quantity})</Badge>}
                        <span className="text-[10px] text-primary font-mono">{product.sku}</span>
                        <h3 className="font-bold text-sm mt-1">{product.name}</h3>
                        {product.category && <span className="text-[10px] text-muted-foreground">{product.category.name}</span>}
                      </div>
                      <div className="mt-3 flex items-center justify-between pt-3 border-t">
                        <span className="font-semibold text-emerald-600 text-sm font-mono">Rp {parseFloat(product.sell_price).toLocaleString('id-ID')}</span>
                        <Button size="sm" onClick={() => addItem(product)} disabled={isOutOfStock} className="gap-1 h-8"><Plus className="w-3.5 h-3.5" /> Pilih</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>

        {/* Right: Cart */}
        <aside className="w-[360px] bg-card border-l flex flex-col shadow-lg">
          <div className="p-4 border-b flex justify-between items-center">
            <div className="flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-primary" /><h2 className="font-bold text-sm">Keranjang</h2></div>
            <Badge variant="secondary" className="font-mono">{cartItems.reduce((sum, item) => sum + item.quantity, 0)} item</Badge>
          </div>

          <ScrollArea className="flex-1 p-4">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-16">
                <ShoppingBag className="w-10 h-10 mb-3 opacity-30" /><p className="text-sm font-medium">Keranjang Kosong</p><p className="text-xs mt-1">Pilih menu di sebelah kiri.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map(item => (
                  <Card key={item.product.id} className="bg-muted/50">
                    <CardContent className="p-3 flex justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs truncate">{item.product.name}</h4>
                        <span className="text-[10px] text-muted-foreground font-mono">Rp {parseFloat(item.product.sell_price).toLocaleString('id-ID')} / pcs</span>
                        <span className="font-bold text-xs text-emerald-600 font-mono block mt-0.5">Rp {(parseFloat(item.product.sell_price) * item.quantity).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex flex-col items-end justify-between gap-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.product.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        <div className="flex items-center bg-card border rounded-lg overflow-hidden">
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}><Minus className="w-3 h-3" /></Button>
                          <span className="w-7 text-center text-xs font-bold font-mono">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}><Plus className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="p-4 border-t space-y-3">
            <div className="space-y-2">
              <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Tipe Pesanan</label>
              <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-lg">
                <Button variant={orderType === 'dine_in' ? 'default' : 'ghost'} size="sm" onClick={() => setOrderType('dine_in')} className="gap-1.5 text-xs h-9">
                  <Utensils className="w-3.5 h-3.5" /> Dine In
                </Button>
                <Button variant={orderType === 'take_away' ? 'default' : 'ghost'} size="sm" onClick={() => setOrderType('take_away')} className="gap-1.5 text-xs h-9">
                  <CalendarDays className="w-3.5 h-3.5" /> Take Away
                </Button>
              </div>
            </div>

            {orderType === 'dine_in' && (
              <div className="space-y-2">
                <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Nomor Meja</label>
                <Input placeholder="Meja 04, Meja 10..." value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} className="h-9 text-xs" />
              </div>
            )}

            {submitError && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive text-xs"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span className="font-medium">{submitError}</span></div>
            )}

            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground font-semibold uppercase">Subtotal</span>
              <span className="font-bold text-lg text-emerald-600 font-mono">Rp {getSubtotal().toLocaleString('id-ID')}</span>
            </div>
            <Button className="w-full h-11 font-semibold" disabled={cartItems.length === 0 || isSubmitting || (orderType === 'dine_in' && !tableNumber.trim())} onClick={handleSubmitDraft}>
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Menyimpan...</> : 'Simpan Draf Pesanan'}
            </Button>
          </div>
        </aside>
      </div>

      {/* Success Dialog */}
      <Dialog open={!!createdDraft} onOpenChange={(open) => !open && setCreatedDraft(null)}>
        <DialogContent className="max-w-md text-center">
          <div className="flex flex-col items-center gap-3 pt-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full"><CheckCircle className="w-8 h-8" /></div>
            <DialogTitle className="text-xl">Draf Pesanan Tersimpan!</DialogTitle>
            <DialogDescription>Berikan nomor antrean ini kepada kasir.</DialogDescription>
          </div>
          {createdDraft && (
            <div className="space-y-4 mt-2">
              <Card className="bg-muted/50"><CardContent className="p-4 text-center">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Nomor Antrean</p>
                <h3 className="text-3xl font-black tracking-widest text-primary font-mono mt-1">{createdDraft.queue_id}</h3>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-left text-sm space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Tipe:</span><span className="font-semibold capitalize">{createdDraft.order_type === 'dine_in' ? 'Dine-In' : 'Take-Away'}</span></div>
                {createdDraft.order_type === 'dine_in' && <div className="flex justify-between"><span className="text-muted-foreground">Meja:</span><span className="font-semibold">{createdDraft.table_number}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Berlaku:</span><span className="font-semibold text-amber-600">2 Jam (s/d {new Date(createdDraft.expires_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})})</span></div>
                <Separator />
                <div className="flex justify-between font-bold"><span className="text-muted-foreground">Estimasi:</span><span className="text-emerald-600 font-mono">Rp {createdDraft.items?.reduce((sum: number, item: OrderDraftItem) => sum + parseFloat(item.subtotal), 0).toLocaleString('id-ID')}</span></div>
              </CardContent></Card>
              <Button className="w-full h-11" onClick={() => setCreatedDraft(null)}>Selesai & Buat Pesanan Baru</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
