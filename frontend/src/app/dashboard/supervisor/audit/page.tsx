'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';
import { ShieldCheck, Loader2, AlertTriangle, CheckCircle2, Activity, User, DollarSign, MessageSquare, FileText, Clock, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface UserData { id: number; name: string; email: string; role: string; }
interface Shift {
  id: number; shift_code: string; opening_cash: string | number; physical_cash_input: string | number | null;
  expected_cash: string | number | null; discrepancy: string | number | null;
  status: 'open' | 'closed'; audit_status: 'pending' | 'balance' | 'discrepancy';
  audit_notes: string | null; opened_at: string; closed_at: string | null; audited_at: string | null;
  cashier?: UserData; auditor?: UserData;
}
interface AuditLog {
  id: number; action: string; target_type: string; target_id: number;
  details: string | Record<string, unknown> | null; created_at: string;
  executor?: UserData; authorizer?: UserData;
}

export default function SupervisorAuditPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState('shifts');
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [auditForm, setAuditForm] = useState({ audit_status: 'balance' as 'balance' | 'discrepancy', audit_notes: '' });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  useEffect(() => {
    if (token) {
      if (user && !['super_admin', 'manager', 'supervisor'].includes(user.role)) { router.push('/dashboard'); return; }
      fetchData();
    }
  }, [token, user, router, activeTab]);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      if (activeTab === 'shifts') { const res = await api.get('/shifts'); setShifts(res.data.data || []); }
      else { const res = await api.get('/audit-logs'); setLogs(res.data.data || []); }
    } catch (err) { console.error(err); setError('Gagal mengambil data dari server.'); }
    finally { setLoading(false); }
  };

  const triggerAlert = (type: 'success' | 'error', text: string) => { setAlertMsg({ type, text }); setTimeout(() => setAlertMsg(null), 5000); };
  const formatCurrency = (value: number | string | null) => {
    if (value === null || value === undefined) return '-';
    const num = typeof value === 'number' ? value : parseFloat(value || '0');
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
  };
  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-'; return new Date(dateStr).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const handleOpenAuditModal = (shift: Shift) => {
    setSelectedShift(shift);
    const hasDiscrepancy = shift.discrepancy !== null && parseFloat(shift.discrepancy.toString()) !== 0;
    setAuditForm({ audit_status: hasDiscrepancy ? 'discrepancy' : 'balance', audit_notes: shift.audit_notes || '' });
  };

  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedShift) return; setSubmitting(true);
    try {
      const res = await api.post(`/shifts/${selectedShift.id}/audit`, { audit_status: auditForm.audit_status, audit_notes: auditForm.audit_notes });
      if (res.data.success) { triggerAlert('success', 'Hasil rekonsiliasi audit shift berhasil disimpan.'); setSelectedShift(null); fetchData(); }
    } catch (err) { console.error(err); triggerAlert('error', ((err as { response?: { data?: { message?: string } } })).response?.data?.message || 'Gagal menyimpan audit.'); }
    finally { setSubmitting(false); }
  };

  const renderAuditLogDetails = (log: AuditLog) => {
    let detailsObj: Record<string, unknown> = {};
    try { detailsObj = typeof log.details === 'string' ? JSON.parse(log.details) : log.details || {}; } catch (e) { console.error(e); }
    const keyTranslations: Record<string, string> = {
      invoice_number: 'Nomor Invoice', reason: 'Alasan Void', grand_total: 'Total Transaksi', voided_at: 'Waktu Pembatalan',
      product_name: 'Nama Produk', old_buy_price: 'Harga Beli Lama', new_buy_price: 'Harga Beli Baru',
      old_sell_price: 'Harga Jual Lama', new_sell_price: 'Harga Jual Baru', changed_at: 'Waktu Perubahan',
      quantity_change: 'Jumlah Perubahan Stok', financial_value: 'Nilai Finansial', reason_code: 'Alasan Penyesuaian', approved_at: 'Waktu Persetujuan',
    };
    const formatValue = (key: string, val: unknown) => {
      if (val === null || val === undefined) return '-';
      if (['grand_total', 'old_buy_price', 'new_buy_price', 'old_sell_price', 'new_sell_price', 'financial_value'].includes(key)) return <span className="font-mono font-semibold">{formatCurrency(val as string | number)}</span>;
      if (['voided_at', 'changed_at', 'approved_at'].includes(key)) return <span>{formatDateTime(val as string)}</span>;
      if (key === 'quantity_change') { const num = parseInt(String(val)); return <span className={`font-bold font-mono ${num > 0 ? 'text-emerald-600' : 'text-destructive'}`}>{num > 0 ? `+${num}` : num} unit</span>; }
      if (key === 'reason_code') { const labels: Record<string, string> = { damaged: 'Barang Rusak', expired: 'Kedaluwarsa', opname: 'Stock Opname' }; return <Badge variant="secondary">{labels[String(val)] || String(val)}</Badge>; }
      return <span>{String(val)}</span>;
    };
    if (Object.keys(detailsObj).length === 0) return <div className="text-center py-6 text-muted-foreground text-sm">Tidak ada detail tambahan.</div>;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Object.entries(detailsObj).map(([key, val]) => (
          <div key={key} className="p-3 bg-muted/50 border rounded-lg space-y-1">
            <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{keyTranslations[key] || key}</span>
            <div className="text-sm font-medium">{formatValue(key, val)}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {alertMsg && (
        <Alert variant={alertMsg.type === 'success' ? 'success' : 'destructive'} className="animate-fade-in fixed top-6 right-6 z-50 w-auto max-w-md shadow-lg">
          {alertMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <AlertDescription className="font-medium">{alertMsg.text}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-primary/10 text-primary rounded-lg"><ShieldCheck className="w-5 h-5" /></div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit & Rekonsiliasi Toko</h1>
          <p className="text-sm text-muted-foreground">Kelola rekonsiliasi shift kasir dan pantau jejak audit digital.</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full md:w-80 bg-muted/50 p-1 rounded-xl border">
          <TabsTrigger value="shifts" className="gap-2 rounded-lg font-semibold data-[state=active]:shadow-sm">
            <Clock className="w-4 h-4" />
            <span>Rekonsiliasi Shift</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2 rounded-lg font-semibold data-[state=active]:shadow-sm">
            <Activity className="w-4 h-4" />
            <span>Audit Trail</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shifts" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 animate-spin text-primary" /><p className="text-sm text-muted-foreground">Memuat data shift...</p></div>
              ) : error ? (
                <div className="p-12 flex flex-col items-center gap-3 text-destructive"><AlertTriangle className="w-8 h-8" /><p className="font-semibold">{error}</p><Button variant="destructive" size="sm" onClick={fetchData}>Coba Lagi</Button></div>
              ) : shifts.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">Belum ada shift kasir.</div>
              ) : (
                <Table>
                  <TableHeader><TableRow className="bg-muted/50">
                    <TableHead>Kode Shift</TableHead><TableHead>Kasir</TableHead><TableHead>Waktu</TableHead>
                    <TableHead className="text-right">Modal</TableHead><TableHead className="text-right">Fisik</TableHead>
                    <TableHead className="text-right">Ekspektasi</TableHead><TableHead className="text-right">Selisih</TableHead>
                    <TableHead className="text-center">Status</TableHead><TableHead className="text-center">Aksi</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {shifts.map(shift => {
                      const discVal = shift.discrepancy !== null ? parseFloat(shift.discrepancy.toString()) : 0;
                      return (
                        <TableRow key={shift.id}>
                          <TableCell className="font-mono font-semibold text-primary">{shift.shift_code}</TableCell>
                          <TableCell>
                            <div className="font-semibold">{shift.cashier?.name || 'Staff'}</div>
                            <div className="text-xs text-muted-foreground">{shift.cashier?.email}</div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground space-y-1.5 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                              <span>{formatDateTime(shift.opened_at)}</span>
                            </div>
                            {shift.closed_at ? (
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                                <span>{formatDateTime(shift.closed_at)}</span>
                              </div>
                            ) : (
                              <div className="pl-3">
                                <Badge className="text-[9px] uppercase px-1.5 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 border-none shadow-none font-bold">
                                  Aktif
                                </Badge>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(shift.opening_cash)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(shift.physical_cash_input)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(shift.expected_cash)}</TableCell>
                          <TableCell className={`text-right font-mono font-bold ${discVal < 0 ? 'text-destructive' : discVal > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                            {discVal > 0 ? '+' : ''}{formatCurrency(shift.discrepancy)}
                          </TableCell>
                          <TableCell className="text-center">
                            {shift.status === 'open' ? <Badge variant="secondary">Berjalan</Badge>
                              : shift.audit_status === 'pending' ? <Badge variant="warning">Pending</Badge>
                              : shift.audit_status === 'balance' ? <Badge variant="success">Balance</Badge>
                              : <Badge variant="destructive">Discrepancy</Badge>}
                          </TableCell>
                          <TableCell className="text-center">
                            {shift.status === 'closed' && shift.audit_status === 'pending' ? (
                              <Button size="sm" onClick={() => handleOpenAuditModal(shift)} className="text-xs">Audit Shift</Button>
                            ) : shift.status === 'closed' ? (
                              <div className="text-[10px] text-muted-foreground"><span className="block uppercase font-semibold">Diaudit Oleh</span><span className="font-semibold">{shift.auditor?.name || 'Supervisor'}</span></div>
                            ) : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 animate-spin text-primary" /><p className="text-sm text-muted-foreground">Memuat audit logs...</p></div>
              ) : error ? (
                <div className="p-12 flex flex-col items-center gap-3 text-destructive"><AlertTriangle className="w-8 h-8" /><p className="font-semibold">{error}</p></div>
              ) : logs.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">Belum ada riwayat log audit.</div>
              ) : (
                <Table>
                  <TableHeader><TableRow className="bg-muted/50">
                    <TableHead>Waktu</TableHead><TableHead>Pelaksana</TableHead><TableHead>Otorisasi</TableHead>
                    <TableHead>Aksi</TableHead><TableHead>Model & ID</TableHead><TableHead className="text-center">Detail</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {logs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground font-mono">{formatDateTime(log.created_at)}</TableCell>
                        <TableCell>
                          <div className="font-semibold">{log.executor?.name || 'System'}</div>
                          <div className="text-xs text-muted-foreground capitalize">{log.executor?.role?.replace('_', ' ') || '-'}</div>
                        </TableCell>
                        <TableCell>
                          {log.authorizer ? (<><div className="font-semibold">{log.authorizer.name}</div><div className="text-[10px] text-primary font-semibold">PIN Bypass</div></>) : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.action === 'void' ? 'destructive' : log.action?.includes('price') ? 'warning' : 'default'} className="uppercase text-[10px]">{log.action}</Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          <span className="capitalize">{log.target_type ? log.target_type.split('\\').pop() : '-'}</span> #{log.target_id || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedLog(log)}>
                            <FileText className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Audit Form Dialog */}
      <Dialog open={!!selectedShift} onOpenChange={(open) => !open && setSelectedShift(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Audit Rekonsiliasi Shift</DialogTitle>
            <DialogDescription>Kode Shift: {selectedShift?.shift_code}</DialogDescription>
          </DialogHeader>
          {selectedShift && (
            <>
              <Card className="bg-muted/30"><CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Kasir:</span><span className="font-semibold">{selectedShift.cashier?.name}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Modal Awal:</span><span className="font-mono font-semibold">{formatCurrency(selectedShift.opening_cash)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Uang Fisik:</span><span className="font-mono font-semibold">{formatCurrency(selectedShift.physical_cash_input)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Ekspektasi:</span><span className="font-mono font-semibold">{formatCurrency(selectedShift.expected_cash)}</span></div>
                <Separator />
                <div className="flex justify-between text-base">
                  <span className="text-muted-foreground flex items-center gap-1.5 font-semibold"><TrendingDown className="w-4 h-4 text-primary" /> Selisih:</span>
                  <span className={`font-mono font-bold ${(selectedShift.discrepancy !== null ? parseFloat(selectedShift.discrepancy.toString()) : 0) < 0 ? 'text-destructive' : 'text-emerald-600'}`}>{formatCurrency(selectedShift.discrepancy)}</span>
                </div>
              </CardContent></Card>
              <form onSubmit={handleAuditSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Hasil Evaluasi</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setAuditForm(prev => ({...prev, audit_status: 'balance'}))}
                      className={`p-3 border rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${auditForm.audit_status === 'balance' ? 'bg-emerald-50 border-emerald-500 text-emerald-600 shadow-sm' : 'border-input text-muted-foreground'}`}>
                      <CheckCircle2 className="w-4 h-4" /> Balance
                    </button>
                    <button type="button" onClick={() => setAuditForm(prev => ({...prev, audit_status: 'discrepancy'}))}
                      className={`p-3 border rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${auditForm.audit_status === 'discrepancy' ? 'bg-red-50 border-destructive text-destructive shadow-sm' : 'border-input text-muted-foreground'}`}>
                      <AlertTriangle className="w-4 h-4" /> Discrepancy
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5" /> Catatan Audit</Label>
                  <Textarea value={auditForm.audit_notes} onChange={(e) => setAuditForm(prev => ({...prev, audit_notes: e.target.value}))} placeholder="Temuan evaluasi..." />
                </div>
                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={() => setSelectedShift(null)}>Batal</Button>
                  <Button type="submit" disabled={submitting} className="gap-1.5">{submitting && <Loader2 className="w-4 h-4 animate-spin" />} Simpan Audit</Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => { if (!open) { setSelectedLog(null); setShowRawJson(false); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> Detail Log Audit</DialogTitle>
            <DialogDescription>Aksi: <span className="font-bold uppercase">{selectedLog?.action.replace('_', ' ')}</span> | ID: #{selectedLog?.id}</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Informasi Detail</h4>
                {renderAuditLogDetails(selectedLog)}
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Raw JSON (Developer)</span>
                  <Button variant="link" size="sm" onClick={() => setShowRawJson(prev => !prev)} className="text-xs h-auto p-0">
                    {showRawJson ? 'Sembunyikan' : 'Tampilkan'}
                  </Button>
                </div>
                {showRawJson && (
                  <ScrollArea className="h-40 border rounded-lg p-3">
                    <pre className="text-[10px] font-mono whitespace-pre-wrap">
                      {JSON.stringify(typeof selectedLog.details === 'string' ? JSON.parse(selectedLog.details) : selectedLog.details, null, 2)}
                    </pre>
                  </ScrollArea>
                )}
              </div>
              <Button variant="outline" className="w-full" onClick={() => { setSelectedLog(null); setShowRawJson(false); }}>Tutup Detail</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
