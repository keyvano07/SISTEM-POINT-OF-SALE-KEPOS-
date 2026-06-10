'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';
import { Tag, Plus, Search, Trash2, Loader2, AlertTriangle, Calendar, CheckCircle, Percent, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface Product { id: number; name: string; }
interface Category { id: number; name: string; }
interface Discount {
  id: number; name: string; description: string | null;
  scope: 'transaction' | 'product' | 'category';
  type: 'percentage' | 'fixed_amount'; value: string;
  target: 'all' | 'member_only' | 'tier_specific';
  target_tier: 'bronze' | 'silver' | 'gold' | null;
  target_product_id: number | null; target_category_id: number | null;
  min_purchase_amount: string; max_discount_amount: string | null;
  start_date: string; end_date: string; is_active: boolean;
  product?: Product; category?: Category;
}

export default function DiscountManagementPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScope, setFilterScope] = useState('');
  const [filterTarget, setFilterTarget] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '', description: '', scope: 'product', type: 'percentage', value: '',
    target: 'all', target_tier: '', target_product_id: '', target_category_id: '',
    min_purchase_amount: '0', max_discount_amount: '', start_date: '', end_date: '',
  });
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (token) {
      if (user && !['super_admin', 'manager'].includes(user.role)) { router.push('/dashboard'); return; }
      fetchData();
    }
  }, [token, user, router]);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const [discRes, prodRes, catRes] = await Promise.all([api.get('/discounts'), api.get('/products'), api.get('/categories')]);
      setDiscounts(discRes.data.data || []); setProducts(prodRes.data.data || []); setCategories(catRes.data.data || []);
    } catch (err) { console.error(err); setError('Gagal memuat data promo diskon dari server.'); }
    finally { setLoading(false); }
  };

  const triggerAlert = (type: 'success' | 'error', text: string) => { setAlertMsg({ type, text }); setTimeout(() => setAlertMsg(null), 5000); };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formatCurrency = (val: string | number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(typeof val === 'string' ? parseFloat(val) : val);
  const isPromoActive = (disc: Discount) => { const now = new Date(); return disc.is_active && now >= new Date(disc.start_date) && now <= new Date(disc.end_date); };

  const handleAddDiscountSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    const payload: Record<string, unknown> = {
      name: formData.name.trim(), description: formData.description.trim() || null, scope: formData.scope,
      type: formData.type, value: parseFloat(formData.value), target: formData.target,
      target_tier: formData.target === 'tier_specific' ? formData.target_tier : null,
      target_product_id: formData.scope === 'product' ? parseInt(formData.target_product_id) : null,
      target_category_id: formData.scope === 'category' ? parseInt(formData.target_category_id) : null,
      min_purchase_amount: parseFloat(formData.min_purchase_amount) || 0.00,
      max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
      start_date: formData.start_date, end_date: formData.end_date,
    };
    try {
      const res = await api.post('/discounts', payload);
      if (res.data.success) {
        triggerAlert('success', `Promo diskon "${formData.name}" berhasil dibuat.`); setIsAddModalOpen(false);
        setFormData({ name: '', description: '', scope: 'product', type: 'percentage', value: '', target: 'all',
          target_tier: '', target_product_id: '', target_category_id: '', min_purchase_amount: '0', max_discount_amount: '', start_date: '', end_date: '' });
        fetchData();
      }
    } catch (err: unknown) { console.error(err); triggerAlert('error', ((err as { response?: { data?: { message?: string } } })?.response?.data?.message) || 'Gagal membuat promo diskon baru.'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteDiscount = async (id: number, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus promo diskon "${name}"?`)) return;
    try {
      const res = await api.delete(`/discounts/${id}`);
      if (res.data.success) { triggerAlert('success', `Promo "${name}" berhasil dihapus.`); fetchData(); }
    } catch (err: unknown) { console.error(err); triggerAlert('error', ((err as { response?: { data?: { message?: string } } })?.response?.data?.message) || 'Gagal menghapus promo.'); }
  };

  const filteredDiscounts = discounts.filter(disc => {
    const matchesSearch = disc.name.toLowerCase().includes(searchQuery.toLowerCase()) || (disc.description && disc.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch && (filterScope ? disc.scope === filterScope : true) && (filterTarget ? disc.target === filterTarget : true);
  });

  const selectClass = "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-lg"><Tag className="w-5 h-5" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Manajemen Promo Diskon</h1>
            <p className="text-sm text-muted-foreground">Buat, aktifkan, dan pantau program diskon toko Anda.</p>
          </div>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Tambah Promo</Button>
      </div>

      {alertMsg && (
        <Alert variant={alertMsg.type === 'success' ? 'success' : 'destructive'} className="animate-fade-in">
          {alertMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <AlertDescription className="font-medium">{alertMsg.text}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cari nama promo..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <select value={filterScope} onChange={(e) => setFilterScope(e.target.value)} className={selectClass}>
            <option value="">Semua Cakupan</option><option value="product">Produk</option>
            <option value="category">Kategori</option><option value="transaction">Transaksi</option>
          </select>
          <select value={filterTarget} onChange={(e) => setFilterTarget(e.target.value)} className={selectClass}>
            <option value="">Semua Target</option><option value="all">Semua Pelanggan</option>
            <option value="member_only">Hanya Member</option><option value="tier_specific">Tier Spesifik</option>
          </select>
          <div className="flex items-center justify-end text-sm text-muted-foreground font-medium">
            Ditemukan: <strong className="text-foreground ml-1">{filteredDiscounts.length} promo</strong>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" /><p className="text-sm text-muted-foreground">Mengambil data promo...</p>
            </div>
          ) : error ? (
            <div className="p-12 flex flex-col items-center gap-2 text-destructive"><AlertTriangle className="w-8 h-8" /><p className="text-sm font-semibold">{error}</p></div>
          ) : filteredDiscounts.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">Belum ada promo diskon yang cocok.</div>
          ) : (
            <Table>
              <TableHeader><TableRow className="bg-muted/50">
                <TableHead>Nama Promo</TableHead><TableHead>Cakupan</TableHead><TableHead>Tipe & Nilai</TableHead>
                <TableHead>Target</TableHead><TableHead>Min. Belanja</TableHead><TableHead>Periode</TableHead>
                <TableHead>Status</TableHead><TableHead className="text-center">Aksi</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredDiscounts.map(disc => {
                  const active = isPromoActive(disc);
                  return (
                    <TableRow key={disc.id}>
                      <TableCell>
                        <div className="font-semibold">{disc.name}</div>
                        {disc.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{disc.description}</div>}
                      </TableCell>
                      <TableCell>
                        {disc.scope === 'product' && <Badge variant="secondary">Produk: {disc.product?.name || `ID ${disc.target_product_id}`}</Badge>}
                        {disc.scope === 'category' && <Badge variant="warning">Kategori: {disc.category?.name || `ID ${disc.target_category_id}`}</Badge>}
                        {disc.scope === 'transaction' && <Badge>Transaksi</Badge>}
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        {disc.type === 'percentage' ? (
                          <span className="flex items-center gap-1"><Percent className="w-3.5 h-3.5" /> {disc.value}%</span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-600"><Wallet className="w-3.5 h-3.5" /> {formatCurrency(disc.value)}</span>
                        )}
                        {disc.max_discount_amount && <div className="text-[10px] text-muted-foreground mt-0.5">Maks: {formatCurrency(disc.max_discount_amount)}</div>}
                      </TableCell>
                      <TableCell>
                        {disc.target === 'all' && <span>Semua</span>}
                        {disc.target === 'member_only' && <Badge variant="secondary">Member</Badge>}
                        {disc.target === 'tier_specific' && <Badge variant={disc.target_tier === 'gold' ? 'gold' : disc.target_tier === 'silver' ? 'silver' : 'bronze'}>{disc.target_tier}</Badge>}
                      </TableCell>
                      <TableCell className="font-mono">
                        {parseFloat(disc.min_purchase_amount) > 0 ? formatCurrency(disc.min_purchase_amount) : <span className="text-muted-foreground italic">Tanpa Min.</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground space-y-0.5">
                        <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(disc.start_date).toLocaleDateString('id-ID')}</div>
                        <div>s/d {new Date(disc.end_date).toLocaleDateString('id-ID')}</div>
                      </TableCell>
                      <TableCell>
                        {active ? <Badge variant="success">Aktif</Badge> : <Badge variant="destructive">Nonaktif</Badge>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteDiscount(disc.id, disc.name)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Discount Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Buat Program Promo Baru</DialogTitle>
            <DialogDescription>Isi detail program promo diskon yang akan dibuat.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDiscountSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Nama Promo *</Label>
                <Input name="name" required placeholder="Contoh: Diskon Flash Sale" value={formData.name} onChange={handleInputChange} /></div>
              <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Deskripsi</Label>
                <Input name="description" placeholder="Deskripsi singkat" value={formData.description} onChange={handleInputChange} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Cakupan *</Label>
                <select name="scope" value={formData.scope} onChange={handleInputChange} className={selectClass}>
                  <option value="product">Produk Tertentu</option><option value="category">Kategori</option><option value="transaction">Subtotal Transaksi</option></select></div>
              {formData.scope === 'product' && (
                <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Produk Target *</Label>
                  <select name="target_product_id" required value={formData.target_product_id} onChange={handleInputChange} className={selectClass}>
                    <option value="">-- Pilih --</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              )}
              {formData.scope === 'category' && (
                <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Kategori Target *</Label>
                  <select name="target_category_id" required value={formData.target_category_id} onChange={handleInputChange} className={selectClass}>
                    <option value="">-- Pilih --</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              )}
              {formData.scope === 'transaction' && <div className="space-y-2 opacity-50"><Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Target Item</Label><Input disabled placeholder="Semua item" /></div>}
              <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Target Audiens *</Label>
                <select name="target" value={formData.target} onChange={handleInputChange} className={selectClass}>
                  <option value="all">Semua Pelanggan</option><option value="member_only">Hanya Member</option><option value="tier_specific">Tier Spesifik</option></select></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {formData.target === 'tier_specific' ? (
                <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Pilih Tier *</Label>
                  <select name="target_tier" required value={formData.target_tier} onChange={handleInputChange} className={selectClass}>
                    <option value="">-- Pilih --</option><option value="bronze">Bronze</option><option value="silver">Silver</option><option value="gold">Gold</option></select></div>
              ) : <div className="space-y-2 opacity-50"><Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Tier</Label><Input disabled placeholder="Terbuka" /></div>}
              <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Tipe Nilai *</Label>
                <select name="type" value={formData.type} onChange={handleInputChange} className={selectClass}>
                  <option value="percentage">Persentase (%)</option><option value="fixed_amount">Jumlah Tetap (Rp)</option></select></div>
              <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Nilai ({formData.type === 'percentage' ? '%' : 'Rp'}) *</Label>
                <Input type="number" name="value" required step="0.01" min="0.01" placeholder={formData.type === 'percentage' ? '10' : '5000'} value={formData.value} onChange={handleInputChange} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Min. Belanja (Rp)</Label>
                <Input type="number" name="min_purchase_amount" min="0" placeholder="50000" value={formData.min_purchase_amount} onChange={handleInputChange} /></div>
              <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Maks. Potongan (Rp)</Label>
                <Input type="number" name="max_discount_amount" min="0" placeholder="20000" value={formData.max_discount_amount} onChange={handleInputChange} /></div>
              <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Tanggal Mulai *</Label>
                <Input type="date" name="start_date" required value={formData.start_date} onChange={handleInputChange} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Tanggal Akhir *</Label>
                <Input type="date" name="end_date" required value={formData.end_date} onChange={handleInputChange} /></div>
            </div>
            <DialogFooter className="gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Batal</Button>
              <Button type="submit" disabled={submitting} className="gap-1.5">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Simpan Promo</span>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
