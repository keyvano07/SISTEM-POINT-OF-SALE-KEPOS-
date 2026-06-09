'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';
import { 
 Tag, Plus, Search, Trash2, Loader2, AlertTriangle, 
 Calendar, CheckCircle, X, Percent, Wallet, Filter
} from 'lucide-react';

interface Product {
 id: number;
 name: string;
}

interface Category {
 id: number;
 name: string;
}

interface Discount {
 id: number;
 name: string;
 description: string | null;
 scope: 'transaction' | 'product' | 'category';
 type: 'percentage' | 'fixed_amount';
 value: string;
 target: 'all' | 'member_only' | 'tier_specific';
 target_tier: 'bronze' | 'silver' | 'gold' | null;
 target_product_id: number | null;
 target_category_id: number | null;
 min_purchase_amount: string;
 max_discount_amount: string | null;
 start_date: string;
 end_date: string;
 is_active: boolean;
 product?: Product;
 category?: Category;
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

 // Search & Filters
 const [searchQuery, setSearchQuery] = useState('');
 const [filterScope, setFilterScope] = useState('');
 const [filterTarget, setFilterTarget] = useState('');

 // Add Modal State
 const [isAddModalOpen, setIsAddModalOpen] = useState(false);
 const [formData, setFormData] = useState({
 name: '',
 description: '',
 scope: 'product', // product, category, transaction
 type: 'percentage', // percentage, fixed_amount
 value: '',
 target: 'all', // all, member_only, tier_specific
 target_tier: '', // bronze, silver, gold
 target_product_id: '',
 target_category_id: '',
 min_purchase_amount: '0',
 max_discount_amount: '',
 start_date: '',
 end_date: '',
 });

