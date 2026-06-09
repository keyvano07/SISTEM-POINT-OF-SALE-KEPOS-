'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';
import { 
  Package, Plus, Search, Edit, 
  Loader2, AlertTriangle, Filter, X, CheckCircle, Tag
} from 'lucide-react';

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  category_id: number;
  sku: string;
  barcode: string;
  name: string;
  description: string | null;
  buy_price: string;
  sell_price: string;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  is_low_stock: boolean;
  category?: Category;
}

export default function ProductManagementPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  
  // Form States (Products)
  const [formData, setFormData] = useState({
    category_id: '',
    sku: '',
    barcode: '',
    name: '',
    description: '',
    buy_price: '',
    sell_price: '',
    stock_quantity: '0',
    low_stock_threshold: '10',
    is_active: true
  });
  
  // Form States (Category)
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Alert Status
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Verification & Auth check
  useEffect(() => {
    if (token) {
      if (user && !['super_admin', 'manager'].includes(user.role)) {
        router.push('/dashboard');
        return;
      }
      fetchData();
    }
  }, [token, user, router]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories')
      ]);
      setProducts(prodRes.data.data);
      setCategories(catRes.data.data);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data inventori dari server.');
    } finally {
      setLoading(false);
    }
  };

  const triggerAlert = (type: 'success' | 'error', text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 5000);
  };

  // Handle Search & Filter locally
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.barcode.includes(searchQuery);
    const matchesCategory = selectedCategory === '' || product.category_id.toString() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenAddModal = () => {
    setFormData({
      category_id: categories[0]?.id.toString() || '',
      sku: '',
      barcode: '',
      name: '',
      description: '',
      buy_price: '',
      sell_price: '',
      stock_quantity: '0',
      low_stock_threshold: '10',
      is_active: true
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setCurrentProduct(product);
    setFormData({
      category_id: product.category_id.toString(),
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      description: product.description || '',
      buy_price: parseFloat(product.buy_price).toString(),
      sell_price: parseFloat(product.sell_price).toString(),
      stock_quantity: product.stock_quantity.toString(),
      low_stock_threshold: product.low_stock_threshold.toString(),
      is_active: product.is_active
    });
    setIsEditModalOpen(true);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/products', {
        ...formData,
        category_id: parseInt(formData.category_id),
        buy_price: parseFloat(formData.buy_price),
        sell_price: parseFloat(formData.sell_price),
        stock_quantity: parseInt(formData.stock_quantity),
        low_stock_threshold: parseInt(formData.low_stock_threshold)
      });
      if (response.data.success) {
        triggerAlert('success', 'Produk berhasil ditambahkan.');
        setIsAddModalOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Gagal menyimpan produk baru.';
      triggerAlert('error', msg);
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct) return;
    try {
      const response = await api.put(`/products/${currentProduct.id}`, {
        ...formData,
        category_id: parseInt(formData.category_id),
        buy_price: parseFloat(formData.buy_price),
        sell_price: parseFloat(formData.sell_price),
        stock_quantity: parseInt(formData.stock_quantity),
        low_stock_threshold: parseInt(formData.low_stock_threshold)
      });
      if (response.data.success) {
        triggerAlert('success', 'Detail produk berhasil diperbarui.');
        setIsEditModalOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Gagal memperbarui detail produk.';
      triggerAlert('error', msg);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const response = await api.post('/categories', { name: newCategoryName });
      if (response.data.success) {
        triggerAlert('success', 'Kategori baru berhasil dibuat.');
        setNewCategoryName('');
        setIsCatModalOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Gagal membuat kategori baru.';
      triggerAlert('error', msg);
    }
  };

  // Quick stats calculations
  const totalProductsCount = products.length;
  const lowStockCount = products.filter(p => p.is_low_stock).length;
  const totalCategoriesCount = categories.length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-background text-on-background font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-on-surface">Manajemen Inventori</h1>
            <p className="text-xs text-on-surface-variant">Kelola produk, kategori, harga jual, dan stok toko KEPOS</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCatModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-surface-container hover:bg-surface-container border border-outline-variant rounded-xl transition-all"
          >
            <Tag className="w-4 h-4 text-primary" />
            <span>Kategori Baru</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-primary hover:bg-primary/95 text-white rounded-xl shadow-md transition-all active:scale-[0.98] shadow-primary/10"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* Floating alerts */}
        {alertMsg && (
          <div className={`flex items-center gap-3 p-4 rounded-2xl border max-w-md ml-auto ${
            alertMsg.type === 'success' 
              ? 'bg-success/10 border-success/20 text-emerald-600' 
              : 'bg-error/10 border-error/20 text-error'
          }`}>
            {alertMsg.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span className="text-sm font-medium">{alertMsg.text}</span>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-surface-container-lowest border border-outline-variant rounded-3xl flex items-center justify-between transition-all duration-300 hover:translate-y-[-2px] hover:border-outline-variant/50 shadow-lg">
            <div>
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Produk</h3>
              <p className="text-3xl font-extrabold mt-1 text-white">{totalProductsCount}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Package className="w-6 h-6" />
            </div>
          </div>
          <div className={`p-6 border rounded-3xl flex items-center justify-between transition-all duration-300 hover:translate-y-[-2px] shadow-lg ${
            lowStockCount > 0 
              ? 'bg-[#451a22] border-rose-500/25 hover:border-error/40 text-error' 
              : 'bg-surface-container-lowest border-outline-variant hover:border-outline-variant/50'
          }`}>
            <div>
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Stok Kritis (Low)</h3>
              <p className={`text-3xl font-extrabold mt-1 ${lowStockCount > 0 ? 'text-error' : 'text-on-surface-variant'}`}>{lowStockCount}</p>
            </div>
            <div className={`p-3 rounded-xl ${lowStockCount > 0 ? 'bg-error/15 text-error' : 'bg-surface-container text-on-surface-variant'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <div className="p-6 bg-surface-container-lowest border border-outline-variant rounded-3xl flex items-center justify-between transition-all duration-300 hover:translate-y-[-2px] hover:border-outline-variant/50 shadow-lg">
            <div>
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Kategori</h3>
              <p className="text-3xl font-extrabold mt-1 text-white">{totalCategoriesCount}</p>
            </div>
            <div className="p-3 bg-indigo-600/10 rounded-xl text-indigo-400">
              <Tag className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Inventory Management Table / Controller Area */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 shadow-xl space-y-6">
          
          {/* Controls: Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            
            {/* Search Input */}
            <div className="relative w-full md:max-w-sm">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-on-surface-variant" />
              </span>
              <input
                type="text"
                placeholder="Cari SKU, Barcode, atau nama produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-white placeholder-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
              />
            </div>

            {/* Category Filter Dropdown */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Filter className="w-4 h-4 text-on-surface-variant" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm w-full md:w-48"
              >
                <option value="" className="bg-surface-container-lowest">Semua Kategori</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id} className="bg-surface-container-lowest">{cat.name}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Table Container */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
              <span>Memproses data inventori...</span>
            </div>
          ) : error ? (
            <div className="text-center py-20 text-error font-semibold">{error}</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-on-surface-variant">
              Tidak ada produk yang cocok dengan pencarian / filter Anda.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-outline-variant bg-surface-container/40">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-surface-container-lowest/60 text-on-surface-variant font-semibold border-b border-outline-variant">
                    <th className="p-4">SKU / Barcode</th>
                    <th className="p-4">Nama Produk</th>
                    <th className="p-4">Kategori</th>
                    <th className="p-4 text-right">Harga Pokok (Beli)</th>
                    <th className="p-4 text-right">Harga Jual</th>
                    <th className="p-4 text-center">Stok</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredProducts.map(product => (
                    <tr key={product.id} className="hover:bg-surface-container/20 transition-all group">
                      <td className="p-4 font-mono text-xs text-on-surface-variant">
                        <span className="block text-white font-semibold">{product.sku}</span>
                        <span>{product.barcode}</span>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-on-surface group-hover:text-on-surface transition-colors">{product.name}</div>
                        {product.description && <div className="text-xs text-on-surface-variant truncate max-w-[200px] mt-0.5">{product.description}</div>}
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold border border-primary/20">
                          {product.category?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-on-surface-variant">
                        Rp {parseFloat(product.buy_price).toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-right font-mono text-emerald-600 font-semibold">
                        Rp {parseFloat(product.sell_price).toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          product.is_low_stock 
                            ? 'bg-error/10 text-error border border-error/20 animate-pulse' 
                            : 'bg-success/10 text-emerald-600 border border-success/20'
                        }`}>
                          {product.stock_quantity}
                        </span>
                        {product.is_low_stock && (
                          <span className="block text-[10px] text-error mt-1.5 font-semibold">Low Stock (&le;{product.low_stock_threshold})</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {product.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-emerald-600 border border-success/25">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-container text-on-surface-variant border border-outline-variant">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            Non-Aktif
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleOpenEditModal(product)}
                          className="p-2 bg-surface-container-high hover:bg-surface-container text-primary hover:text-on-surface rounded-xl transition-all border border-outline-variant hover:border-outline-variant"
                          title="Edit Produk"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>

      {/* MODAL: Tambah Produk Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl w-full max-w-lg p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-outline-variant pb-4">
              <h2 className="text-xl font-extrabold text-white">Tambah Produk Baru</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-on-surface-variant hover:text-on-surface p-1.5 hover:bg-surface-container-low rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">SKU</label>
                  <input
                    type="text" required placeholder="INDM-GRG-001"
                    value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-white placeholder-on-surface-variant/40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Barcode</label>
                  <input
                    type="text" required placeholder="89686011162"
                    value={formData.barcode} onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-white placeholder-on-surface-variant/40"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Nama Produk</label>
                <input
                  type="text" required placeholder="Indomie Goreng Original"
                  value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-white placeholder-on-surface-variant/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Kategori</label>
                  <select
                    value={formData.category_id} onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-white"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id} className="bg-surface-container-lowest">{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Low Stock Threshold</label>
                  <input
                    type="number" required min="0"
                    value={formData.low_stock_threshold} onChange={(e) => setFormData({...formData, low_stock_threshold: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Harga Pokok (Beli)</label>
                  <input
                    type="number" required min="0" placeholder="2500"
                    value={formData.buy_price} onChange={(e) => setFormData({...formData, buy_price: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-white placeholder-on-surface-variant/40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Harga Jual</label>
                  <input
                    type="number" required min="0" placeholder="3100"
                    value={formData.sell_price} onChange={(e) => setFormData({...formData, sell_price: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-white placeholder-on-surface-variant/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Stok Awal</label>
                  <input
                    type="number" required min="0"
                    value={formData.stock_quantity} onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-white"
                  />
                </div>
                <div className="space-y-2 flex items-center pt-6">
                  <input
                    type="checkbox" id="isActiveAdd"
                    checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4.5 h-4.5 rounded accent-primary focus:ring-primary/95 bg-surface-container border border-outline-variant"
                  />
                  <label htmlFor="isActiveAdd" className="ml-2.5 text-sm text-on-surface-variant font-semibold cursor-pointer">Status Aktif</label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Keterangan (Deskripsi)</label>
                <textarea
                  placeholder="Keterangan opsional..." rows={3}
                  value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-white placeholder-on-surface-variant/40"
                />
              </div>

              <button
                type="submit"
                className="w-full h-12 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl shadow-md shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center mt-6"
              >
                Simpan Produk
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Produk */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl w-full max-w-lg p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-outline-variant pb-4">
              <h2 className="text-xl font-extrabold text-white">Edit Detail Produk</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-on-surface-variant hover:text-on-surface p-1.5 hover:bg-surface-container-low rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">SKU</label>
                  <input
                    type="text" required
                    value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Barcode</label>
                  <input
                    type="text" required
                    value={formData.barcode} onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Nama Produk</label>
                <input
                  type="text" required
                  value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Kategori</label>
                  <select
                    value={formData.category_id} onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-white"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id} className="bg-surface-container-lowest">{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Low Stock Threshold</label>
                  <input
                    type="number" required min="0"
                    value={formData.low_stock_threshold} onChange={(e) => setFormData({...formData, low_stock_threshold: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Harga Pokok (Beli)</label>
                  <input
                    type="number" required min="0"
                    value={formData.buy_price} onChange={(e) => setFormData({...formData, buy_price: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Harga Jual</label>
                  <input
                    type="number" required min="0"
                    value={formData.sell_price} onChange={(e) => setFormData({...formData, sell_price: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Stok Saat Ini (Hanya-Baca)</label>
                  <input
                    type="text" disabled
                    value={formData.stock_quantity}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm text-on-surface-variant cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2 flex items-center pt-6">
                  <input
                    type="checkbox" id="isActiveEdit"
                    checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4.5 h-4.5 rounded accent-primary focus:ring-primary/95 bg-surface-container border border-outline-variant"
                  />
                  <label htmlFor="isActiveEdit" className="ml-2.5 text-sm text-on-surface-variant font-semibold cursor-pointer">Status Aktif</label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Keterangan (Deskripsi)</label>
                <textarea
                  rows={3}
                  value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full h-12 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl shadow-md shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center mt-6"
              >
                Perbarui Produk
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Tambah Kategori */}
      {isCatModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl w-full max-w-sm p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-outline-variant pb-4">
              <h2 className="text-xl font-extrabold text-white">Kategori Baru</h2>
              <button onClick={() => setIsCatModalOpen(false)} className="text-on-surface-variant hover:text-on-surface p-1.5 hover:bg-surface-container-low rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Nama Kategori</label>
                <input
                  type="text" required placeholder="Contoh: Snack"
                  value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-white placeholder-on-surface-variant/40"
                />
              </div>

              <button
                type="submit"
                className="w-full h-12 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl shadow-md shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center mt-6"
              >
                Buat Kategori
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
