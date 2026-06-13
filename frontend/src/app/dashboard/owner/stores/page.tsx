'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';
import { 
  Landmark, Plus, Phone, MapPin, Percent, CheckCircle2, 
  Loader2, AlertTriangle, RefreshCw, ArrowRightLeft, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface Store {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  tax_rate: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
}

export default function OwnerStoresPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    tax_rate: '11.00',
    timezone: 'Asia/Jakarta'
  });

  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (token) {
      if (user && user.role !== 'owner' && user.role !== 'super_admin') {
        router.push('/dashboard');
        return;
      }
      fetchStores();
    }
  }, [token, user, router]);

  const fetchStores = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/owner/stores');
      if (res.data.success) {
        setStores(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
      setError('Gagal memuat daftar toko/tenant.');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/owner/stores', {
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        tax_rate: parseFloat(formData.tax_rate),
        timezone: formData.timezone
      });
      if (res.data.success) {
        triggerAlert('success', `Toko "${formData.name}" berhasil didaftarkan.`);
        setIsModalOpen(false);
        setFormData({
          name: '',
          address: '',
          phone: '',
          tax_rate: '11.00',
          timezone: 'Asia/Jakarta'
        });
        fetchStores();
      }
    } catch (err: any) {
      console.error(err);
      triggerAlert('error', err.response?.data?.message || 'Gagal mendaftarkan toko baru.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitchStore = async (storeId: number) => {
    setSwitchingId(storeId);
    try {
      const res = await api.post('/owner/stores/switch', { store_id: storeId });
      if (res.data.success) {
        // Update Zustand auth store user object state directly
        useAuthStore.setState({ user: res.data.data.user });
        
        triggerAlert('success', `Berhasil beralih toko ke: ${res.data.message}`);
        
        // Refresh page to reset all data contexts
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    } catch (err: any) {
      console.error(err);
      triggerAlert('error', err.response?.data?.message || 'Gagal berpindah toko.');
    } finally {
      setSwitchingId(null);
    }
  };

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Manajemen Multi-Toko & Tenant</h1>
            <p className="text-sm text-muted-foreground">Kelola toko/cabang dan beralih secara langsung ke panel data toko yang dipilih.</p>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 rounded-xl h-11 font-semibold">
          <Plus className="w-4 h-4" /> Daftarkan Toko Baru
        </Button>
      </div>

      {alertMsg && (
        <Alert variant={alertMsg.type === 'success' ? 'success' : 'destructive'} className="animate-fade-in rounded-xl">
          {alertMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <AlertDescription className="font-medium">{alertMsg.text}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm border-border/60">
          <CardContent className="p-5 flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Toko</p>
              <p className="text-3xl font-black">{stores.length}</p>
            </div>
            <div className="p-3 bg-muted rounded-xl text-muted-foreground"><Landmark className="w-6 h-6" /></div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/60">
          <CardContent className="p-5 flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Toko Aktif Saat Ini</p>
              <p className="text-lg font-bold truncate max-w-[200px] text-primary">
                {stores.find(s => s.id === user.store_id)?.name || 'Memuat...'}
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl text-primary"><CheckCircle2 className="w-6 h-6" /></div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/60">
          <CardContent className="p-5 flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identifikasi Pengguna</p>
              <p className="text-sm font-semibold capitalize text-foreground">{user.name} ({user.role})</p>
            </div>
            <div className="p-3 bg-muted rounded-xl text-muted-foreground"><ArrowRightLeft className="w-6 h-6" /></div>
          </CardContent>
        </Card>
      </div>

      {/* List of Stores */}
      {loading ? (
        <div className="p-12 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-semibold">Mengambil daftar toko...</p>
        </div>
      ) : error ? (
        <div className="p-12 flex flex-col items-center gap-2 text-destructive border border-dashed rounded-2xl">
          <AlertTriangle className="w-8 h-8" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map(store => {
            const isActive = store.id === user.store_id;
            const isSwitching = switchingId === store.id;

            return (
              <Card 
                key={store.id} 
                className={cn(
                  "border-border/60 flex flex-col justify-between transition-all relative overflow-hidden",
                  isActive ? "ring-2 ring-primary bg-primary/[0.01] shadow-sm" : "hover:border-primary/40 hover:shadow"
                )}
              >
                {isActive && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                    Aktif
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle className="text-base font-bold truncate pr-10">{store.name}</CardTitle>
                  <CardDescription className="text-xs">Store ID: #{store.id}</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-3 flex-1 text-xs font-semibold">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span className="leading-relaxed">{store.address || 'Alamat tidak ditentukan'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{store.phone || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Percent className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Tarif Pajak (PPN): {parseFloat(store.tax_rate)}%</span>
                  </div>
                </CardContent>

                <CardFooter className="pt-4 border-t border-border/50 bg-muted/[0.1]">
                  {isActive ? (
                    <Button variant="outline" className="w-full gap-2 rounded-xl text-xs" disabled>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Toko Sedang Dibuka
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleSwitchStore(store.id)} 
                      disabled={switchingId !== null}
                      className="w-full gap-2 rounded-xl text-xs font-bold"
                    >
                      {isSwitching ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Memproses...
                        </>
                      ) : (
                        <>
                          <ArrowRightLeft className="w-4 h-4" /> Beralih ke Toko ini
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Store Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Daftarkan Toko / Tenant Baru</DialogTitle>
            <DialogDescription className="text-xs">
              Buat store baru dalam arsitektur multi-tenant. Toko ini akan memiliki data produk, transaksi, dan stafnya sendiri.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-3">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs font-bold uppercase text-muted-foreground">Nama Toko</Label>
              <Input 
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Contoh: Toko Cabang Bandung"
                className="rounded-xl border-border/70"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="address" className="text-xs font-bold uppercase text-muted-foreground">Alamat Toko</Label>
              <Input 
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Jl. Merdeka No. 45, Bandung"
                className="rounded-xl border-border/70"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone" className="text-xs font-bold uppercase text-muted-foreground">Nomor Telepon</Label>
              <Input 
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="0221234567"
                className="rounded-xl border-border/70"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="tax_rate" className="text-xs font-bold uppercase text-muted-foreground">PPN (%)</Label>
                <Input 
                  id="tax_rate"
                  name="tax_rate"
                  type="number"
                  step="0.01"
                  required
                  value={formData.tax_rate}
                  onChange={handleInputChange}
                  placeholder="11.00"
                  className="rounded-xl border-border/70"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="timezone" className="text-xs font-bold uppercase text-muted-foreground">Zona Waktu</Label>
                <Input 
                  id="timezone"
                  name="timezone"
                  required
                  value={formData.timezone}
                  onChange={handleInputChange}
                  placeholder="Asia/Jakarta"
                  className="rounded-xl border-border/70"
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="rounded-xl text-xs font-bold gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Daftarkan Toko
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
