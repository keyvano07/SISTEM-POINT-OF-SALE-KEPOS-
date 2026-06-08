'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';
import { 
  Clipboard, 
  Loader2, AlertTriangle, CheckCircle
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

  // Tab State: 'restock' for incoming goods, 'damaged' for stock losses, 'opname' for physical audit discrepancy
  const [activeTab, setActiveTab] = useState<'restock' | 'damaged' | 'opname'>('restock');

  // Form State: Restock
  const [restockForm, setRestockForm] = useState({
    product_id: '',
    quantity: '',
    notes: ''
  });

  // Form State: Damaged/Expired
  const [damagedForm, setDamagedForm] = useState({
    product_id: '',
    quantity: '',
    reason_code: 'damaged', // 'damaged' | 'expired'
    notes: ''
  });

  // Form State: Opname
  const [opnameForm, setOpnameForm] = useState({
    product_id: '',
    quantity: '',
    type: 'deficit', // 'surplus' | 'deficit'
    notes: ''
  });

  // Alert State
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Dialog/Modal State for Approve/Reject
  const [pinModal, setPinModal] = useState<{
    isOpen: boolean;
    action: 'approve' | 'reject';
    adjustmentId: number | null;
    pin: string;
    notes: string;
    error: string | null;
  }>({
    isOpen: false,
    action: 'approve',
    adjustmentId: null,
    pin: '',
    notes: '',
    error: null,
  });

  useEffect(() => {
    if (token) {
      // Stocker, supervisor, manager, and super_admin are authorized
      if (user && !['super_admin', 'manager', 'supervisor', 'stocker'].includes(user.role)) {
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
      const [prodRes, adjRes] = await Promise.all([
        api.get('/products'),
        api.get('/stock-adjustments')
      ]);
      setProducts(prodRes.data.data);
      setAdjustments(adjRes.data.data);
      
      // Auto-populate default product in forms if available
      if (prodRes.data.data.length > 0) {
        const firstId = prodRes.data.data[0].id.toString();
        setRestockForm(prev => ({ ...prev, product_id: firstId }));
        setDamagedForm(prev => ({ ...prev, product_id: firstId }));
        setOpnameForm(prev => ({ ...prev, product_id: firstId }));
      }
    } catch (err) {
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

  const openPinModal = (action: 'approve' | 'reject', adjustmentId: number) => {
    setPinModal({
      isOpen: true,
      action,
      adjustmentId,
      pin: '',
      notes: '',
      error: null
    });
  };

  const closePinModal = () => {
    setPinModal(prev => ({ ...prev, isOpen: false }));
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { action, adjustmentId, pin, notes } = pinModal;
    if (!adjustmentId || !pin) return;

    if (pin.length !== 6 || isNaN(Number(pin))) {
      setPinModal(prev => ({ ...prev, error: 'PIN harus berupa 6 digit angka.' }));
      return;
    }

    setSubmitting(true);
    setPinModal(prev => ({ ...prev, error: null }));
    try {
      const endpoint = `/stock-adjustments/${adjustmentId}/${action}`;
      const payload: { pin: string; notes?: string } = { pin };
      if (action === 'reject') {
        payload.notes = notes;
      }
      
      const response = await api.post(endpoint, payload);
      if (response.data.success) {
        triggerAlert('success', response.data.message);
        closePinModal();
        fetchData();
      }
    } catch (err) {
      console.error(err);
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Gagal memproses otorisasi PIN.';
      setPinModal(prev => ({ ...prev, error: msg }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDamagedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!damagedForm.product_id || !damagedForm.quantity) return;

    setSubmitting(true);
    try {
      const qty = Math.abs(parseInt(damagedForm.quantity)) * -1;
      const response = await api.post('/stock-adjustments', {
        product_id: parseInt(damagedForm.product_id),
        quantity_change: qty,
        reason_code: damagedForm.reason_code,
        notes: damagedForm.notes
      });
      if (response.data.success) {
        triggerAlert('success', response.data.message);
        setDamagedForm(prev => ({
          ...prev,
          quantity: '',
          notes: ''
        }));
        fetchData();
      }
    } catch (err) {
      console.error(err);
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Gagal menyimpan pencatatan barang rusak/expired.';
      triggerAlert('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpnameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opnameForm.product_id || !opnameForm.quantity) return;

    setSubmitting(true);
    try {
      const baseQty = Math.abs(parseInt(opnameForm.quantity));
      const qty = opnameForm.type === 'deficit' ? -baseQty : baseQty;
      
      const response = await api.post('/stock-adjustments', {
        product_id: parseInt(opnameForm.product_id),
        quantity_change: qty,
        reason_code: 'opname',
        notes: opnameForm.notes
      });
      if (response.data.success) {
        triggerAlert('success', response.data.message);
        setOpnameForm(prev => ({
          ...prev,
          quantity: '',
          notes: ''
        }));
        fetchData();
      }
    } catch (err) {
      console.error(err);
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Gagal menyimpan penyesuaian stok opname.';
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
    } catch (err) {
      console.error(err);
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Gagal menyimpan barang masuk.';
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
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-[#020617] text-white font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A] border border-slate-800 p-6 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-600/10 text-violet-400 rounded-xl">
            <Clipboard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Gudang & Logistik</h1>
            <p className="text-xs text-slate-400">Pencatatan penyesuaian stok, restock barang masuk, dan monitoring log</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
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
            <div className="flex flex-col sm:flex-row bg-black/30 p-1.5 rounded-xl border border-white/5 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('restock')}
                className={`flex-1 py-2 px-3 text-center text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'restock' 
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Barang Masuk
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('damaged')}
                className={`flex-1 py-2 px-3 text-center text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'damaged' 
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Rusak / Expired
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('opname')}
                className={`flex-1 py-2 px-3 text-center text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'opname' 
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Stok Opname
              </button>
            </div>

            {/* TAB CONTENT: RESTOCK */}
            {activeTab === 'restock' && (
              <form onSubmit={handleRestockSubmit} className="space-y-4">
                <h3 className="text-base font-bold text-violet-400">Form Input Barang Masuk</h3>
                
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
                  <label className="text-xs text-gray-400 font-semibold uppercase">Kuantitas Masuk (Tambahan)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Contoh: 50"
                    value={restockForm.quantity}
                    onChange={(e) => setRestockForm({ ...restockForm, quantity: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-600"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Hanya masukkan angka positif. Stok produk akan langsung bertambah.
                  </span>
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
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Simpan Barang Masuk</span>
                </button>
              </form>
            )}

            {/* TAB CONTENT: DAMAGED / EXPIRED */}
            {activeTab === 'damaged' && (
              <form onSubmit={handleDamagedSubmit} className="space-y-4">
                <h3 className="text-base font-bold text-rose-400">Pencatatan Barang Rusak / Kadaluwarsa</h3>
                
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Pilih Produk</label>
                  {loading ? (
                    <div className="text-xs text-gray-500">Memuat produk...</div>
                  ) : (
                    <>
                      <select
                        value={damagedForm.product_id}
                        onChange={(e) => setDamagedForm({ ...damagedForm, product_id: e.target.value })}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id} className="bg-[#111622]">
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-emerald-400 block mt-1 font-medium">
                        {getSelectedProductInfo(damagedForm.product_id)}
                      </span>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Kuantitas Rusak / Susut</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Contoh: 5 (stok akan berkurang)"
                    value={damagedForm.quantity}
                    onChange={(e) => setDamagedForm({ ...damagedForm, quantity: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-600"
                  />
                  <span className="text-[10px] text-rose-400 font-medium block mt-1">
                    ⚠️ Masukkan jumlah sebagai angka positif. Sistem akan otomatis memprosesnya sebagai pengurangan stok (-{damagedForm.quantity || '0'}).
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Alasan Kategori</label>
                  <select
                    value={damagedForm.reason_code}
                    onChange={(e) => setDamagedForm({ ...damagedForm, reason_code: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="damaged" className="bg-[#111622]">Barang Rusak (Damaged)</option>
                    <option value="expired" className="bg-[#111622]">Kadaluwarsa (Expired)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Catatan / Detail Kronologi</label>
                  <textarea
                    placeholder="Contoh: Bocor di rak, kardus penyok saat dipindahkan..."
                    rows={3}
                    value={damagedForm.notes}
                    onChange={(e) => setDamagedForm({ ...damagedForm, notes: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Catat Barang Rusak/Expired</span>
                </button>
              </form>
            )}

            {/* TAB CONTENT: STOCK OPNAME */}
            {activeTab === 'opname' && (
              <form onSubmit={handleOpnameSubmit} className="space-y-4">
                <h3 className="text-base font-bold text-amber-400">Penyesuaian Stok Opname</h3>
                
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Pilih Produk</label>
                  {loading ? (
                    <div className="text-xs text-gray-500">Memuat produk...</div>
                  ) : (
                    <>
                      <select
                        value={opnameForm.product_id}
                        onChange={(e) => setOpnameForm({ ...opnameForm, product_id: e.target.value })}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id} className="bg-[#111622]">
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-emerald-400 block mt-1 font-medium">
                        {getSelectedProductInfo(opnameForm.product_id)}
                      </span>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase block">Tipe Selisih Opname</label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-semibold cursor-pointer transition-all ${
                      opnameForm.type === 'deficit'
                        ? 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                        : 'bg-black/30 border-white/10 text-gray-400 hover:text-white'
                    }`}>
                      <input
                        type="radio"
                        name="opname_type"
                        value="deficit"
                        checked={opnameForm.type === 'deficit'}
                        onChange={() => setOpnameForm({ ...opnameForm, type: 'deficit' })}
                        className="sr-only"
                      />
                      <span>Kurang (Defisit)</span>
                    </label>
                    <label className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-semibold cursor-pointer transition-all ${
                      opnameForm.type === 'surplus'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                        : 'bg-black/30 border-white/10 text-gray-400 hover:text-white'
                    }`}>
                      <input
                        type="radio"
                        name="opname_type"
                        value="surplus"
                        checked={opnameForm.type === 'surplus'}
                        onChange={() => setOpnameForm({ ...opnameForm, type: 'surplus' })}
                        className="sr-only"
                      />
                      <span>Lebih (Surplus)</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Jumlah Selisih Kuantitas</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Contoh: 3"
                    value={opnameForm.quantity}
                    onChange={(e) => setOpnameForm({ ...opnameForm, quantity: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-600"
                  />
                  <span className="text-[10px] block mt-1 font-medium text-slate-400">
                    {opnameForm.type === 'deficit' ? (
                      <span className="text-rose-400">Stok akan berkurang sebanyak -{opnameForm.quantity || '0'}.</span>
                    ) : (
                      <span className="text-emerald-400">Stok akan bertambah sebanyak +{opnameForm.quantity || '0'}.</span>
                    )}
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase">Catatan Opname</label>
                  <textarea
                    placeholder="Masukkan detail selisih opname fisik..."
                    rows={3}
                    value={opnameForm.notes}
                    onChange={(e) => setOpnameForm({ ...opnameForm, notes: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Simpan Penyesuaian Opname</span>
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
                          {adj.status === 'pending_approval' && user && ['super_admin', 'manager', 'supervisor'].includes(user.role) ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openPinModal('approve', adj.id)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase border bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 transition-all active:scale-95"
                                title="Setujui Pengajuan"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => openPinModal('reject', adj.id)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase border bg-rose-500/20 border-rose-500/40 text-rose-400 hover:bg-rose-500/30 transition-all active:scale-95"
                                title="Tolak Pengajuan"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                              adj.status === 'approved'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : adj.status === 'pending_approval'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            }`}>
                              {adj.status === 'approved' ? 'Approved' : adj.status === 'pending_approval' ? 'Pending' : 'Rejected'}
                            </span>
                          )}
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

      </div>

      {/* PIN Verification Modal */}
      {pinModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#0F172A] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className={`w-5 h-5 ${pinModal.action === 'approve' ? 'text-emerald-400' : 'text-rose-400'}`} />
                <span>Otorisasi PIN - {pinModal.action === 'approve' ? 'Persetujuan' : 'Penolakan'}</span>
              </h3>
              <p className="text-xs text-gray-400">
                Tindakan ini memerlukan PIN Otorisasi dari Supervisor atau Manajer.
              </p>
            </div>

            {pinModal.error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{pinModal.error}</span>
              </div>
            )}

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-semibold uppercase block">PIN Otorisasi (6 Digit)</label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  value={pinModal.pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPinModal({ ...pinModal, pin: val });
                  }}
                  placeholder="******"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-center text-lg font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder-gray-600 text-white"
                />
              </div>

              {pinModal.action === 'reject' && (
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-semibold uppercase block">Alasan Penolakan</label>
                  <textarea
                    required
                    rows={3}
                    value={pinModal.notes}
                    onChange={(e) => setPinModal({ ...pinModal, notes: e.target.value })}
                    placeholder="Masukkan alasan mengapa penyesuaian stok ini ditolak..."
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-600 text-white"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closePinModal}
                  className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    pinModal.action === 'approve'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                      : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500'
                  } shadow-lg active:scale-98`}
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{pinModal.action === 'approve' ? 'Setujui' : 'Tolak'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
