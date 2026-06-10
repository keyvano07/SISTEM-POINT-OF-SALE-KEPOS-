'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';
import { Package, Plus, Search, Edit, Loader2, AlertTriangle, Tag, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface Category { id: number; name: string; }
interface Product {
  id: number; category_id: number; sku: string; barcode: string; name: string;
  description: string | null; buy_price: string; sell_price: string;
  stock_quantity: number; low_stock_threshold: number; is_active: boolean;
  is_low_stock: boolean; category?: Category;
}

export default function ProductManagementPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    category_id: '', sku: '', barcode: '', name: '', description: '',
    buy_price: '', sell_price: '', stock_quantity: '0', low_stock_threshold: '10', is_active: true
  });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (token) {
      if (user && !['super_admin', 'manager'].includes(user.role)) { router.push('/dashboard'); return; }
      fetchData();
    }
  }, [token, user, router]);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const [prodRes, catRes] = await Promise.all([api.get('/products'), api.get('/categories')]);
      setProducts(prodRes.data.data); setCategories(catRes.data.data);
    } catch (err) { console.error(err); setError('Gagal memuat data inventori dari server.'); }
    finally { setLoading(false); }
  };

  const triggerAlert = (type: 'success' | 'error', text: string) => {
    setAlertMsg({ type, text }); setTimeout(() => setAlertMsg(null), 5000);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) || product.barcode.includes(searchQuery);
    const matchesCategory = selectedCategory === '' || product.category_id.toString() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenAddModal = () => {
    setFormData({ category_id: categories[0]?.id.toString() || '', sku: '', barcode: '', name: '', description: '',
      buy_price: '', sell_price: '', stock_quantity: '0', low_stock_threshold: '10', is_active: true });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setCurrentProduct(product);
    setFormData({
      category_id: product.category_id.toString(), sku: product.sku, barcode: product.barcode,
      name: product.name, description: product.description || '',
      buy_price: parseFloat(product.buy_price).toString(), sell_price: parseFloat(product.sell_price).toString(),
      stock_quantity: product.stock_quantity.toString(), low_stock_threshold: product.low_stock_threshold.toString(),
      is_active: product.is_active
    });
    setIsEditModalOpen(true);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/products', { ...formData, category_id: parseInt(formData.category_id),
        buy_price: parseFloat(formData.buy_price), sell_price: parseFloat(formData.sell_price),
        stock_quantity: parseInt(formData.stock_quantity), low_stock_threshold: parseInt(formData.low_stock_threshold) });
      if (response.data.success) { triggerAlert('success', 'Produk berhasil ditambahkan.'); setIsAddModalOpen(false); fetchData(); }
    } catch (err) { console.error(err);
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Gagal menyimpan produk baru.';
      triggerAlert('error', msg); }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault(); if (!currentProduct) return;
    try {
      const response = await api.put(`/products/${currentProduct.id}`, { ...formData, category_id: parseInt(formData.category_id),
        buy_price: parseFloat(formData.buy_price), sell_price: parseFloat(formData.sell_price),
        stock_quantity: parseInt(formData.stock_quantity), low_stock_threshold: parseInt(formData.low_stock_threshold) });
      if (response.data.success) { triggerAlert('success', 'Detail produk berhasil diperbarui.'); setIsEditModalOpen(false); fetchData(); }
    } catch (err) { console.error(err);
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Gagal memperbarui detail produk.';
      triggerAlert('error', msg); }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newCategoryName.trim()) return;
    try {
      const response = await api.post('/categories', { name: newCategoryName });
      if (response.data.success) { triggerAlert('success', 'Kategori baru berhasil dibuat.'); setNewCategoryName(''); setIsCatModalOpen(false); fetchData(); }
    } catch (err) { console.error(err);
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Gagal membuat kategori baru.';
      triggerAlert('error', msg); }
  };

  const totalProductsCount = products.length;
  const lowStockCount = products.filter(p => p.is_low_stock).length;
  const totalCategoriesCount = categories.length;

  const ProductFormFields = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">SKU</Label>
          <Input type="text" required placeholder="INDM-GRG-001" value={formData.sku}
            onChange={(e) => setFormData({...formData, sku: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Barcode</Label>
          <Input type="text" required placeholder="89686011162" value={formData.barcode}
            onChange={(e) => setFormData({...formData, barcode: e.target.value})} />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Nama Produk</Label>
        <Input type="text" required placeholder="Indomie Goreng Original" value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Kategori</Label>
          <select value={formData.category_id} onChange={(e) => setFormData({...formData, category_id: e.target.value})}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1">
            {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
          </select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Low Stock Threshold</Label>
          <Input type="number" required min="0" value={formData.low_stock_threshold}
            onChange={(e) => setFormData({...formData, low_stock_threshold: e.target.value})} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Harga Pokok (Beli)</Label>
          <Input type="number" required min="0" placeholder="2500" value={formData.buy_price}
            onChange={(e) => setFormData({...formData, buy_price: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Harga Jual</Label>
          <Input type="number" required min="0" placeholder="3100" value={formData.sell_price}
            onChange={(e) => setFormData({...formData, sell_price: e.target.value})} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            {isEdit ? 'Stok Saat Ini (Hanya-Baca)' : 'Stok Awal'}
          </Label>
          <Input type={isEdit ? 'text' : 'number'} disabled={isEdit} required={!isEdit} min="0"
            value={formData.stock_quantity} onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})} />
        </div>
        <div className="space-y-2 flex items-center pt-7">
          <input type="checkbox" id={isEdit ? 'isActiveEdit' : 'isActiveAdd'} checked={formData.is_active}
            onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
            className="w-4 h-4 rounded accent-primary" />
          <Label htmlFor={isEdit ? 'isActiveEdit' : 'isActiveAdd'} className="ml-2 text-sm cursor-pointer">Status Aktif</Label>
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Keterangan (Deskripsi)</Label>
        <Textarea placeholder="Keterangan opsional..." rows={3} value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})} />
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-lg"><Package className="w-5 h-5" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Manajemen Inventori</h1>
            <p className="text-sm text-muted-foreground">Kelola produk, kategori, harga jual, dan stok toko KEPOS</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsCatModalOpen(true)} className="gap-2">
            <Tag className="w-4 h-4" /> Kategori Baru
          </Button>
          <Button onClick={handleOpenAddModal} className="gap-2">
            <Plus className="w-4 h-4" /> Tambah Produk
          </Button>
        </div>
      </div>

      {/* Alert */}
      {alertMsg && (
        <Alert variant={alertMsg.type === 'success' ? 'success' : 'destructive'} className="animate-fade-in">
          {alertMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <AlertDescription className="font-medium">{alertMsg.text}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-5 flex items-center justify-between">
          <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Produk</p>
            <p className="text-3xl font-bold mt-1">{totalProductsCount}</p></div>
          <div className="p-2.5 bg-primary/10 rounded-lg text-primary"><Package className="w-5 h-5" /></div>
        </CardContent></Card>
        <Card className={lowStockCount > 0 ? 'border-destructive/30 bg-destructive/5' : ''}>
          <CardContent className="p-5 flex items-center justify-between">
            <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stok Kritis</p>
              <p className={`text-3xl font-bold mt-1 ${lowStockCount > 0 ? 'text-destructive' : ''}`}>{lowStockCount}</p></div>
            <div className={`p-2.5 rounded-lg ${lowStockCount > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
              <AlertTriangle className="w-5 h-5" /></div>
          </CardContent>
        </Card>
        <Card><CardContent className="p-5 flex items-center justify-between">
          <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Kategori</p>
            <p className="text-3xl font-bold mt-1">{totalCategoriesCount}</p></div>
          <div className="p-2.5 bg-primary/10 rounded-lg text-primary"><Tag className="w-5 h-5" /></div>
        </CardContent></Card>
      </div>

      {/* Table Area */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari SKU, Barcode, atau nama produk..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full md:w-48">
              <option value="">Semua Kategori</option>
              {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
            </select>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" /><span>Memproses data inventori...</span>
            </div>
          ) : error ? (
            <div className="text-center py-20 text-destructive font-semibold">{error}</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">Tidak ada produk yang cocok.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>SKU / Barcode</TableHead><TableHead>Nama Produk</TableHead>
                  <TableHead>Kategori</TableHead><TableHead className="text-right">Harga Beli</TableHead>
                  <TableHead className="text-right">Harga Jual</TableHead><TableHead className="text-center">Stok</TableHead>
                  <TableHead className="text-center">Status</TableHead><TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(product => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-xs">
                      <span className="block font-semibold">{product.sku}</span>
                      <span className="text-muted-foreground">{product.barcode}</span>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">{product.name}</div>
                      {product.description && <div className="text-xs text-muted-foreground truncate max-w-[200px] mt-0.5">{product.description}</div>}
                    </TableCell>
                    <TableCell><Badge variant="secondary">{product.category?.name || 'Uncategorized'}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      Rp {parseFloat(product.buy_price).toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right font-mono text-emerald-600 font-semibold">
                      Rp {parseFloat(product.sell_price).toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={product.is_low_stock ? 'destructive' : 'success'} className={product.is_low_stock ? 'animate-pulse' : ''}>
                        {product.stock_quantity}
                      </Badge>
                      {product.is_low_stock && <span className="block text-[10px] text-destructive mt-1 font-semibold">Low (≤{product.low_stock_threshold})</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {product.is_active ? (
                        <Badge variant="success" className="gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Aktif</Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Non-Aktif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="outline" size="icon" onClick={() => handleOpenEditModal(product)} className="h-8 w-8">
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Product Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Produk Baru</DialogTitle>
            <DialogDescription>Isi detail produk yang akan ditambahkan ke inventori.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddProduct}>
            <ProductFormFields />
            <DialogFooter className="mt-6">
              <Button type="submit" className="w-full">Simpan Produk</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Detail Produk</DialogTitle>
            <DialogDescription>Perbarui informasi produk yang sudah ada.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProduct}>
            <ProductFormFields isEdit />
            <DialogFooter className="mt-6">
              <Button type="submit" className="w-full">Perbarui Produk</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={isCatModalOpen} onOpenChange={setIsCatModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Kategori Baru</DialogTitle>
            <DialogDescription>Tambahkan kategori produk baru.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCategory} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Nama Kategori</Label>
              <Input type="text" required placeholder="Contoh: Snack" value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full">Buat Kategori</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