 // UI Alerts
 const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
 const [discRes, prodRes, catRes] = await Promise.all([
 api.get('/discounts'),
 api.get('/products'),
 api.get('/categories')
 ]);
 setDiscounts(discRes.data.data || []);
 setProducts(prodRes.data.data || []);
 setCategories(catRes.data.data || []);
 } catch (err) {
 console.error(err);
 setError('Gagal memuat data promo diskon dari server.');
 } finally {
 setLoading(false);
 }
 };

 const triggerAlert = (type: 'success' | 'error', text: string) => {
 setAlertMsg({ type, text });
 setTimeout(() => setAlertMsg(null), 5000);
 };

 const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
 const { name, value } = e.target;
 setFormData(prev => ({ ...prev, [name]: value }));
 };

 const handleAddDiscountSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setSubmitting(true);

 // Prepare payload
 const payload: any = {
 name: formData.name.trim(),
 description: formData.description.trim() || null,
 scope: formData.scope,
 type: formData.type,
 value: parseFloat(formData.value),
 target: formData.target,
 target_tier: formData.target === 'tier_specific' ? formData.target_tier : null,
 target_product_id: formData.scope === 'product' ? parseInt(formData.target_product_id) : null,
 target_category_id: formData.scope === 'category' ? parseInt(formData.target_category_id) : null,
 min_purchase_amount: parseFloat(formData.min_purchase_amount) || 0.00,
 max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
 start_date: formData.start_date,
 end_date: formData.end_date,
 };

 try {
 const res = await api.post('/discounts', payload);
 if (res.data.success) {
 triggerAlert('success', `Promo diskon "${formData.name}" berhasil dibuat.`);
 setIsAddModalOpen(false);
 // Reset form
 setFormData({
 name: '',
 description: '',
 scope: 'product',
 type: 'percentage',
 value: '',
 target: 'all',
 target_tier: '',
 target_product_id: '',
 target_category_id: '',
 min_purchase_amount: '0',
 max_discount_amount: '',
 start_date: '',
 end_date: '',
 });
 fetchData();
 }
 } catch (err: any) {
 console.error(err);
 const errMsg = err.response?.data?.message || 'Gagal membuat promo diskon baru.';
 triggerAlert('error', errMsg);
 } finally {
 setSubmitting(false);
 }
 };

 const handleDeleteDiscount = async (id: number, name: string) => {
 if (!confirm(`Apakah Anda yakin ingin menghapus promo diskon "${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
 return;
 }

 try {
 const res = await api.delete(`/discounts/${id}`);
 if (res.data.success) {
 triggerAlert('success', `Promo diskon "${name}" berhasil dihapus.`);
 fetchData();
 }
 } catch (err: any) {
 console.error(err);
 const errMsg = err.response?.data?.message || 'Gagal menghapus promo diskon.';
 triggerAlert('error', errMsg);
 }
 };

 const formatCurrency = (val: string | number) => {
 return new Intl.NumberFormat('id-ID', {
 style: 'currency',
 currency: 'IDR',
 minimumFractionDigits: 0,
 }).format(typeof val === 'string' ? parseFloat(val) : val);
 };

 const isPromoActive = (disc: Discount) => {
 const now = new Date();
 const start = new Date(disc.start_date);
 const end = new Date(disc.end_date);
 return disc.is_active && now >= start && now <= end;
 };

 // Filter discounts
 const filteredDiscounts = discounts.filter(disc => {
 const matchesSearch = disc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (disc.description && disc.description.toLowerCase().includes(searchQuery.toLowerCase()));
 
 const matchesScope = filterScope ? disc.scope === filterScope : true;
 const matchesTarget = filterTarget ? disc.target === filterTarget : true;

 return matchesSearch && matchesScope && matchesTarget;
 });

 return (
 <div className="p-6 space-y-6">
 {/* Header */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
 <div>
 <h2 className="text-xl font-extrabold flex items-center gap-2">
 <Tag className="w-6 h-6 text-on-surface font-semibold" />
 <span>Manajemen Promo Diskon</span>
 </h2>
 <p className="text-xs text-on-surface-variant font-bold mt-1">
 Buat, aktifkan, dan pantau program diskon produk, kategori, dan transaksi penjualan toko Anda.
 </p>
 </div>

 <button
 onClick={() => setIsAddModalOpen(true)}
 className="h-11 px-4 bg-primary text-white hover:bg-primary/95 font-bold rounded-2xl text-xs flex items-center gap-2 transition-all active:scale-[0.98] shadow-sm shadow-primary/15"
 >
 <Plus className="w-4.5 h-4.5" />
 <span>Tambah Promo Diskon</span>
 </button>
 </div>

 {/* Alert Status Banner */}
 {alertMsg && (
 <div className={`p-4 rounded-2xl flex items-center gap-3 border animate-fadeIn ${
 alertMsg.type === 'success' 
 ? 'bg-emerald-500/10 border-emerald-500/20 text-on-surface font-semibold' 
 : 'bg-rose-500/10 border-rose-500/20 text-rose-455'
 }`}>
 {alertMsg.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
 <span className="text-xs font-bold">{alertMsg.text}</span>
 </div>
 )}

 {/* Filters Area */}
 <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 grid grid-cols-1 md:grid-cols-4 gap-4 shadow-sm">
 <div className="relative">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant font-bold" />
 <input
 type="text"
 placeholder="Cari nama promo..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full bg-background border border-surface-variant rounded-2xl pl-10 pr-4 py-2.5 text-xs text-on-surface placeholder-slate-600 focus:outline-none focus:border-primary"
 />
 </div>

 <div>
 <select
 value={filterScope}
 onChange={(e) => setFilterScope(e.target.value)}
 className="w-full bg-background border border-surface-variant rounded-2xl px-3 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary"
 >
 <option value="">Semua Cakupan (Scope)</option>
 <option value="product">Produk Tertentu</option>
 <option value="category">Kategori Tertentu</option>
 <option value="transaction">Transaksi Subtotal</option>
 </select>
 </div>

 <div>
 <select
 value={filterTarget}
 onChange={(e) => setFilterTarget(e.target.value)}
 className="w-full bg-background border border-surface-variant rounded-2xl px-3 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary"
 >
 <option value="">Semua Target</option>
 <option value="all">Semua Pelanggan</option>
 <option value="member_only">Hanya Member</option>
 <option value="tier_specific">Spesifik Tier Member</option>
 </select>
 </div>

 <div className="flex items-center justify-end text-xs text-on-surface-variant font-bold font-mono">
 Ditemukan: <strong className="text-on-surface ml-1">{filteredDiscounts.length} promo</strong>
 </div>
 </div>

 {/* Main Table Content */}
 <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
 {loading ? (
 <div className="p-12 flex flex-col items-center justify-center gap-3">
 <Loader2 className="w-8 h-8 animate-spin text-on-surface font-semibold" />
 <p className="text-xs text-on-surface-variant font-bold font-mono">Mengambil data program promo...</p>
 </div>
 ) : error ? (
 <div className="p-12 flex flex-col items-center justify-center gap-2 text-rose-455">
 <AlertTriangle className="w-8 h-8" />
 <p className="text-xs font-bold">{error}</p>
 </div>
 ) : filteredDiscounts.length === 0 ? (
 <div className="p-12 text-center text-on-surface-variant font-bold italic text-xs">
 Belum ada promo diskon terdaftar yang cocok dengan pencarian Anda.
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse text-xs">
 <thead>
 <tr className="border-b border-surface-variant bg-background text-slate-450 uppercase text-[10px] tracking-wider font-semibold">
 <th className="p-4">Nama Promo</th>
 <th className="p-4">Cakupan (Scope)</th>
 <th className="p-4">Tipe & Nilai</th>
 <th className="p-4">Target Pelanggan</th>
 <th className="p-4">Syarat Min. Belanja</th>
 <th className="p-4">Periode</th>
 <th className="p-4">Status</th>
 <th className="p-4 text-center">Aksi</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-surface-variant">
 {filteredDiscounts.map((disc) => {
 const active = isPromoActive(disc);
 return (
 <tr key={disc.id} className="hover:bg-surface-container-highest-container-lowest/30 transition-all">
 <td className="p-4">
 <div className="font-bold text-on-surface">{disc.name}</div>
 {disc.description && (
 <div className="text-[10px] text-slate-450 mt-0.5 line-clamp-1">{disc.description}</div>
 )}
 </td>
 <td className="p-4 capitalize">
 {disc.scope === 'product' && (
 <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl text-[10px] font-bold">
 Produk: {disc.product?.name || `ID ${disc.target_product_id}`}
 </span>
 )}
 {disc.scope === 'category' && (
 <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-on-surface font-semibold rounded-2xl text-[10px] font-bold">
 Kategori: {disc.category?.name || `ID ${disc.target_category_id}`}
 </span>
 )}
 {disc.scope === 'transaction' && (
 <span className="px-2 py-1 bg-primary text-on-primary text-on-surface border border-surface-variant text-on-surface font-semibold rounded-2xl text-[10px] font-bold">
 Transaksi Subtotal
 </span>
 )}
 </td>
 <td className="p-4 font-mono font-bold">
 {disc.type === 'percentage' ? (
 <span className="text-on-surface font-semibold flex items-center gap-1">
 <Percent className="w-3.5 h-3.5" /> {disc.value}%
 </span>
 ) : (
 <span className="text-emerald-450 flex items-center gap-1">
 <Wallet className="w-3.5 h-3.5" /> {formatCurrency(disc.value)}
 </span>
 )}
 {disc.max_discount_amount && (
 <div className="text-[9px] text-on-surface-variant font-bold font-semibold mt-0.5">
 Maks: {formatCurrency(disc.max_discount_amount)}
 </div>
 )}
 </td>
 <td className="p-4">
 {disc.target === 'all' && <span className="text-on-surface">Semua Pelanggan</span>}
 {disc.target === 'member_only' && (
 <span className="px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-primary font-bold rounded-2xl text-[10px] font-bold">
 Hanya Member
 </span>
 )}
 {disc.target === 'tier_specific' && (
 <span className={`px-1.5 py-0.5 rounded-2xl text-[9px] font-extrabold uppercase ${
 disc.target_tier === 'gold' 
 ? 'bg-yellow-500 text-on-surface shadow-sm' 
 : disc.target_tier === 'silver'
 ? 'bg-slate-300 text-on-surface'
 : 'bg-amber-800 text-on-surface'
 }`}>
 Tier: {disc.target_tier}
 </span>
 )}
 </td>
 <td className="p-4 font-mono">
 {parseFloat(disc.min_purchase_amount) > 0 ? (
 <span className="text-on-surface">{formatCurrency(disc.min_purchase_amount)}</span>
 ) : (
 <span className="text-on-surface-variant font-bold italic">Tanpa Min.</span>
 )}
 </td>
 <td className="p-4 font-mono text-on-surface-variant font-bold space-y-0.5 text-[10px]">
 <div className="flex items-center gap-1">
 <Calendar className="w-3 h-3 text-on-surface-variant font-bold" />
 <span>{new Date(disc.start_date).toLocaleDateString('id-ID')}</span>
 </div>
 <div className="flex items-center gap-1 text-[10px]">
 <span className="text-on-surface-variant font-bold">s/d</span>
 <span>{new Date(disc.end_date).toLocaleDateString('id-ID')}</span>
 </div>
 </td>
 <td className="p-4">
 {active ? (
 <span className="px-2 py-0.5 bg-emerald-500/10 text-on-surface font-semibold border border-emerald-500/20 rounded-2xl text-[10px] font-bold">
 Aktif
 </span>
 ) : (
 <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-2xl text-[10px] font-bold">
 Selesai / Nonaktif
 </span>
 )}
 </td>
 <td className="p-4 text-center">
 <button
 onClick={() => handleDeleteDiscount(disc.id, disc.name)}
 className="p-2 bg-rose-550/10 hover:bg-rose-550/20 text-rose-455 border border-rose-550/25 rounded-2xl transition-all hover:scale-105 active:scale-[0.98] transition-all "
 title="Hapus Promo"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* ===== ADD PROMO DISCOUNT MODAL ===== */}
 {isAddModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
 <div className="w-full max-w-2xl bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-md space-y-6 my-8 animate-fadeIn">
 <div className="flex justify-between items-center pb-3 border-b border-surface-variant ">
 <h3 className="text-base font-bold flex items-center gap-2 text-on-surface font-semibold">
 <Plus className="w-5 h-5" />
 <span>Buat Program Promo Baru</span>
 </h3>
 <button
 onClick={() => setIsAddModalOpen(false)}
 className="p-1.5 rounded-2xl hover:bg-surface-container-highest-container-lowest/10 text-on-surface-variant font-bold"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 <form onSubmit={handleAddDiscountSubmit} className="space-y-4 text-xs">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* Promo Name */}
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-on-surface-variant font-bold uppercase">Nama Program Promo *</label>
 <input
 type="text"
 name="name"
 required
 placeholder="Contoh: Diskon Flash Sale Gajian"
 value={formData.name}
 onChange={handleInputChange}
 className="w-full bg-background border border-surface-variant focus:border-primary rounded-2xl px-3.5 py-2.5 text-on-surface placeholder-slate-650 focus:outline-none"
 />
 </div>

 {/* Description */}
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-on-surface-variant font-bold uppercase">Deskripsi Ringkas</label>
 <input
 type="text"
 name="description"
 placeholder="Contoh: Diskon 10% untuk semua member tier gold"
 value={formData.description}
 onChange={handleInputChange}
 className="w-full bg-background border border-surface-variant focus:border-primary rounded-2xl px-3.5 py-2.5 text-on-surface placeholder-slate-650 focus:outline-none"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {/* Scope Selection */}
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-on-surface-variant font-bold uppercase">Cakupan Promo (Scope) *</label>
 <select
 name="scope"
 value={formData.scope}
 onChange={handleInputChange}
 className="w-full bg-background border border-surface-variant focus:border-primary rounded-2xl px-3 py-2.5 text-on-surface focus:outline-none"
 >
 <option value="product">Produk Tertentu</option>
 <option value="category">Kategori Tertentu</option>
 <option value="transaction">Subtotal Transaksi</option>
 </select>
 </div>

 {/* Scope Target Input: Product */}
 {formData.scope === 'product' && (
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-on-surface-variant font-bold uppercase">Pilih Produk Target *</label>
 <select
 name="target_product_id"
 required
 value={formData.target_product_id}
 onChange={handleInputChange}
 className="w-full bg-background border border-surface-variant focus:border-primary rounded-2xl px-3 py-2.5 text-on-surface focus:outline-none"
 >
 <option value="">-- Pilih Produk --</option>
 {products.map(p => (
 <option key={p.id} value={p.id}>{p.name}</option>
 ))}
 </select>
 </div>
 )}

 {/* Scope Target Input: Category */}
 {formData.scope === 'category' && (
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-on-surface-variant font-bold uppercase">Pilih Kategori Target *</label>
 <select
 name="target_category_id"
 required
 value={formData.target_category_id}
 onChange={handleInputChange}
 className="w-full bg-background border border-surface-variant focus:border-primary rounded-2xl px-3 py-2.5 text-on-surface focus:outline-none"
 >
 <option value="">-- Pilih Kategori --</option>
 {categories.map(c => (
 <option key={c.id} value={c.id}>{c.name}</option>
 ))}
 </select>
 </div>
 )}

 {/* Empty block for transaction scope placeholder */}
 {formData.scope === 'transaction' && (
 <div className="space-y-1 opacity-50">
 <label className="text-[10px] font-bold text-on-surface-variant font-bold uppercase">Target Item</label>
 <input
 disabled
 placeholder="Semua item di keranjang"
 className="w-full bg-surface-container-lowest/40 border border-surface-variant rounded-2xl px-3 py-2.5 text-on-surface-variant font-bold focus:outline-none cursor-not-allowed"
 />
 </div>
 )}

 {/* Target Audience */}
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-on-surface-variant font-bold uppercase">Target Audiens Pelanggan *</label>
 <select
 name="target"
 value={formData.target}
 onChange={handleInputChange}
 className="w-full bg-background border border-surface-variant focus:border-primary rounded-2xl px-3 py-2.5 text-on-surface focus:outline-none"
 >
 <option value="all">Semua Pelanggan</option>
 <option value="member_only">Hanya Member</option>
 <option value="tier_specific">Tier Member Spesifik</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {/* Target Tier Selection */}
 {formData.target === 'tier_specific' ? (
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-on-surface-variant font-bold uppercase">Pilih Tier Target *</label>
 <select
 name="target_tier"
 required
 value={formData.target_tier}
 onChange={handleInputChange}
 className="w-full bg-background border border-surface-variant focus:border-primary rounded-2xl px-3 py-2.5 text-on-surface focus:outline-none"
 >
 <option value="">-- Pilih Tier --</option>
 <option value="bronze">Bronze</option>
 <option value="silver">Silver</option>
 <option value="gold">Gold</option>
 </select>
 </div>
 ) : (
 <div className="space-y-1 opacity-50">
 <label className="text-[10px] font-bold text-on-surface-variant font-bold uppercase">Spesifikasi Tier</label>
 <input
 disabled
 placeholder="Terbuka untuk semua"
 className="w-full bg-surface-container-lowest/40 border border-surface-variant rounded-2xl px-3 py-2.5 text-on-surface-variant font-bold focus:outline-none cursor-not-allowed"
 />
 </div>
 )}

 {/* Discount Value Type */}
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-on-surface-variant font-bold uppercase">Tipe Nilai Diskon *</label>
 <select
 name="type"
 value={formData.type}
 onChange={handleInputChange}
 className="w-full bg-background border border-surface-variant focus:border-primary rounded-2xl px-3 py-2.5 text-on-surface focus:outline-none"
 >
 <option value="percentage">Persentase (%)</option>
 <option value="fixed_amount">Jumlah Tetap (Rupiah)</option>
 </select>
 </div>

 {/* Discount Value */}
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-on-surface-variant font-bold uppercase">
 Nilai Potongan ({formData.type === 'percentage' ? '%' : 'Rp'}) *
 </label>
 <input
 type="number"
 name="value"
 required
 step="0.01"
 min="0.01"
 placeholder={formData.type === 'percentage' ? 'Contoh: 10' : 'Contoh: 5000'}
 value={formData.value}
 onChange={handleInputChange}
 className="w-full bg-background border border-surface-variant focus:border-primary rounded-2xl px-3.5 py-2.5 text-on-surface placeholder-slate-650 focus:outline-none"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {/* Min Purchase */}
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-on-surface-variant font-bold uppercase">Minimum Nominal Belanja (Rp)</label>
 <input
 type="number"
 name="min_purchase_amount"
 min="0"
 placeholder="Contoh: 50000"
 value={formData.min_purchase_amount}
 onChange={handleInputChange}
 className="w-full bg-background border border-surface-variant focus:border-primary rounded-2xl px-3.5 py-2.5 text-on-surface placeholder-slate-650 focus:outline-none"
 />
 </div>

 {/* Max Discount (Clamping) */}
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-on-surface-variant font-bold uppercase">Maksimum Potongan (Rp) (Opsional)</label>
 <input
 type="number"
 name="max_discount_amount"
 min="0"
 placeholder="Contoh: 20000"
 value={formData.max_discount_amount}
 onChange={handleInputChange}
 className="w-full bg-background border border-surface-variant focus:border-primary rounded-2xl px-3.5 py-2.5 text-on-surface placeholder-slate-650 focus:outline-none"
 />
 </div>

 {/* Start Date */}
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-on-surface-variant font-bold uppercase">Tanggal Mulai Promo *</label>
 <input
 type="date"
 name="start_date"
 required
 value={formData.start_date}
 onChange={handleInputChange}
 className="w-full bg-background border border-surface-variant focus:border-primary rounded-2xl px-3.5 py-2.5 text-on-surface focus:outline-none"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {/* End Date */}
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-on-surface-variant font-bold uppercase">Tanggal Akhir Promo *</label>
 <input
 type="date"
 name="end_date"
 required
 value={formData.end_date}
 onChange={handleInputChange}
 className="w-full bg-background border border-surface-variant focus:border-primary rounded-2xl px-3.5 py-2.5 text-on-surface focus:outline-none"
 />
 </div>
 </div>

 <div className="pt-4 flex gap-3">
 <button
 type="button"
 onClick={() => setIsAddModalOpen(false)}
 className="flex-1 py-3 bg-surface-container-lowest-container rounded-xl hover:bg-surface-container-highest-container-lowest-container-highest text-on-surface font-bold rounded-2xl transition-all"
 >
 Batal
 </button>
 <button
 type="submit"
 disabled={submitting}
 className="flex-1 py-3 bg-primary text-white hover:bg-primary/95 disabled:opacity-50 font-bold rounded-2xl transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-primary/15"
 >
 {submitting ? (
 <Loader2 className="w-4 h-4 animate-spin" />
 ) : (
 <span>Simpan Promo</span>
 )}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
}
