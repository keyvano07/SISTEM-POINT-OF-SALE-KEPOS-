'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';
import {
 ShieldCheck,
 Loader2,
 AlertTriangle,
 CheckCircle2,
 Activity,
 Calendar,
 User,
 DollarSign,
 X,
 MessageSquare,
 FileText,
 Clock,
 ChevronRight,
 TrendingDown
} from 'lucide-react';

interface UserData {
 id: number;
 name: string;
 email: string;
 role: string;
}

interface Shift {
 id: number;
 shift_code: string;
 opening_cash: string | number;
 physical_cash_input: string | number | null;
 expected_cash: string | number | null;
 discrepancy: string | number | null;
 status: 'open' | 'closed';
 audit_status: 'pending' | 'balance' | 'discrepancy';
 audit_notes: string | null;
 opened_at: string;
 closed_at: string | null;
 audited_at: string | null;
 cashier?: UserData;
 auditor?: UserData;
}

interface AuditLog {
 id: number;
 action: string;
 target_type: string;
 target_id: number;
 details: string | Record<string, any> | null;
 created_at: string;
 executor?: UserData;
 authorizer?: UserData;
}

export default function SupervisorAuditPage() {
 const router = useRouter();
 const { user, token } = useAuthStore();

 const [activeTab, setActiveTab] = useState<'shifts' | 'logs'>('shifts');
 const [shifts, setShifts] = useState<Shift[]>([]);
 const [logs, setLogs] = useState<AuditLog[]>([]);
 const [loading, setLoading] = useState(true);
 const [submitting, setSubmitting] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

 // Audit Form Modal State
 const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
 const [auditForm, setAuditForm] = useState({
 audit_status: 'balance' as 'balance' | 'discrepancy',
 audit_notes: ''
 });

 // Log Detail Modal State
 const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
 const [showRawJson, setShowRawJson] = useState(false);

 const handleCloseLogModal = () => {
 setSelectedLog(null);
 setShowRawJson(false);
 };

 useEffect(() => {
 if (token) {
 if (user && !['super_admin', 'manager', 'supervisor'].includes(user.role)) {
 router.push('/dashboard');
 return;
 }
 fetchData();
 }
 }, [token, user, router, activeTab]);

 const fetchData = async () => {
 setLoading(true);
 setError(null);
 try {
 if (activeTab === 'shifts') {
 const res = await api.get('/shifts');
 setShifts(res.data.data || []);
 } else {
 const res = await api.get('/audit-logs');
 setLogs(res.data.data || []);
 }
 } catch (err) {
 console.error(err);
 setError('Gagal mengambil data dari server.');
 } finally {
 setLoading(false);
 }
 };

 const triggerAlert = (type: 'success' | 'error', text: string) => {
 setAlertMsg({ type, text });
 setTimeout(() => setAlertMsg(null), 5000);
 };

 const formatCurrency = (value: number | string | null) => {
 if (value === null || value === undefined) return '-';
 const num = typeof value === 'number' ? value : parseFloat(value || '0');
 return new Intl.NumberFormat('id-ID', {
 style: 'currency',
 currency: 'IDR',
 minimumFractionDigits: 0,
 maximumFractionDigits: 0
 }).format(num);
 };

 const formatDateTime = (dateStr: string | null) => {
 if (!dateStr) return '-';
 return new Date(dateStr).toLocaleString('id-ID', {
 dateStyle: 'medium',
 timeStyle: 'short'
 });
 };

 const renderAuditLogDetails = (log: AuditLog) => {
 let detailsObj: Record<string, any> = {};
 try {
 detailsObj = typeof log.details === 'string' ? JSON.parse(log.details) : log.details || {};
 } catch (e) {
 console.error(e);
 }

 const keyTranslations: Record<string, string> = {
 invoice_number: 'Nomor Invoice',
 reason: 'Alasan Void',
 grand_total: 'Total Transaksi',
 voided_at: 'Waktu Pembatalan',
 product_name: 'Nama Produk',
 old_buy_price: 'Harga Beli Lama',
 new_buy_price: 'Harga Beli Baru',
 old_sell_price: 'Harga Jual Lama',
 new_sell_price: 'Harga Jual Baru',
 changed_at: 'Waktu Perubahan',
 quantity_change: 'Jumlah Perubahan Stok',
 financial_value: 'Nilai Finansial',
 reason_code: 'Alasan Penyesuaian',
 approved_at: 'Waktu Persetujuan',
 };

 const formatValue = (key: string, val: any) => {
 if (val === null || val === undefined) return '-';
 if (['grand_total', 'old_buy_price', 'new_buy_price', 'old_sell_price', 'new_sell_price', 'financial_value'].includes(key)) {
 return <span className="font-mono text-on-surface font-semibold font-bold">{formatCurrency(val)}</span>;
 }
 if (['voided_at', 'changed_at', 'approved_at'].includes(key)) {
 return <span className="text-on-surface font-sans">{formatDateTime(val)}</span>;
 }
 if (key === 'quantity_change') {
 const num = parseInt(val);
 return (
 <span className={`font-bold font-mono ${num > 0 ? 'text-on-surface font-semibold' : 'text-rose-400'}`}>
 {num > 0 ? `+${num}` : num} unit
 </span>
 );
 }
 if (key === 'reason_code') {
 const labels: Record<string, string> = {
 damaged: 'Barang Rusak (Damaged)',
 expired: 'Barang Kedaluwarsa (Expired)',
 opname: 'Stock Opname',
 };
 return (
 <span className="px-2.5 py-0.5 bg-gray-100 text-on-surface border border-outline-variant/50 rounded-xl text-xs font-bold">
 {labels[val] || val}
 </span>
 );
 }
 return <span className="text-on-surface">{String(val)}</span>;
 };

 if (Object.keys(detailsObj).length === 0) {
 return (
 <div className="text-center py-6 text-on-surface-variant font-bold text-sm">
 Tidak ada detail tambahan yang tersedia.
 </div>
 );
 }

 return (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {Object.entries(detailsObj).map(([key, val]) => (
 <div key={key} className="p-4 bg-background/60 border border-outline-variant rounded-xl space-y-1">
 <span className="text-xs font-extrabold uppercase text-on-surface-variant font-bold tracking-wider">
 {keyTranslations[key] || key}
 </span>
 <div className="text-sm font-semibold truncate">
 {formatValue(key, val)}
 </div>
 </div>
 ))}
 </div>
 );
 };

 const handleOpenAuditModal = (shift: Shift) => {
 setSelectedShift(shift);
 // Auto detect status based on discrepancy
 const hasDiscrepancy = shift.discrepancy !== null && parseFloat(shift.discrepancy.toString()) !== 0;
 setAuditForm({
 audit_status: hasDiscrepancy ? 'discrepancy' : 'balance',
 audit_notes: shift.audit_notes || ''
 });
 };

 const handleCloseAuditModal = () => {
 setSelectedShift(null);
 };

 const handleAuditSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedShift) return;

 setSubmitting(true);
 try {
 const res = await api.post(`/shifts/${selectedShift.id}/audit`, {
 audit_status: auditForm.audit_status,
 audit_notes: auditForm.audit_notes
 });

 if (res.data.success) {
 triggerAlert('success', 'Hasil rekonsiliasi audit shift berhasil disimpan.');
 handleCloseAuditModal();
 fetchData();
 }
 } catch (err) {
 console.error(err);
 const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Gagal menyimpan audit.';
 triggerAlert('error', msg);
 } finally {
 setSubmitting(false);
 }
 };

 return (
 <div className="p-8 max-w-7xl mx-auto space-y-8 bg-background text-on-surface min-h-screen">
 {/* Alert Component */}
 {alertMsg && (
 <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl border shadow-md transition-all duration-300 animate-slide-in ${
 alertMsg.type === 'success' 
 ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300' 
 : 'bg-rose-950/80 border-rose-800 text-rose-300'
 }`}>
 {alertMsg.type === 'success' ? (
 <CheckCircle2 className="w-5 h-5" />
 ) : (
 <AlertTriangle className="w-5 h-5" />
 )}
 <span className="text-sm font-semibold">{alertMsg.text}</span>
 </div>
 )}

 {/* Header Section */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
 <div className="space-y-1.5">
 <h2 className="text-3xl font-extrabold from-white via-slate-100 to-slate-400 flex items-center gap-3">
 <ShieldCheck className="w-8 h-8 text-on-surface font-semibold" />
 Audit & Rekonsiliasi Toko
 </h2>
 <p className="text-on-surface-variant font-bold">
 Kelola rekonsiliasi uang laci kasir dan pantau jejak audit digital aktivitas sensitif.
 </p>
 </div>
 </div>

 {/* Tab Selectors */}
 <div className="flex border-b border-outline-variant gap-6">
 <button
 onClick={() => setActiveTab('shifts')}
 className={`pb-4 px-2 text-sm font-bold transition-all relative ${
 activeTab === 'shifts' 
 ? 'text-on-surface' 
 : 'text-on-surface-variant font-bold hover:text-on-surface'
 }`}
 >
 ⏱️ Rekonsiliasi Shift
 {activeTab === 'shifts' && (
 <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-xl" />
 )}
 </button>
 <button
 onClick={() => setActiveTab('logs')}
 className={`pb-4 px-2 text-sm font-bold transition-all relative ${
 activeTab === 'logs' 
 ? 'text-on-surface' 
 : 'text-on-surface-variant font-bold hover:text-on-surface'
 }`}
 >
 🛡️ Audit Trail Logs
 {activeTab === 'logs' && (
 <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-xl" />
 )}
 </button>
 </div>

 {/* Main Content Area */}
 {loading ? (
 <div className="flex flex-col items-center justify-center py-20 gap-4 bg-surface-container-lowest/55 rounded-xl border border-outline-variant /80">
 <Loader2 className="w-10 h-10 text-on-surface font-semibold animate-spin" />
 <p className="text-on-surface-variant font-bold font-semibold text-sm">Memuat data dari server...</p>
 </div>
 ) : error ? (
 <div className="flex flex-col items-center justify-center py-16 gap-3 bg-rose-950/20 border border-rose-900/50 rounded-xl text-rose-300">
 <AlertTriangle className="w-10 h-10" />
 <p className="font-bold">{error}</p>
 <button 
 onClick={fetchData}
 className="mt-2 px-5 py-2 bg-rose-950 hover:bg-rose-900 border border-rose-800 rounded-xl text-xs font-bold transition-all"
 >
 Coba Lagi
 </button>
 </div>
 ) : activeTab === 'shifts' ? (
 /* ================= SHIFT RECONCILIATION TAB ================= */
 <div className="space-y-6">
 <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
 <div className="px-6 py-4 bg-surface-container-lowest/40 border-b border-outline-variant flex items-center justify-between">
 <h3 className="font-extrabold text-on-surface flex items-center gap-2">
 <span>Daftar Sesi Shift Kasir</span>
 </h3>
 <span className="text-xs font-bold text-on-surface-variant font-bold px-3 py-1 bg-gray-100/60 rounded-xl border border-outline-variant/50">
 Total: {shifts.length} shift
 </span>
 </div>

 {shifts.length === 0 ? (
 <div className="p-12 text-center text-on-surface-variant font-bold">
 Belum ada draf shift kasir yang tercatat.
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full border-collapse text-left">
 <thead>
 <tr className="border-b border-outline-variant /80 bg-surface-container-lowest/20 text-on-surface-variant font-bold text-xs font-bold uppercase tracking-wider">
 <th className="p-4">Kode Shift</th>
 <th className="p-4">Kasir</th>
 <th className="p-4">Waktu Buka / Tutup</th>
 <th className="p-4 text-right">Modal Awal</th>
 <th className="p-4 text-right">Uang Fisik</th>
 <th className="p-4 text-right">Ekspektasi</th>
 <th className="p-4 text-right">Selisih</th>
 <th className="p-4 text-center">Status Audit</th>
 <th className="p-4 text-center">Aksi</th>
 </tr>
 </thead>
 <tbody>
 {shifts.map((shift) => {
 const discrepancyVal = shift.discrepancy !== null ? parseFloat(shift.discrepancy.toString()) : 0;
 return (
 <tr 
 key={shift.id} 
 className="border-b border-outline-variant /60 hover:bg-surface-container-highest-container-lowest/30 transition-all text-sm"
 >
 <td className="p-4 font-mono font-bold text-on-surface font-semibold">{shift.shift_code}</td>
 <td className="p-4">
 <div className="flex flex-col">
 <span className="font-semibold text-on-surface">{shift.cashier?.name || 'Staff'}</span>
 <span className="text-xs text-on-surface-variant font-bold">{shift.cashier?.email}</span>
 </div>
 </td>
 <td className="p-4 text-xs text-on-surface-variant font-bold space-y-1">
 <div className="flex items-center gap-1.5">
 <span className="text-on-surface font-semibold">🟢</span>
 <span>{formatDateTime(shift.opened_at)}</span>
 </div>
 {shift.closed_at ? (
 <div className="flex items-center gap-1.5">
 <span className="text-rose-500">🔴</span>
 <span>{formatDateTime(shift.closed_at)}</span>
 </div>
 ) : (
 <span className="px-2 py-0.5 bg-emerald-950/80 text-on-surface font-semibold text-[10px] font-extrabold rounded-xl border border-emerald-800">AKTIF</span>
 )}
 </td>
 <td className="p-4 text-right font-mono text-on-surface">{formatCurrency(shift.opening_cash)}</td>
 <td className="p-4 text-right font-mono text-on-surface">{formatCurrency(shift.physical_cash_input)}</td>
 <td className="p-4 text-right font-mono text-on-surface">{formatCurrency(shift.expected_cash)}</td>
 <td className={`p-4 text-right font-mono font-bold ${
 discrepancyVal < 0 
 ? 'text-rose-400' 
 : discrepancyVal > 0 
 ? 'text-on-surface font-semibold' 
 : 'text-on-surface-variant font-bold'
 }`}>
 {discrepancyVal > 0 ? '+' : ''}
 {formatCurrency(shift.discrepancy)}
 </td>
 <td className="p-4 text-center">
 {shift.status === 'open' ? (
 <span className="px-2.5 py-1 text-xs font-bold rounded-xl bg-gray-100 text-on-surface-variant font-bold border border-outline-variant/50">
 Berjalan
 </span>
 ) : shift.audit_status === 'pending' ? (
 <span className="px-2.5 py-1 text-xs font-bold rounded-xl bg-amber-500/10 text-on-surface font-semibold border border-amber-500/20">
 Pending
 </span>
 ) : shift.audit_status === 'balance' ? (
 <span className="px-2.5 py-1 text-xs font-bold rounded-xl bg-emerald-500/10 text-on-surface font-semibold border border-emerald-500/20">
 Balance
 </span>
 ) : (
 <span className="px-2.5 py-1 text-xs font-bold rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
 Discrepancy
 </span>
 )}
 </td>
 <td className="p-4 text-center">
 {shift.status === 'closed' && shift.audit_status === 'pending' ? (
 <button
 onClick={() => handleOpenAuditModal(shift)}
 className="px-4 py-1.5 bg-primary text-on-surface hover:bg-surface-container-highest-container-lowest hover:text-on-surface border border-primary text-xs font-extrabold rounded-xl transition-all shadow-sm active:scale-[0.98] transition-all "
 >
 Audit Shift
 </button>
 ) : shift.status === 'closed' ? (
 <div className="flex flex-col items-center">
 <span className="text-[10px] uppercase text-on-surface-variant font-bold font-extrabold">Diaudit Oleh</span>
 <span className="text-xs font-semibold text-on-surface">{shift.auditor?.name || 'Supervisor'}</span>
 </div>
 ) : (
 <span className="text-on-surface-variant font-bold">-</span>
 )}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 ) : (
 /* ================= AUDIT TRAIL LOGS TAB ================= */
 <div className="space-y-6">
 <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
 <div className="px-6 py-4 bg-surface-container-lowest/40 border-b border-outline-variant flex items-center justify-between">
 <h3 className="font-extrabold text-on-surface flex items-center gap-2">
 <span>Immutable Security & Activity Logs</span>
 </h3>
 <span className="text-xs font-bold text-on-surface-variant font-bold px-3 py-1 bg-gray-100/60 rounded-xl border border-outline-variant/50">
 100 Log Terbaru
 </span>
 </div>

 {logs.length === 0 ? (
 <div className="p-12 text-center text-on-surface-variant font-bold">
 Belum ada riwayat aktivitas log audit yang terekam.
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full border-collapse text-left">
 <thead>
 <tr className="border-b border-outline-variant /80 bg-surface-container-lowest/20 text-on-surface-variant font-bold text-xs font-bold uppercase tracking-wider">
 <th className="p-4">Waktu</th>
 <th className="p-4">Pelaksana (Executor)</th>
 <th className="p-4">Otorisasi (Authorized By)</th>
 <th className="p-4">Aksi</th>
 <th className="p-4">Model & ID</th>
 <th className="p-4 text-center">Detail</th>
 </tr>
 </thead>
 <tbody>
 {logs.map((log) => (
 <tr 
 key={log.id} 
 className="border-b border-outline-variant /60 hover:bg-surface-container-highest-container-lowest/30 transition-all text-sm"
 >
 <td className="p-4 text-xs text-on-surface-variant font-bold font-mono">
 {formatDateTime(log.created_at)}
 </td>
 <td className="p-4">
 <div className="flex flex-col">
 <span className="font-semibold text-on-surface">{log.executor?.name || 'System'}</span>
 <span className="text-xs text-on-surface-variant font-bold capitalize">
 {log.executor?.role ? log.executor.role.replace('_', ' ') : '-'}
 </span>
 </div>
 </td>
 <td className="p-4 text-on-surface">
 {log.authorizer ? (
 <div className="flex flex-col">
 <span className="font-semibold text-on-surface font-semibold">{log.authorizer.name}</span>
 <span className="text-[10px] text-on-surface font-semibold/80 font-bold uppercase">PIN Bypass</span>
 </div>
 ) : (
 <span className="text-on-surface-variant font-bold font-mono">-</span>
 )}
 </td>
 <td className="p-4">
 <span className={`px-2.5 py-1 text-xs font-extrabold rounded-xl uppercase ${
 log.action === 'void' 
 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
 : log.action?.includes('price') 
 ? 'bg-amber-500/10 text-on-surface font-semibold border border-amber-500/20'
 : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
 }`}>
 {log.action}
 </span>
 </td>
 <td className="p-4 text-xs font-mono text-on-surface-variant font-bold">
 <span className="capitalize">
 {log.target_type ? log.target_type.split('\\').pop() : '-'}
 </span>{' '}
 #{log.target_id || '-'}
 </td>
 <td className="p-4 text-center">
 <button
 onClick={() => setSelectedLog(log)}
 className="p-2 bg-gray-100 hover:bg-surface-container-highest-container-lowest-container-highest border border-outline-variant rounded-xl text-on-surface hover:text-on-surface transition-all active:scale-[0.98] transition-all "
 >
 <FileText className="w-4 h-4" />
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
 )}

 {/* ================= SHIFT AUDIT FORM MODAL ================= */}
 {selectedShift && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
 <div className="relative w-full max-w-lg bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-md space-y-6">
 {/* Close button */}
 <button
 onClick={handleCloseAuditModal}
 className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-surface-container-highest-container-lowest/10 text-on-surface-variant font-bold hover:text-on-surface transition-all"
 >
 <X className="w-5 h-5" />
 </button>

 <div className="space-y-2">
 <h3 className="text-2xl font-bold flex items-center gap-2 text-on-surface font-semibold">
 <Clock className="w-6 h-6 text-on-surface font-semibold" />
 Audit Rekonsiliasi Shift
 </h3>
 <p className="text-sm text-on-surface-variant font-bold font-mono">
 Kode Shift: {selectedShift.shift_code}
 </p>
 </div>

 {/* Shift Calculations Info */}
 <div className="p-5 bg-surface-container-lowest/60 rounded-xl border border-outline-variant /80 space-y-3 font-sans">
 <div className="flex justify-between text-sm">
 <span className="text-on-surface-variant font-bold flex items-center gap-1.5">
 <User className="w-4 h-4" /> Kasir Sesi:
 </span>
 <span className="font-semibold text-on-surface">{selectedShift.cashier?.name}</span>
 </div>
 <hr className="border-outline-variant " />
 <div className="flex justify-between text-sm">
 <span className="text-on-surface-variant font-bold flex items-center gap-1.5">
 <DollarSign className="w-4 h-4" /> Modal Awal Laci:
 </span>
 <span className="font-mono font-bold text-on-surface">{formatCurrency(selectedShift.opening_cash)}</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-on-surface-variant font-bold flex items-center gap-1.5">
 <DollarSign className="w-4 h-4" /> Uang Fisik Terinput:
 </span>
 <span className="font-mono font-bold text-on-surface">{formatCurrency(selectedShift.physical_cash_input)}</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-on-surface-variant font-bold flex items-center gap-1.5">
 <DollarSign className="w-4 h-4" /> Ekspektasi Kasir:
 </span>
 <span className="font-mono font-bold text-on-surface">{formatCurrency(selectedShift.expected_cash)}</span>
 </div>
 <hr className="border-outline-variant " />
 <div className="flex justify-between text-base">
 <span className="text-on-surface-variant font-bold flex items-center gap-1.5 font-bold">
 <TrendingDown className="w-4 h-4 text-on-surface font-semibold" /> Selisih Kasir:
 </span>
 <span className={`font-mono font-extrabold ${
 (selectedShift.discrepancy !== null ? parseFloat(selectedShift.discrepancy.toString()) : 0) < 0 
 ? 'text-rose-400' 
 : (selectedShift.discrepancy !== null ? parseFloat(selectedShift.discrepancy.toString()) : 0) > 0 
 ? 'text-on-surface font-semibold' 
 : 'text-on-surface'
 }`}>
 {formatCurrency(selectedShift.discrepancy)}
 </span>
 </div>
 </div>

 <form onSubmit={handleAuditSubmit} className="space-y-6">
 {/* Audit Status Select */}
 <div className="space-y-2">
 <label className="text-sm font-extrabold text-on-surface uppercase tracking-wider">
 Hasil Evaluasi Audit
 </label>
 <div className="grid grid-cols-2 gap-4">
 <button
 type="button"
 onClick={() => setAuditForm(prev => ({ ...prev, audit_status: 'balance' }))}
 className={`flex items-center justify-center gap-2 p-4 border rounded-xl text-sm font-bold transition-all ${
 auditForm.audit_status === 'balance'
 ? 'bg-emerald-500/10 border-emerald-500 text-on-surface font-semibold shadow-sm shadow-emerald-500/5'
 : 'bg-surface-container-lowest/50 border-outline-variant hover:border-outline-variant text-on-surface-variant font-bold'
 }`}
 >
 <CheckCircle2 className="w-4 h-4" />
 Balance (Sesuai)
 </button>
 <button
 type="button"
 onClick={() => setAuditForm(prev => ({ ...prev, audit_status: 'discrepancy' }))}
 className={`flex items-center justify-center gap-2 p-4 border rounded-xl text-sm font-bold transition-all ${
 auditForm.audit_status === 'discrepancy'
 ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-sm shadow-rose-500/5'
 : 'bg-surface-container-lowest/50 border-outline-variant hover:border-outline-variant text-on-surface-variant font-bold'
 }`}
 >
 <AlertTriangle className="w-4 h-4" />
 Discrepancy (Selisih)
 </button>
 </div>
 </div>

 {/* Audit Notes Textarea */}
 <div className="space-y-2">
 <label className="text-sm font-extrabold text-on-surface uppercase tracking-wider flex items-center gap-2">
 <MessageSquare className="w-4 h-4 text-on-surface font-semibold" />
 Catatan Evaluasi / Temuan Audit
 </label>
 <textarea
 value={auditForm.audit_notes}
 onChange={(e) => setAuditForm(prev => ({ ...prev, audit_notes: e.target.value }))}
 placeholder="Contoh: Kesalahan pemberian receh kembali atau input kas fisik tidak teliti."
 className="w-full h-24 px-4 py-3 bg-background border border-outline-variant hover:border-outline-variant focus:border-primary rounded-xl text-sm text-on-surface placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary transition-all font-sans resize-none"
 />
 </div>

 {/* Submit Buttons */}
 <div className="flex gap-4">
 <button
 type="button"
 onClick={handleCloseAuditModal}
 className="flex-1 py-3 bg-surface-container hover:bg-surface-container-highest border border-outline-variant text-sm font-bold rounded-xl text-on-surface transition-all"
 >
 Batal
 </button>
 <button
 type="submit"
 disabled={submitting}
 className="flex-1 py-3 bg-primary hover:bg-primary/95 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
 >
 {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
 Simpan Hasil Audit
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* ================= AUDIT LOG JSON DETAIL MODAL ================= */}
 {selectedLog && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
 <div className="relative w-full max-w-2xl bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-md space-y-6">
 {/* Close button */}
 <button
 onClick={handleCloseLogModal}
 className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-surface-container-highest-container-lowest/10 text-on-surface-variant font-bold hover:text-on-surface transition-all"
 >
 <X className="w-5 h-5" />
 </button>

 <div className="space-y-2">
 <h3 className="text-2xl font-bold text-on-surface font-semibold flex items-center gap-2">
 <Activity className="w-6 h-6 text-on-surface font-semibold" />
 Snapshot Detail Log Audit
 </h3>
 <p className="text-sm text-on-surface-variant font-bold">
 Aksi: <span className="font-extrabold text-on-surface uppercase">{selectedLog.action.replace('_', ' ')}</span> | ID: #{selectedLog.id}
 </p>
 </div>

 {/* Human-Readable Rendered Grid */}
 <div className="space-y-4">
 <div className="text-sm font-extrabold text-on-surface uppercase tracking-wider">
 Informasi Detail Tindakan
 </div>
 {renderAuditLogDetails(selectedLog)}
 </div>

 {/* Developer Raw JSON Toggle */}
 <div className="border-t border-outline-variant /80 pt-4 space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-on-surface-variant font-bold">Mendiagnosis masalah sistem?</span>
 <button
 type="button"
 onClick={() => setShowRawJson(prev => !prev)}
 className="text-xs font-bold text-on-surface font-semibold hover:text-violet-300 transition-all underline"
 >
 {showRawJson ? 'Sembunyikan Raw JSON' : 'Tampilkan Raw JSON (Developer)'}
 </button>
 </div>

 {showRawJson && (
 <div className="bg-background border border-outline-variant rounded-xl p-4 overflow-y-auto max-h-48">
 <pre className="text-[10px] font-mono text-on-surface font-semibold whitespace-pre-wrap leading-normal">
 {JSON.stringify(
 typeof selectedLog.details === 'string'
 ? JSON.parse(selectedLog.details)
 : selectedLog.details,
 null,
 2
 )}
 </pre>
 </div>
 )}
 </div>

 <button
 onClick={handleCloseLogModal}
 className="w-full py-3 bg-surface-container-lowest-container-highest hover:bg-gray-100 border border-outline-variant text-sm font-bold rounded-xl transition-all"
 >
 Tutup Detail
 </button>
 </div>
 </div>
 )}
 </div>
 );
}
