'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';
import { 
 Users, Plus, Search, Loader2, AlertTriangle, 
 CheckCircle, X, Smartphone, Mail, Award, Clock
} from 'lucide-react';

interface Member {
 id: number;
 member_code: string;
 name: string;
 phone: string;
 email: string | null;
 points: number;
 total_spending: string;
 tier: 'bronze' | 'silver' | 'gold';
 created_at: string;
}

export default function MemberManagementPage() {
 const router = useRouter();
 const { user, token } = useAuthStore();

 const [members, setMembers] = useState<Member[]>([]);
 const [loading, setLoading] = useState(true);
 const [submitting, setSubmitting] = useState(false);
 const [error, setError] = useState<string | null>(null);

 // Search & Filters
 const [searchQuery, setSearchQuery] = useState('');
 const [filterTier, setFilterTier] = useState('');

 // Add Modal State
 const [isAddModalOpen, setIsAddModalOpen] = useState(false);
 const [formData, setFormData] = useState({
 name: '',
 phone: '',
 email: '',
 });

 // UI Alerts
 const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

 useEffect(() => {
 if (token) {
 if (user && !['super_admin', 'manager', 'supervisor'].includes(user.role)) {
 router.push('/dashboard');
 return;
 }
 fetchMembers();
 }
 }, [token, user, router]);

 const fetchMembers = async () => {
 setLoading(true);
 setError(null);
 try {
 const res = await api.get('/members');
 setMembers(res.data.data || []);
 } catch (err) {
 console.error(err);
 setError('Gagal memuat daftar member dari server.');
 } finally {
 setLoading(false);
 }
 };

 const triggerAlert = (type: 'success' | 'error', text: string) => {
 setAlertMsg({ type, text });
 setTimeout(() => setAlertMsg(null), 5000);
 };

 const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const { name, value } = e.target;
 setFormData(prev => ({ ...prev, [name]: value }));
 };

 const handleRegisterMemberSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setSubmitting(true);

 try {
 const res = await api.post('/members', {
 name: formData.name.trim(),
 phone: formData.phone.trim(),
 email: formData.email.trim() || null,
 });

 if (res.data.success) {
 triggerAlert('success', `Member "${formData.name}" berhasil didaftarkan.`);
 setIsAddModalOpen(false);
 // Reset form
 setFormData({
 name: '',
 phone: '',
 email: '',
 });
 fetchMembers();
 }
 } catch (err: any) {
 console.error(err);
 const errMsg = err.response?.data?.message || 'Gagal mendaftarkan member baru.';
 triggerAlert('error', errMsg);
 } finally {
 setSubmitting(false);
 }
 };

 const formatCurrency = (val: string | number) => {
 return new Intl.NumberFormat('id-ID', {
 style: 'currency',
 currency: 'IDR',
 minimumFractionDigits: 0,
 }).format(typeof val === 'string' ? parseFloat(val) : val);
 };

 // Filter members
 const filteredMembers = members.filter(member => {
 const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 member.member_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
 member.phone.includes(searchQuery) ||
 (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase()));
 
 const matchesTier = filterTier ? member.tier === filterTier : true;

 return matchesSearch && matchesTier;
 });

 return (
 <div className="p-6 space-y-6">
 {/* Header */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
 <div>
 <h2 className="text-xl font-extrabold flex items-center gap-2">
 <Users className="w-6 h-6 text-on-surface font-semibold" />
 <span>Manajemen Pelanggan & Membership</span>
 </h2>
 <p className="text-xs text-on-surface-variant font-bold mt-1">
 Kelola data profil member pelanggan, perolehan poin transaksi, total belanja, dan tingkatan (tier) membership.
 </p>
 </div>

 <button
 onClick={() => setIsAddModalOpen(true)}
 className="h-11 px-4 bg-primary text-white hover:bg-primary/95 font-bold rounded-2xl text-xs flex items-center gap-2 transition-all active:scale-[0.98] shadow-sm shadow-primary/15"
 >
 <Plus className="w-4.5 h-4.5" />
 <span>Daftar Member Baru</span>
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

 {/* Stats Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-2">
 <p className="text-[10px] font-bold text-on-surface-variant font-bold uppercase tracking-wider">Total Member Terdaftar</p>
 <p className="text-2xl font-extrabold text-on-surface font-mono">{members.length}</p>
 </div>
 <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-2">
 <p className="text-[10px] font-bold text-on-surface-variant font-bold uppercase tracking-wider">Tier Gold (VIP)</p>
 <p className="text-2xl font-extrabold text-yellow-500 font-mono">
 {members.filter(m => m.tier === 'gold').length}
 </p>
 </div>
 <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-2">
 <p className="text-[10px] font-bold text-on-surface-variant font-bold uppercase tracking-wider">Tier Silver</p>
 <p className="text-2xl font-extrabold text-on-surface font-mono">
 {members.filter(m => m.tier === 'silver').length}
 </p>
 </div>
 <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-2">
 <p className="text-[10px] font-bold text-on-surface-variant font-bold uppercase tracking-wider">Tier Bronze</p>
 <p className="text-2xl font-extrabold text-amber-600 font-mono">
 {members.filter(m => m.tier === 'bronze').length}
 </p>
 </div>
 </div>

 {/* Filters Area */}
 <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-sm">
 <div className="relative col-span-2">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant font-bold" />
 <input
 type="text"
 placeholder="Cari member berdasarkan nama, nomor HP, atau kode..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full bg-background border border-surface-variant rounded-2xl pl-10 pr-4 py-2.5 text-xs text-on-surface placeholder-slate-600 focus:outline-none focus:border-primary"
 />
 </div>

 <div>
 <select
 value={filterTier}
 onChange={(e) => setFilterTier(e.target.value)}
 className="w-full bg-background border border-surface-variant rounded-2xl px-3 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary"
 >
 <option value="">Semua Tingkatan Tier</option>
 <option value="gold">Gold ( VIP )</option>
 <option value="silver">Silver</option>
 <option value="bronze">Bronze</option>
 </select>
 </div>
 </div>

 {/* Main Table Content */}
 <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
 {loading ? (
 <div className="p-12 flex flex-col items-center justify-center gap-3">
 <Loader2 className="w-8 h-8 animate-spin text-on-surface font-semibold" />
 <p className="text-xs text-on-surface-variant font-bold font-mono">Mengambil data member...</p>
 </div>
 ) : error ? (
 <div className="p-12 flex flex-col items-center justify-center gap-2 text-rose-455">
 <AlertTriangle className="w-8 h-8" />
 <p className="text-xs font-bold">{error}</p>
 </div>
 ) : filteredMembers.length === 0 ? (
 <div className="p-12 text-center text-on-surface-variant font-bold italic text-xs">
 Belum ada data member terdaftar yang cocok dengan pencarian Anda.
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse text-xs">
 <thead>
 <tr className="border-b border-surface-variant bg-background text-slate-450 uppercase text-[10px] tracking-wider font-semibold">
 <th className="p-4">Kode Member</th>
 <th className="p-4">Nama Pelanggan</th>
 <th className="p-4">Kontak</th>
 <th className="p-4 text-center">Tingkatan Tier</th>
 <th className="p-4 text-center">Total Poin</th>
 <th className="p-4 text-right">Akumulasi Belanja</th>
 <th className="p-4 text-right">Terdaftar Sejak</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-surface-variant">
 {filteredMembers.map((member) => (
 <tr key={member.id} className="hover:bg-surface-container-highest-container-lowest/30 transition-all">
 <td className="p-4 font-mono font-bold text-violet-405">
 #{member.member_code}
 </td>
 <td className="p-4 font-bold text-on-surface">
 {member.name}
 </td>
 <td className="p-4 space-y-1">
 <div className="flex items-center gap-1.5 text-on-surface">
 <Smartphone className="w-3.5 h-3.5 text-on-surface-variant font-bold" />
 <span>{member.phone}</span>
 </div>
 {member.email && (
 <div className="flex items-center gap-1.5 text-slate-450 text-[10px]">
 <Mail className="w-3.5 h-3.5 text-on-surface-variant font-bold" />
 <span>{member.email}</span>
 </div>
 )}
 </td>
 <td className="p-4 text-center">
 <span className={`px-2 py-0.5 rounded-2xl text-[9px] font-extrabold uppercase inline-block ${
 member.tier === 'gold' 
 ? 'bg-yellow-500 text-on-surface shadow-sm' 
 : member.tier === 'silver'
 ? 'bg-slate-300 text-on-surface'
 : 'bg-amber-800 text-on-surface'
 }`}>
 {member.tier}
 </span>
 </td>
 <td className="p-4 text-center font-mono font-bold text-emerald-450">
 {member.points}
 </td>
 <td className="p-4 text-right font-mono font-bold text-on-surface">
 {formatCurrency(member.total_spending)}
 </td>
 <td className="p-4 text-right font-mono text-slate-450 text-[10px] space-y-0.5">
 <div className="flex items-center justify-end gap-1">
 <Clock className="w-3.5 h-3.5 text-on-surface-variant font-bold" />
 <span>{new Date(member.created_at).toLocaleDateString('id-ID')}</span>
 </div>
 <div>
 {new Date(member.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* ===== REGISTER NEW MEMBER MODAL ===== */}
 {isAddModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm ">
 <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-md space-y-5 animate-fadeIn">
 <div className="flex justify-between items-center pb-3 border-b border-surface-variant ">
 <h3 className="text-base font-bold flex items-center gap-2 text-on-surface font-semibold">
 <Plus className="w-5 h-5" />
 <span>Pendaftaran Member Baru</span>
 </h3>
 <button
 onClick={() => setIsAddModalOpen(false)}
 className="p-1.5 rounded-2xl hover:bg-surface-container-highest-container-lowest/10 text-on-surface-variant font-bold"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 <form onSubmit={handleRegisterMemberSubmit} className="space-y-4 text-xs">
 <div className="space-y-1">
 <label className="text-[10px] font-bold text-on-surface-variant font-bold uppercase">Nama Lengkap Member *</label>
 <input
 type="text"
 name="name"
 required
 placeholder="Contoh: John Doe"
 value={formData.name}
 onChange={handleInputChange}
 className="w-full bg-background border border-surface-variant focus:border-primary rounded-2xl px-3.5 py-2.5 text-on-surface placeholder-slate-650 focus:outline-none"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-bold text-on-surface-variant font-bold uppercase">Nomor HP / WhatsApp *</label>
 <input
 type="tel"
 name="phone"
 required
 placeholder="Contoh: 081234567890"
 value={formData.phone}
 onChange={handleInputChange}
 className="w-full bg-background border border-surface-variant focus:border-primary rounded-2xl px-3.5 py-2.5 text-on-surface placeholder-slate-650 focus:outline-none"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] font-bold text-on-surface-variant font-bold uppercase">Alamat Email (Opsional)</label>
 <input
 type="email"
 name="email"
 placeholder="Contoh: johndoe@gmail.com"
 value={formData.email}
 onChange={handleInputChange}
 className="w-full bg-background border border-surface-variant focus:border-primary rounded-2xl px-3.5 py-2.5 text-on-surface placeholder-slate-650 focus:outline-none"
 />
 </div>

 <div className="pt-3 flex gap-3">
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
 <span>Daftar Member</span>
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
