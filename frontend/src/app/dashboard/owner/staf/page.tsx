'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';
import { 
  Users, Plus, Search, Loader2, AlertTriangle, CheckCircle, 
  Mail, Clock, Shield, Edit2, Trash2, KeyRound 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface Staf {
  id: number;
  name: string;
  email: string;
  role: 'manager' | 'supervisor' | 'kasir' | 'pramuniaga' | 'stocker';
  store_id: number;
  created_at: string;
}

export default function OwnerStafManagementPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  
  const [stafList, setStafList] = useState<Staf[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRole]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStaf, setSelectedStaf] = useState<Staf | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    pin: '',
    role: 'kasir' as Staf['role']
  });
  
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (token) {
      if (user && user.role !== 'owner' && user.role !== 'super_admin') {
        router.push('/dashboard');
        return;
      }
      fetchStaf();
    }
  }, [token, user, router]);

  const fetchStaf = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/owner/users');
      setStafList(res.data.data || []);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat daftar staf toko.');
    } finally {
      setLoading(false);
    }
  };

  const triggerAlert = (type: 'success' | 'error', text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 5000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenAddModal = () => {
    setSelectedStaf(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      pin: '',
      role: 'kasir'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (staf: Staf) => {
    setSelectedStaf(staf);
    setFormData({
      name: staf.name,
      email: staf.email,
      password: '', // Leave blank if not changing
      pin: '', // Leave blank if not changing
      role: staf.role
    });
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (staf: Staf) => {
    setSelectedStaf(staf);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
      };

      if (formData.password) payload.password = formData.password;
      if (formData.pin) payload.pin = formData.pin;

      if (selectedStaf) {
        // Edit Mode
        const res = await api.put(`/owner/users/${selectedStaf.id}`, payload);
        if (res.data.success) {
          triggerAlert('success', `Staf "${formData.name}" berhasil diperbarui.`);
          setIsModalOpen(false);
          fetchStaf();
        }
      } else {
        // Create Mode
        if (!formData.password || !formData.pin) {
          triggerAlert('error', 'Kata sandi dan PIN wajib diisi untuk staf baru.');
          setSubmitting(false);
          return;
        }
        const res = await api.post('/owner/users', payload);
        if (res.data.success) {
          triggerAlert('success', `Staf "${formData.name}" berhasil ditambahkan.`);
          setIsModalOpen(false);
          fetchStaf();
        }
      }
    } catch (err: any) {
      console.error(err);
      triggerAlert('error', err.response?.data?.message || 'Gagal menyimpan data staf.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedStaf) return;
    setSubmitting(true);
    try {
      const res = await api.delete(`/owner/users/${selectedStaf.id}`);
      if (res.data.success) {
        triggerAlert('success', `Staf "${selectedStaf.name}" berhasil dinonaktifkan.`);
        setIsDeleteModalOpen(false);
        fetchStaf();
      }
    } catch (err: any) {
      console.error(err);
      triggerAlert('error', err.response?.data?.message || 'Gagal menghapus staf.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStaf = stafList.filter(staf => {
    const matchesSearch = 
      staf.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      staf.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole ? staf.role === filterRole : true;
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role: Staf['role']) => {
    switch(role) {
      case 'manager': return 'bg-rose-500/10 text-rose-600 border-none';
      case 'supervisor': return 'bg-amber-500/10 text-amber-600 border-none';
      case 'kasir': return 'bg-emerald-500/10 text-emerald-600 border-none';
      case 'stocker': return 'bg-blue-500/10 text-blue-600 border-none';
      case 'pramuniaga': return 'bg-indigo-500/10 text-indigo-600 border-none';
      default: return 'bg-slate-500/10 text-slate-600 border-none';
    }
  };

  const itemsPerPage = 10;
  const indexOfLastStaf = currentPage * itemsPerPage;
  const indexOfFirstStaf = indexOfLastStaf - itemsPerPage;
  const currentStaf = filteredStaf.slice(indexOfFirstStaf, indexOfLastStaf);
  const totalPages = Math.ceil(filteredStaf.length / itemsPerPage);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Manajemen Staf Toko</h1>
            <p className="text-sm text-muted-foreground">Kelola akun dan otorisasi peran pegawai untuk toko Anda.</p>
          </div>
        </div>
        <Button onClick={handleOpenAddModal} className="gap-2">
          <Plus className="w-4 h-4" /> Tambah Staf Baru
        </Button>
      </div>

      {alertMsg && (
        <Alert variant={alertMsg.type === 'success' ? 'success' : 'destructive'} className="animate-fade-in">
          {alertMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <AlertDescription className="font-medium">{alertMsg.text}</AlertDescription>
        </Alert>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-5 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Staf</p>
          <p className="text-3xl font-bold">{stafList.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Manager</p>
          <p className="text-3xl font-bold text-rose-500">{stafList.filter(s => s.role === 'manager').length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Supervisor</p>
          <p className="text-3xl font-bold text-amber-500">{stafList.filter(s => s.role === 'supervisor').length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kasir</p>
          <p className="text-3xl font-bold text-emerald-500">{stafList.filter(s => s.role === 'kasir').length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lainnya</p>
          <p className="text-3xl font-bold text-indigo-500">{stafList.filter(s => ['stocker', 'pramuniaga'].includes(s.role)).length}</p>
        </CardContent></Card>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cari staf berdasarkan nama atau email..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="pl-9" 
            />
          </div>
          <select 
            value={filterRole} 
            onChange={(e) => setFilterRole(e.target.value)}
            className="flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Semua Peran</option>
            <option value="manager">Manager</option>
            <option value="supervisor">Supervisor</option>
            <option value="kasir">Kasir</option>
            <option value="stocker">Stocker</option>
            <option value="pramuniaga">Pramuniaga</option>
          </select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-semibold">Mengambil data staf toko...</p>
            </div>
          ) : error ? (
            <div className="p-12 flex flex-col items-center gap-2 text-destructive">
              <AlertTriangle className="w-8 h-8" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          ) : filteredStaf.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground font-semibold">Tidak ada data staf ditemukan.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nama Pegawai</TableHead>
                  <TableHead>Email Akun</TableHead>
                  <TableHead className="text-center">Peran (Role)</TableHead>
                  <TableHead className="text-center">PIN Otorisasi</TableHead>
                  <TableHead className="text-right">Bergabung Pada</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentStaf.map(staf => (
                  <TableRow key={staf.id} className="hover:bg-muted/10">
                    <TableCell className="font-semibold">{staf.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" />
                        {staf.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={getRoleColor(staf.role)}>
                        {staf.role.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono text-muted-foreground">
                      <div className="flex items-center justify-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-primary" />
                        Active
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      <div className="flex items-center justify-end gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(staf.created_at).toLocaleDateString('id-ID')}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button 
                          onClick={() => handleOpenEditModal(staf)} 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          onClick={() => handleOpenDeleteModal(staf)} 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {filteredStaf.length > itemsPerPage && (
            <div className="flex items-center justify-between p-4 border-t border-border/60">
              <span className="text-xs text-muted-foreground font-semibold">
                Menampilkan {indexOfFirstStaf + 1}-{Math.min(indexOfLastStaf, filteredStaf.length)} dari {filteredStaf.length} staf
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="font-bold text-xs"
                >
                  Sebelumnya
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="font-bold text-xs"
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedStaf ? <Edit2 className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
              {selectedStaf ? 'Ubah Data Staf' : 'Pendaftaran Staf Baru'}
            </DialogTitle>
            <DialogDescription>
              {selectedStaf 
                ? 'Perbarui detail data, kata sandi, atau PIN untuk akun staf yang dipilih.' 
                : 'Daftarkan pegawai baru dan berikan peran operasional toko.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Nama Pegawai *</Label>
              <Input 
                type="text" 
                name="name" 
                required 
                placeholder="Nama Lengkap" 
                value={formData.name} 
                onChange={handleInputChange} 
              />
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Email Akun *</Label>
              <Input 
                type="email" 
                name="email" 
                required 
                placeholder="staf@toko.com" 
                value={formData.email} 
                onChange={handleInputChange} 
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Kata Sandi {selectedStaf && '(Opsional)'}</Label>
              <Input 
                type="password" 
                name="password" 
                required={!selectedStaf}
                placeholder={selectedStaf ? 'Isi jika ingin mengganti kata sandi' : 'Minimal 8 karakter'} 
                value={formData.password} 
                onChange={handleInputChange} 
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">PIN Otorisasi Shift {selectedStaf && '(Opsional)'}</Label>
              <Input 
                type="text" 
                name="pin" 
                required={!selectedStaf}
                maxLength={6}
                placeholder={selectedStaf ? 'Isi jika ingin mengganti PIN' : '6 digit angka'} 
                value={formData.pin} 
                onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '') }))} 
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Peran (Role) Staf *</Label>
              <select 
                name="role"
                value={formData.role} 
                onChange={handleInputChange}
                className="flex w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="kasir">KASIR</option>
                <option value="manager">MANAGER</option>
                <option value="supervisor">SUPERVISOR</option>
                <option value="stocker">STOCKER</option>
                <option value="pramuniaga">PRAMUNIAGA</option>
              </select>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
              <Button type="submit" disabled={submitting} className="gap-1.5">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Simpan Staf</span>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Hapus Staf Toko
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus akun staf <strong>{selectedStaf?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Batal</Button>
            <Button 
              onClick={handleDeleteSubmit} 
              disabled={submitting} 
              variant="destructive"
              className="gap-1.5"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Ya, Hapus Staf</span>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
