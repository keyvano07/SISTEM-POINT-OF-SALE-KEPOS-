'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';
import { 
  Package, Plus, Search, Edit, ChevronLeft, 
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
    if (!token) {
      router.push('/login');
      return;
    }
    if (user && !['super_admin', 'manager'].includes(user.role)) {
      router.push('/dashboard');
      return;
    }
    fetchData();
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
    } catch (err: any) {
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
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Gagal menyimpan produk baru.';
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
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Gagal memperbarui detail produk.';
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
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Gagal membuat kategori baru.';
      triggerAlert('error', msg);
    }
  };

  // Quick stats calculations
  const totalProductsCount = products.length;
  const lowStockCount = products.filter(p => p.is_low_stock).length;
  const totalCategoriesCount = categories.length;

  return (
    <div className="min-h-screen bg-[#0B0F17] text-white font-sans">
      {/* Top Navbar */}
      <nav className="border-b border-white/10 px-8 py-4 flex justify-between items-center bg-white/5 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/dashboard')}
            className="p-2 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-600 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg block">Manajemen Inventori</span>
              <span className="text-xs text-gray-400 capitalize">Role: {user?.role}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCatModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
          >
            <Tag className="w-4 h-4 text-violet-400" />
            <span>Kategori Baru</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl shadow-md transition-all active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk</span>
          </button>
        </div>
      </nav>

      {/* Main Layout Content */}
      <main className="max-w-7xl mx-auto p-8 space-y-6">
        
        {/* Floating alerts */}
        {alertMsg && (
          <div className={`flex items-center gap-3 p-4 rounded-2xl border max-w-md ml-auto ${
            alertMsg.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            {alertMsg.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span className="text-sm font-medium">{alertMsg.text}</span>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Produk</h3>
              <p className="text-3xl font-extrabold mt-1 text-white">{totalProductsCount}</p>
            </div>
            <div className="p-4 bg-violet-600/10 rounded-2xl text-violet-400">
              <Package className="w-6 h-6" />
            </div>
          </div>
          <div className="p-6 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Stok Kritis (Low)</h3>
              <p className={`text-3xl font-extrabold mt-1 ${lowStockCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{lowStockCount}</p>
            </div>
            <div className={`p-4 rounded-2xl ${lowStockCount > 0 ? 'bg-amber-600/10 text-amber-400' : 'bg-emerald-600/10 text-emerald-400'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <div className="p-6 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Kategori</h3>
              <p className="text-3xl font-extrabold mt-1 text-white">{totalCategoriesCount}</p>
            </div>
            <div className="p-4 bg-indigo-600/10 rounded-2xl text-indigo-400">
              <Tag className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Inventory Management Table / Controller Area */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
          
          {/* Controls: Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            
            {/* Search Input */}
            <div className="relative w-full md:max-w-sm">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-gray-500" />
              </span>
              <input
                type="text"
                placeholder="Cari SKU, Barcode, atau nama produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Category Filter Dropdown */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all text-sm w-full md:w-48"
              >
                <option value="">Semua Kategori</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Table Container */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
              <span>Memproses data inventori...</span>
            </div>
          ) : error ? (
            <div className="text-center py-20 text-rose-400 font-semibold">{error}</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              Tidak ada produk yang cocok dengan pencarian / filter Anda.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/5">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-white/5 text-gray-300 font-semibold border-b border-white/10">
                    <th className="p-4">SKU / Barcode</th>
                    <th className="p-4">Nama Produk</th>
                    <th className="p-4">Kategori</th>
                    <th className="p-4 text-right">Harga Pokok (Beli)</th>
                    <th className="p-4 text-right">Harga Jual</th>
                    <th className="p-4 text-center">Stok</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredProducts.map(product => (
                    <tr key={product.id} className="hover:bg-white/5 transition-all">
                      <td className="p-4 font-mono text-xs text-gray-400">
                        <span className="block text-white font-semibold">{product.sku}</span>
                        <span>{product.barcode}</span>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold">{product.name}</div>
                        {product.description && <div className="text-xs text-gray-500 truncate max-w-[200px]">{product.description}</div>}
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-violet-500/10 text-violet-400 rounded-full text-xs font-semibold">
                          {product.category?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono">
                        Rp {parseFloat(product.buy_price).toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-right font-mono text-emerald-400">
                        Rp {parseFloat(product.sell_price).toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          product.is_low_stock 
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {product.stock_quantity}
                        </span>
                        {product.is_low_stock && (
                          <span className="block text-[10px] text-amber-500 mt-1.5 font-semibold">Low Stock (&le;{product.low_stock_threshold})</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleOpenEditModal(product)}
                          className="p-2 bg-white/5 hover:bg-white/10 text-violet-400 hover:text-violet-300 rounded-xl transition-all border border-white/5"
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

      </main>

      {/* MODAL: Tambah Produk Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111622] border border-white/10 rounded-3xl w-full max-w-lg p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Tambah Produk Baru</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white p-1 hover:bg-white/5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">SKU</label>
                  <input
                    type="text" required placeholder="INDM-GRG-001"
                    value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Barcode</label>
                  <input
                    type="text" required placeholder="89686011162"
                    value={formData.barcode} onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-semibold uppercase">Nama Produk</label>
                <input
                  type="text" required placeholder="Indomie Goreng Original"
                  value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Kategori</label>
                  <select
                    value={formData.category_id} onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id} className="bg-[#111622]">{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Low Stock Threshold</label>
                  <input
                    type="number" required min="0"
                    value={formData.low_stock_threshold} onChange={(e) => setFormData({...formData, low_stock_threshold: e.target.value})}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Harga Pokok (Beli)</label>
                  <input
                    type="number" required min="0" placeholder="2500"
                    value={formData.buy_price} onChange={(e) => setFormData({...formData, buy_price: e.target.value})}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Harga Jual</label>
                  <input
                    type="number" required min="0" placeholder="3100"
                    value={formData.sell_price} onChange={(e) => setFormData({...formData, sell_price: e.target.value})}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Stok Awal</label>
                  <input
                    type="number" required min="0"
                    value={formData.stock_quantity} onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="space-y-2 flex items-center pt-6">
                  <input
                    type="checkbox" id="isActiveAdd"
                    checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4 h-4 rounded accent-violet-600 focus:ring-violet-500 bg-black/30 border border-white/10"
                  />
                  <label htmlFor="isActiveAdd" className="ml-2.5 text-sm text-gray-300 font-medium cursor-pointer">Status Aktif</label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-semibold uppercase">Keterangan (Deskripsi)</label>
                <textarea
                  placeholder="Keterangan opsional..." rows={3}
                  value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-98"
              >
                Simpan Produk
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Produk */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111622] border border-white/10 rounded-3xl w-full max-w-lg p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Detail Produk</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-white p-1 hover:bg-white/5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">SKU</label>
                  <input
                    type="text" required
                    value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Barcode</label>
                  <input
                    type="text" required
                    value={formData.barcode} onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-semibold uppercase">Nama Produk</label>
                <input
                  type="text" required
                  value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Kategori</label>
                  <select
                    value={formData.category_id} onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id} className="bg-[#111622]">{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Low Stock Threshold</label>
                  <input
                    type="number" required min="0"
                    value={formData.low_stock_threshold} onChange={(e) => setFormData({...formData, low_stock_threshold: e.target.value})}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Harga Pokok (Beli)</label>
                  <input
                    type="number" required min="0"
                    value={formData.buy_price} onChange={(e) => setFormData({...formData, buy_price: e.target.value})}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Harga Jual</label>
                  <input
                    type="number" required min="0"
                    value={formData.sell_price} onChange={(e) => setFormData({...formData, sell_price: e.target.value})}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Stok Saat Ini (Hanya-Baca)</label>
                  <input
                    type="text" disabled
                    value={formData.stock_quantity}
                    className="w-full bg-black/10 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2 flex items-center pt-6">
                  <input
                    type="checkbox" id="isActiveEdit"
                    checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4 h-4 rounded accent-violet-600 focus:ring-violet-500 bg-black/30 border border-white/10"
                  />
                  <label htmlFor="isActiveEdit" className="ml-2.5 text-sm text-gray-300 font-medium cursor-pointer">Status Aktif</label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-semibold uppercase">Keterangan (Deskripsi)</label>
                <textarea
                  rows={3}
                  value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-98"
              >
                Perbarui Produk
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Tambah Kategori */}
      {isCatModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111622] border border-white/10 rounded-3xl w-full max-w-sm p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Kategori Baru</h2>
              <button onClick={() => setIsCatModalOpen(false)} className="text-gray-400 hover:text-white p-1 hover:bg-white/5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-semibold uppercase">Nama Kategori</label>
                <input
                  type="text" required placeholder="Contoh: Snack"
                  value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-98"
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
