'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';
import { Users, Plus, Search, Loader2, AlertTriangle, CheckCircle, Smartphone, Mail, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface Member {
  id: number; member_code: string; name: string; phone: string; email: string | null;
  points: number; total_spending: string; tier: 'bronze' | 'silver' | 'gold'; created_at: string;
}

export default function MemberManagementPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (token) {
      if (user && !['super_admin', 'manager', 'supervisor'].includes(user.role)) { router.push('/dashboard'); return; }
      fetchMembers();
    }
  }, [token, user, router]);

  const fetchMembers = async () => {
    setLoading(true); setError(null);
    try { const res = await api.get('/members'); setMembers(res.data.data || []); }
    catch (err) { console.error(err); setError('Gagal memuat daftar member dari server.'); }
    finally { setLoading(false); }
  };

  const triggerAlert = (type: 'success' | 'error', text: string) => { setAlertMsg({ type, text }); setTimeout(() => setAlertMsg(null), 5000); };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
  const formatCurrency = (val: string | number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(typeof val === 'string' ? parseFloat(val) : val);

  const handleRegisterMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const res = await api.post('/members', { name: formData.name.trim(), phone: formData.phone.trim(), email: formData.email.trim() || null });
      if (res.data.success) { triggerAlert('success', `Member "${formData.name}" berhasil didaftarkan.`); setIsAddModalOpen(false); setFormData({ name: '', phone: '', email: '' }); fetchMembers(); }
    } catch (err: unknown) { console.error(err); triggerAlert('error', (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal mendaftarkan member baru.'); }
    finally { setSubmitting(false); }
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) || member.member_code.toLowerCase().includes(searchQuery.toLowerCase()) || member.phone.includes(searchQuery) || (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch && (filterTier ? member.tier === filterTier : true);
  });

  const tierBadgeVariant = (tier: string) => tier === 'gold' ? 'gold' as const : tier === 'silver' ? 'silver' as const : 'bronze' as const;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-lg"><Users className="w-5 h-5" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Manajemen Member</h1>
            <p className="text-sm text-muted-foreground">Kelola profil, poin, dan tingkatan membership pelanggan.</p>
          </div>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Daftar Member Baru</Button>
      </div>

      {alertMsg && (
        <Alert variant={alertMsg.type === 'success' ? 'success' : 'destructive'} className="animate-fade-in">
          {alertMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <AlertDescription className="font-medium">{alertMsg.text}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-5 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Member</p>
          <p className="text-3xl font-bold">{members.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gold (VIP)</p>
          <p className="text-3xl font-bold text-amber-500">{members.filter(m => m.tier === 'gold').length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Silver</p>
          <p className="text-3xl font-bold text-slate-400">{members.filter(m => m.tier === 'silver').length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bronze</p>
          <p className="text-3xl font-bold text-amber-700">{members.filter(m => m.tier === 'bronze').length}</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cari nama, kode member, HP, atau email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)}
            className="flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">Semua Tier</option><option value="gold">Gold (VIP)</option>
            <option value="silver">Silver</option><option value="bronze">Bronze</option>
          </select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 animate-spin text-primary" /><p className="text-sm text-muted-foreground">Mengambil data member...</p></div>
          ) : error ? (
            <div className="p-12 flex flex-col items-center gap-2 text-destructive"><AlertTriangle className="w-8 h-8" /><p className="text-sm font-semibold">{error}</p></div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">Belum ada member yang cocok.</div>
          ) : (
            <Table>
              <TableHeader><TableRow className="bg-muted/50">
                <TableHead>Kode Member</TableHead><TableHead>Nama</TableHead><TableHead>Kontak</TableHead>
                <TableHead className="text-center">Tier</TableHead><TableHead className="text-center">Poin</TableHead>
                <TableHead className="text-right">Total Belanja</TableHead><TableHead className="text-right">Terdaftar</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredMembers.map(member => (
                  <TableRow key={member.id}>
                    <TableCell className="font-mono font-semibold text-primary">#{member.member_code}</TableCell>
                    <TableCell className="font-semibold">{member.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm"><Smartphone className="w-3.5 h-3.5 text-muted-foreground" />{member.phone}</div>
                      {member.email && <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5"><Mail className="w-3 h-3" />{member.email}</div>}
                    </TableCell>
                    <TableCell className="text-center"><Badge variant={tierBadgeVariant(member.tier)} className="uppercase text-[10px]">{member.tier}</Badge></TableCell>
                    <TableCell className="text-center font-mono font-semibold text-emerald-600">{member.points}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{formatCurrency(member.total_spending)}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      <div className="flex items-center justify-end gap-1"><Clock className="w-3 h-3" />{new Date(member.created_at).toLocaleDateString('id-ID')}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Register Member Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Pendaftaran Member Baru</DialogTitle>
            <DialogDescription>Daftarkan pelanggan baru sebagai member untuk mendapatkan poin dan diskon.</DialogDescription></DialogHeader>
          <form onSubmit={handleRegisterMemberSubmit} className="space-y-4">
            <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Nama Lengkap *</Label>
              <Input type="text" name="name" required placeholder="John Doe" value={formData.name} onChange={handleInputChange} /></div>
            <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Nomor HP / WhatsApp *</Label>
              <Input type="tel" name="phone" required placeholder="081234567890" value={formData.phone} onChange={handleInputChange} /></div>
            <div className="space-y-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Email (Opsional)</Label>
              <Input type="email" name="email" placeholder="john@email.com" value={formData.email} onChange={handleInputChange} /></div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Batal</Button>
              <Button type="submit" disabled={submitting} className="gap-1.5">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Daftar Member</span>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
