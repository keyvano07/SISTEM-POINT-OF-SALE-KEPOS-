'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';
import { Clipboard, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface Product { id: number; sku: string; barcode: string; name: string; stock_quantity: number; buy_price: string; }
interface StockAdjustment {
  id: number; product_id: number; quantity_change: number; financial_value: string;
  reason_code: 'damaged' | 'expired' | 'opname'; status: 'approved' | 'pending_approval' | 'rejected';
  notes: string | null; approved_at: string | null; created_at: string;
  product?: Product; requester?: { name: string }; approver?: { name: string } | null;
}

export default function StockerDashboardPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [restockForm, setRestockForm] = useState({ product_id: '', quantity: '', notes: '' });
  const [damagedForm, setDamagedForm] = useState({ product_id: '', quantity: '', reason_code: 'damaged', notes: '' });
  const [opnameForm, setOpnameForm] = useState({ product_id: '', quantity: '', type: 'deficit', notes: '' });

  const [pinModal, setPinModal] = useState<{
    isOpen: boolean; action: 'approve' | 'reject'; adjustmentId: number | null; pin: string; notes: string; error: string | null;
  }>({ isOpen: false, action: 'approve', adjustmentId: null, pin: '', notes: '', error: null });

  useEffect(() => {
    if (token) {
      if (user && !['super_admin', 'manager', 'supervisor', 'stocker'].includes(user.role)) { router.push('/dashboard'); return; }
      fetchData();
    }
  }, [token, user, router]);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const [prodRes, adjRes] = await Promise.all([api.get('/products'), api.get('/stock-adjustments')]);
      setProducts(prodRes.data.data); setAdjustments(adjRes.data.data);
      if (prodRes.data.data.length > 0) {
        const firstId = prodRes.data.data[0].id.toString();
        setRestockForm(prev => ({ ...prev, product_id: firstId }));
        setDamagedForm(prev => ({ ...prev, product_id: firstId }));
        setOpnameForm(prev => ({ ...prev, product_id: firstId }));
      }
    } catch (err) { console.error(err); setError('Gagal memuat data dari server backend.'); }
    finally { setLoading(false); }
  };

  const triggerAlert = (type: 'success' | 'error', text: string) => { setAlertMsg({ type, text }); setTimeout(() => setAlertMsg(null), 5000); };
  const getSelectedProductInfo = (idString: string) => { const prod = products.find(p => p.id.toString() === idString); return prod ? `Stok saat ini: ${prod.stock_quantity} unit` : ''; };
  const openPinModal = (action: 'approve' | 'reject', adjustmentId: number) => { setPinModal({ isOpen: true, action, adjustmentId, pin: '', notes: '', error: null }); };
  const closePinModal = () => { setPinModal(prev => ({ ...prev, isOpen: false })); };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { action, adjustmentId, pin, notes } = pinModal;
    if (!adjustmentId || !pin) return;
    if (pin.length !== 6 || isNaN(Number(pin))) { setPinModal(prev => ({ ...prev, error: 'PIN harus berupa 6 digit angka.' })); return; }
    setSubmitting(true); setPinModal(prev => ({ ...prev, error: null }));
    try {
      const payload: { pin: string; notes?: string } = { pin }; if (action === 'reject') payload.notes = notes;
      const response = await api.post(`/stock-adjustments/${adjustmentId}/${action}`, payload);
      if (response.data.success) { triggerAlert('success', response.data.message); closePinModal(); fetchData(); }
    } catch (err) { console.error(err);
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Gagal memproses otorisasi PIN.';
      setPinModal(prev => ({ ...prev, error: msg }));
    } finally { setSubmitting(false); }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!restockForm.product_id || !restockForm.quantity) return; setSubmitting(true);
    try {
      const response = await api.post('/stock-adjustments/restock', { product_id: parseInt(restockForm.product_id), quantity: parseInt(restockForm.quantity), notes: restockForm.notes });
      if (response.data.success) { triggerAlert('success', response.data.message); setRestockForm(prev => ({ ...prev, quantity: '', notes: '' })); fetchData(); }
    } catch (err) { console.error(err); triggerAlert('error', ((err as { response?: { data?: { message?: string } } })).response?.data?.message || 'Gagal menyimpan barang masuk.'); }
    finally { setSubmitting(false); }
  };

  const handleDamagedSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!damagedForm.product_id || !damagedForm.quantity) return; setSubmitting(true);
    try {
      const qty = Math.abs(parseInt(damagedForm.quantity)) * -1;
      const response = await api.post('/stock-adjustments', { product_id: parseInt(damagedForm.product_id), quantity_change: qty, reason_code: damagedForm.reason_code, notes: damagedForm.notes });
      if (response.data.success) { triggerAlert('success', response.data.message); setDamagedForm(prev => ({ ...prev, quantity: '', notes: '' })); fetchData(); }
    } catch (err) { console.error(err); triggerAlert('error', ((err as { response?: { data?: { message?: string } } })).response?.data?.message || 'Gagal menyimpan pencatatan barang rusak/expired.'); }
    finally { setSubmitting(false); }
  };

  const handleOpnameSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!opnameForm.product_id || !opnameForm.quantity) return; setSubmitting(true);
    try {
      const baseQty = Math.abs(parseInt(opnameForm.quantity));
      const qty = opnameForm.type === 'deficit' ? -baseQty : baseQty;
      const response = await api.post('/stock-adjustments', { product_id: parseInt(opnameForm.product_id), quantity_change: qty, reason_code: 'opname', notes: opnameForm.notes });
      if (response.data.success) { triggerAlert('success', response.data.message); setOpnameForm(prev => ({ ...prev, quantity: '', notes: '' })); fetchData(); }
    } catch (err) { console.error(err); triggerAlert('error', ((err as { response?: { data?: { message?: string } } })).response?.data?.message || 'Gagal menyimpan penyesuaian stok opname.'); }
    finally { setSubmitting(false); }
  };

  const selectClass = "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-primary/10 text-primary rounded-lg"><Clipboard className="w-5 h-5" /></div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gudang & Logistik</h1>
          <p className="text-sm text-muted-foreground">Pencatatan penyesuaian stok, restock barang masuk, dan monitoring log</p>
        </div>
      </div>

      {alertMsg && (
        <Alert variant={alertMsg.type === 'success' ? 'success' : 'destructive'} className="animate-fade-in">
          {alertMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <AlertDescription className="font-medium">{alertMsg.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-5">
              <Tabs defaultValue="restock" className="space-y-4">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="restock" className="text-xs">Barang Masuk</TabsTrigger>
                  <TabsTrigger value="damaged" className="text-xs">Rusak/Expired</TabsTrigger>
                  <TabsTrigger value="opname" className="text-xs">Stok Opname</TabsTrigger>
                </TabsList>

                <TabsContent value="restock">
                  <form onSubmit={handleRestockSubmit} className="space-y-4">
                    <h3 className="text-sm font-bold text-primary">Form Input Barang Masuk</h3>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Pilih Produk</Label>
                      {loading ? <p className="text-xs text-muted-foreground">Memuat...</p> : (
                        <>
                          <select value={restockForm.product_id} onChange={(e) => setRestockForm({...restockForm, product_id: e.target.value})} className={selectClass}>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                          </select>
                          <span className="text-xs text-emerald-600 font-medium">{getSelectedProductInfo(restockForm.product_id)}</span>
                        </>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Kuantitas Masuk</Label>
                      <Input type="number" required min="1" placeholder="50" value={restockForm.quantity} onChange={(e) => setRestockForm({...restockForm, quantity: e.target.value})} />
                      <p className="text-[10px] text-muted-foreground">Stok produk akan langsung bertambah.</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Catatan</Label>
                      <Textarea placeholder="Nomor PO, pengirim..." rows={3} value={restockForm.notes} onChange={(e) => setRestockForm({...restockForm, notes: e.target.value})} />
                    </div>
                    <Button type="submit" disabled={submitting} className="w-full gap-2">
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Simpan Barang Masuk
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="damaged">
                  <form onSubmit={handleDamagedSubmit} className="space-y-4">
                    <h3 className="text-sm font-bold text-destructive">Pencatatan Barang Rusak / Kadaluwarsa</h3>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Pilih Produk</Label>
                      <select value={damagedForm.product_id} onChange={(e) => setDamagedForm({...damagedForm, product_id: e.target.value})} className={selectClass}>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </select>
                      <span className="text-xs text-emerald-600 font-medium">{getSelectedProductInfo(damagedForm.product_id)}</span>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Kuantitas</Label>
                      <Input type="number" required min="1" placeholder="5" value={damagedForm.quantity} onChange={(e) => setDamagedForm({...damagedForm, quantity: e.target.value})} />
                      <p className="text-[10px] text-destructive font-medium">⚠️ Akan diproses sebagai pengurangan stok (-{damagedForm.quantity || '0'}).</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Alasan</Label>
                      <select value={damagedForm.reason_code} onChange={(e) => setDamagedForm({...damagedForm, reason_code: e.target.value})} className={selectClass}>
                        <option value="damaged">Barang Rusak</option><option value="expired">Kadaluwarsa</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Catatan</Label>
                      <Textarea placeholder="Detail kronologi..." rows={3} value={damagedForm.notes} onChange={(e) => setDamagedForm({...damagedForm, notes: e.target.value})} />
                    </div>
                    <Button type="submit" disabled={submitting} variant="destructive" className="w-full gap-2">
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Catat Barang Rusak/Expired
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="opname">
                  <form onSubmit={handleOpnameSubmit} className="space-y-4">
                    <h3 className="text-sm font-bold text-amber-600">Penyesuaian Stok Opname</h3>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Pilih Produk</Label>
                      <select value={opnameForm.product_id} onChange={(e) => setOpnameForm({...opnameForm, product_id: e.target.value})} className={selectClass}>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </select>
                      <span className="text-xs text-emerald-600 font-medium">{getSelectedProductInfo(opnameForm.product_id)}</span>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Tipe Selisih</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => setOpnameForm({...opnameForm, type: 'deficit'})}
                          className={`p-3 rounded-lg border text-sm font-semibold transition-all ${opnameForm.type === 'deficit' ? 'bg-destructive/10 border-destructive/40 text-destructive' : 'border-input hover:border-border text-muted-foreground'}`}>
                          Kurang (Defisit)
                        </button>
                        <button type="button" onClick={() => setOpnameForm({...opnameForm, type: 'surplus'})}
                          className={`p-3 rounded-lg border text-sm font-semibold transition-all ${opnameForm.type === 'surplus' ? 'bg-emerald-50 border-emerald-400 text-emerald-600' : 'border-input hover:border-border text-muted-foreground'}`}>
                          Lebih (Surplus)
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Jumlah Selisih</Label>
                      <Input type="number" required min="1" placeholder="3" value={opnameForm.quantity} onChange={(e) => setOpnameForm({...opnameForm, quantity: e.target.value})} />
                      <p className="text-[10px] font-medium">{opnameForm.type === 'deficit' ? <span className="text-destructive">Stok berkurang -{opnameForm.quantity || '0'}</span> : <span className="text-emerald-600">Stok bertambah +{opnameForm.quantity || '0'}</span>}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Catatan</Label>
                      <Textarea placeholder="Detail selisih opname..." rows={3} value={opnameForm.notes} onChange={(e) => setOpnameForm({...opnameForm, notes: e.target.value})} />
                    </div>
                    <Button type="submit" disabled={submitting} variant="warning" className="w-full gap-2">
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Simpan Penyesuaian Opname
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* History Column */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-bold flex items-center gap-2"><Clipboard className="w-4 h-4 text-primary" /> Riwayat Log Gudang</h2>
                <Button variant="ghost" size="sm" onClick={fetchData} className="text-xs text-primary">Refresh</Button>
              </div>
              {loading ? (
                <div className="flex flex-col items-center py-16 gap-3"><Loader2 className="w-8 h-8 animate-spin text-primary" /><span className="text-sm text-muted-foreground">Memuat histori...</span></div>
              ) : error ? (
                <div className="text-center py-16 text-destructive font-semibold">{error}</div>
              ) : adjustments.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">Belum ada transaksi log.</div>
              ) : (
                <Table>
                  <TableHeader><TableRow className="bg-muted/50">
                    <TableHead>Tanggal</TableHead><TableHead>Produk</TableHead><TableHead className="text-center">Selisih</TableHead>
                    <TableHead className="text-right">Nilai</TableHead><TableHead className="text-center">Status</TableHead><TableHead>Keterangan</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {adjustments.map(adj => (
                      <TableRow key={adj.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(adj.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-sm">{adj.product?.name || 'Produk Terhapus'}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{adj.product?.sku}</div>
                        </TableCell>
                        <TableCell className={`text-center font-bold font-mono ${adj.quantity_change > 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                          {adj.quantity_change > 0 ? `+${adj.quantity_change}` : adj.quantity_change}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">Rp {parseFloat(adj.financial_value).toLocaleString('id-ID')}</TableCell>
                        <TableCell className="text-center">
                          {adj.status === 'pending_approval' && user && ['super_admin', 'manager', 'supervisor'].includes(user.role) ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <Button size="sm" variant="success" onClick={() => openPinModal('approve', adj.id)} className="h-7 text-xs px-2">Approve</Button>
                              <Button size="sm" variant="destructive" onClick={() => openPinModal('reject', adj.id)} className="h-7 text-xs px-2">Reject</Button>
                            </div>
                          ) : (
                            <Badge variant={adj.status === 'approved' ? 'success' : adj.status === 'pending_approval' ? 'warning' : 'destructive'} className="text-[10px] uppercase">
                              {adj.status === 'approved' ? 'Approved' : adj.status === 'pending_approval' ? 'Pending' : 'Rejected'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs max-w-[150px]">
                          <div className="font-semibold text-muted-foreground capitalize">{adj.reason_code === 'damaged' ? 'Rusak' : adj.reason_code === 'expired' ? 'Kedaluwarsa' : 'Opname'}</div>
                          {adj.notes && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{adj.notes}</div>}
                          {adj.approver && <div className="text-[9px] text-primary mt-1">Oleh: {adj.approver.name}</div>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PIN Modal */}
      <Dialog open={pinModal.isOpen} onOpenChange={(open) => !open && closePinModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${pinModal.action === 'approve' ? 'text-emerald-600' : 'text-destructive'}`} />
              Otorisasi PIN — {pinModal.action === 'approve' ? 'Persetujuan' : 'Penolakan'}
            </DialogTitle>
            <DialogDescription>Tindakan ini memerlukan PIN dari Supervisor atau Manajer.</DialogDescription>
          </DialogHeader>
          {pinModal.error && (
            <Alert variant="destructive"><AlertDescription className="font-medium">{pinModal.error}</AlertDescription></Alert>
          )}
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">PIN Otorisasi (6 Digit)</Label>
              <Input type="password" required maxLength={6} value={pinModal.pin}
                onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); setPinModal({...pinModal, pin: val}); }}
                placeholder="••••••" className="text-center text-lg font-bold tracking-widest" />
            </div>
            {pinModal.action === 'reject' && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Alasan Penolakan</Label>
                <Textarea required rows={3} value={pinModal.notes} onChange={(e) => setPinModal({...pinModal, notes: e.target.value})} placeholder="Alasan ditolak..." />
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={closePinModal}>Batal</Button>
              <Button type="submit" disabled={submitting} variant={pinModal.action === 'approve' ? 'success' : 'destructive'} className="gap-1.5">
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {pinModal.action === 'approve' ? 'Setujui' : 'Tolak'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
