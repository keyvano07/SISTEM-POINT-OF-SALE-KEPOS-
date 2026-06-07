'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';
import { 
  Clipboard, Plus, Search, ChevronLeft, 
  Loader2, AlertTriangle, X, CheckCircle, PackageCheck, ListFilter
} from 'lucide-react';

interface Product {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  stock_quantity: number;
  buy_price: string;
}

interface StockAdjustment {
  id: number;
  product_id: number;
  quantity_change: number;
  financial_value: string;
  reason_code: 'damaged' | 'expired' | 'opname';
  status: 'approved' | 'pending_approval' | 'rejected';
  notes: string | null;
  approved_at: string | null;
  created_at: string;
  product?: Product;
  requester?: { name: string };
  approver?: { name: string } | null;
}

export default function StockerDashboardPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab State: 'adjust' for stock loss/opname, 'restock' for incoming goods
  const [activeTab, setActiveTab] = useState<'adjust' | 'restock'>('adjust');

  // Form State: Adjustment
  const [adjustForm, setAdjustForm] = useState({
    product_id: '',
    quantity_change: '',
    reason_code: 'opname',
    notes: ''
  });

  // Form State: Restock
  const [restockForm, setRestockForm] = useState({
    product_id: '',
    quantity: '',
    notes: ''
  });

  // Alert State
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    // Stocker, supervisor, manager, and super_admin are authorized
    if (user && !['super_admin', 'manager', 'supervisor', 'stocker'].includes(user.role)) {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [token, user, router]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, adjRes] = await Promise.all([
        api.get('/products'),
        api.get('/stock-adjustments')
      ]);
      setProducts(prodRes.data.data);
      setAdjustments(adjRes.data.data);
      
      // Auto-populate default product in forms if available
      if (prodRes.data.data.length > 0) {
        const firstId = prodRes.data.data[0].id.toString();
        setAdjustForm(prev => ({ ...prev, product_id: firstId }));
        setRestockForm(prev => ({ ...prev, product_id: firstId }));
      }
    } catch (err: any) {
      console.error(err);
      setError('Gagal memuat data dari server backend.');
    } finally {
      setLoading(false);
    }
  };

  const triggerAlert = (type: 'success' | 'error', text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 5000);
  };

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustForm.product_id || !adjustForm.quantity_change) return;
    
    setSubmitting(true);
    try {
      const response = await api.post('/stock-adjustments', {
        product_id: parseInt(adjustForm.product_id),
        quantity_change: parseInt(adjustForm.quantity_change),
        reason_code: adjustForm.reason_code,
        notes: adjustForm.notes
      });
      if (response.data.success) {
        triggerAlert('success', response.data.message);
        setAdjustForm(prev => ({
          ...prev,
          quantity_change: '',
          notes: ''
        }));
        fetchData();
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Gagal menyimpan penyesuaian stok.';
      triggerAlert('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockForm.product_id || !restockForm.quantity) return;

    setSubmitting(true);
    try {
      const response = await api.post('/stock-adjustments/restock', {
        product_id: parseInt(restockForm.product_id),
        quantity: parseInt(restockForm.quantity),
        notes: restockForm.notes
      });
      if (response.data.success) {
        triggerAlert('success', response.data.message);
        setRestockForm(prev => ({
          ...prev,
          quantity: '',
          notes: ''
        }));
        fetchData();
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Gagal menyimpan barang masuk.';
      triggerAlert('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Find selected product info for helper text (e.g. current stock)
  const getSelectedProductInfo = (idString: string) => {
    const prod = products.find(p => p.id.toString() === idString);
    return prod ? `Stok saat ini: ${prod.stock_quantity} unit` : '';
  };

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
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Clipboard className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg block">Gudang & Logistik</span>
              <span className="text-xs text-gray-400 capitalize">Petugas: {user?.name} ({user?.role})</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Form Submissions */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Toast Notification inside column */}
          {alertMsg && (
            <div className={`flex items-center gap-3 p-4 rounded-2xl border ${
              alertMsg.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              {alertMsg.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
              <span className="text-sm font-medium">{alertMsg.text}</span>
            </div>
          )}

          {/* Form Card */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
            
            {/* Tab Selector */}
            <div className="flex bg-black/30 p-1.5 rounded-xl border border-white/5">
              <button
                onClick={() => setActiveTab('adjust')}
                className={`flex-1 py-2 text-center text-sm font-bold rounded-lg transition-all ${
                  activeTab === 'adjust' 
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Opname / Selisih
              </button>
              <button
                onClick={() => setActiveTab('restock')}
                className={`flex-1 py-2 text-center text-sm font-bold rounded-lg transition-all ${
                  activeTab === 'restock' 
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Barang Masuk
              </button>
            </div>

            {/* TAB CONTENT: ADJUSTMENT */}
            {activeTab === 'adjust' && (
              <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
                <h3 className="text-base font-bold text-violet-400">Form Penyesuaian Stok</h3>
                
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Pilih Produk</label>
                  {loading ? (
                    <div className="text-xs text-gray-500">Memuat produk...</div>
                  ) : (
                    <>
                      <select
                        value={adjustForm.product_id}
                        onChange={(e) => setAdjustForm({ ...adjustForm, product_id: e.target.value })}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id} className="bg-[#111622]">
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-emerald-400 block mt-1 font-medium">
                        {getSelectedProductInfo(adjustForm.product_id)}
                      </span>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Kuantitas Perubahan</label>
                  <input
                    type="number"
                    required
                    placeholder="Contoh: -5 untuk susut, 5 untuk surplus"
                    value={adjustForm.quantity_change}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantity_change: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-600"
                  />
                  <span className="text-[10px] text-gray-400 block mt-1">
                    Gunakan tanda minus (-) jika stok berkurang (rusak/hilang).
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Alasan Penyesuaian</label>
                  <select
                    value={adjustForm.reason_code}
                    onChange={(e) => setAdjustForm({ ...adjustForm, reason_code: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="opname" className="bg-[#111622]">Selisih Stock Opname (Surplus/Defisit)</option>
                    <option value="damaged" className="bg-[#111622]">Barang Rusak (Damaged)</option>
                    <option value="expired" className="bg-[#111622]">Kadaluwarsa (Expired)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Catatan</label>
                  <textarea
                    placeholder="Masukkan alasan detail penyesuaian..."
                    rows={3}
                    value={adjustForm.notes}
                    onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Ajukan Penyesuaian</span>
                </button>
              </form>
            )}

            {/* TAB CONTENT: RESTOCK */}
            {activeTab === 'restock' && (
              <form onSubmit={handleRestockSubmit} className="space-y-4">
                <h3 className="text-base font-bold text-indigo-400">Form Input Barang Masuk</h3>
                
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Pilih Produk</label>
                  {loading ? (
                    <div className="text-xs text-gray-500">Memuat produk...</div>
                  ) : (
                    <>
                      <select
                        value={restockForm.product_id}
                        onChange={(e) => setRestockForm({ ...restockForm, product_id: e.target.value })}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id} className="bg-[#111622]">
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-emerald-400 block mt-1 font-medium">
                        {getSelectedProductInfo(restockForm.product_id)}
                      </span>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Kuantitas Masuk</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Contoh: 50"
                    value={restockForm.quantity}
                    onChange={(e) => setRestockForm({ ...restockForm, quantity: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Catatan Penerimaan</label>
                  <textarea
                    placeholder="Nomor PO, pengirim, atau detail restock..."
                    rows={3}
                    value={restockForm.notes}
                    onChange={(e) => setRestockForm({ ...restockForm, notes: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Simpan Barang Masuk</span>
                </button>
              </form>
            )}

          </div>

        </div>

        {/* Right Column: History List */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <Clipboard className="w-5 h-5 text-violet-400" />
                <h2 className="text-lg font-bold">Riwayat Log Gudang</h2>
              </div>
              <button 
                onClick={fetchData} 
                className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-all"
              >
                Refresh Data
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
                <span>Memuat histori gudang...</span>
              </div>
            ) : error ? (
              <div className="text-center py-20 text-rose-400 font-semibold">{error}</div>
            ) : adjustments.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                Belum ada transaksi log penyesuaian stok yang terdaftar.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/5">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-white/5 text-gray-300 font-semibold border-b border-white/10">
                      <th className="p-4">Tanggal</th>
                      <th className="p-4">Produk</th>
                      <th className="p-4 text-center">Selisih</th>
                      <th className="p-4 text-right">Nilai Finansial</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {adjustments.map(adj => (
                      <tr key={adj.id} className="hover:bg-white/5 transition-all">
                        <td className="p-4 text-xs text-gray-400">
                          {new Date(adj.created_at).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold">{adj.product?.name || 'Produk Terhapus'}</div>
                          <div className="text-[10px] text-gray-500 font-mono">{adj.product?.sku}</div>
                        </td>
                        <td className={`p-4 text-center font-bold ${
                          adj.quantity_change > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {adj.quantity_change > 0 ? `+${adj.quantity_change}` : adj.quantity_change}
                        </td>
                        <td className="p-4 text-right font-mono text-xs">
                          Rp {parseFloat(adj.financial_value).toLocaleString('id-ID')}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                            adj.status === 'approved'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : adj.status === 'pending_approval'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          }`}>
                            {adj.status === 'approved' ? 'Approved' : adj.status === 'pending_approval' ? 'Pending' : 'Rejected'}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-gray-400 max-w-[150px] truncate">
                          <div className="capitalize font-semibold text-gray-300">
                            {adj.reason_code === 'damaged' ? 'Rusak' : adj.reason_code === 'expired' ? 'Kedaluwarsa' : 'Opname'}
                          </div>
                          {adj.notes && <div className="text-[11px] text-gray-500 mt-0.5">{adj.notes}</div>}
                          {adj.approver && <div className="text-[9px] text-violet-400 mt-1">Oleh: {adj.approver.name}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>

      </main>
    </div>
  );
}
