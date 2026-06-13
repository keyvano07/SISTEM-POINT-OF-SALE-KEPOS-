'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import { Lock, Mail, Loader2, Store, User, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function RegisterTenantPage() {
  const router = useRouter();
  
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName || !ownerName || !email || !password || !pin) {
      setError('Seluruh field pendaftaran wajib diisi.');
      return;
    }

    if (pin.length !== 6 || isNaN(Number(pin))) {
      setError('PIN Otorisasi harus berupa 6 digit angka.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post('/owner/register-tenant', {
        store_name: storeName,
        owner_name: ownerName,
        email,
        password,
        pin,
      });

      setSuccess('Pendaftaran toko dan akun owner berhasil! Mengalihkan ke login...');
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (err) {
      console.error(err);
      const errorObj = err as { response?: { data?: { message?: string } } };
      if (errorObj.response?.data?.message) {
        setError(errorObj.response.data.message);
      } else {
        setError('Pendaftaran gagal. Pastikan email belum digunakan.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/30 to-background font-sans relative overflow-hidden p-4">
      
      {/* Ambient Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute top-[60%] -right-[10%] w-[500px] h-[500px] rounded-full bg-accent blur-[120px] opacity-50" />
      </div>

      <div className="w-full max-w-[480px] z-10 px-4 py-8">
        
        {/* Brand Header */}
        <div className="text-center mb-6 space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/25">
            <Store className="w-6 h-6" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Registrasi Toko KEPOS
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Buat akun tenant & registrasikan lisensi baru toko Anda
            </p>
          </div>
        </div>

        {/* Register Card */}
        <Card className="shadow-xl border-border/60 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">Daftar Tenant Baru</CardTitle>
            <CardDescription>Lengkapi data toko dan akun administrator utama.</CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {error && (
                <Alert variant="destructive" className="animate-fade-in py-2.5">
                  <AlertDescription className="font-medium text-xs">{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="animate-fade-in py-2.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  <AlertDescription className="font-medium text-xs">{success}</AlertDescription>
                </Alert>
              )}

              {/* Store Name */}
              <div className="space-y-1">
                <Label htmlFor="reg-store" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Nama Toko (Store Name)
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Store className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <Input
                    id="reg-store"
                    type="text"
                    required
                    placeholder="Contoh: Toko Berkah Jaya"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    disabled={loading}
                    className="pl-9 h-10 bg-muted/50 text-xs"
                  />
                </div>
              </div>

              {/* Owner Name */}
              <div className="space-y-1">
                <Label htmlFor="reg-owner" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Nama Lengkap Pemilik (Owner Name)
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <Input
                    id="reg-owner"
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    disabled={loading}
                    className="pl-9 h-10 bg-muted/50 text-xs"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <Label htmlFor="reg-email" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Email Owner
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <Input
                    id="reg-email"
                    type="email"
                    required
                    placeholder="budi@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="pl-9 h-10 bg-muted/50 text-xs"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <Label htmlFor="reg-password" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Kata Sandi
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <Input
                    id="reg-password"
                    type="password"
                    required
                    placeholder="Minimal 8 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="pl-9 h-10 bg-muted/50 text-xs"
                  />
                </div>
              </div>

              {/* PIN */}
              <div className="space-y-1">
                <Label htmlFor="reg-pin" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  PIN Otorisasi (6 Digit Angka)
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <Input
                    id="reg-pin"
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    disabled={loading}
                    className="pl-9 h-10 bg-muted/50 text-xs font-mono tracking-widest"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 text-xs font-semibold mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>Mendaftarkan Lisensi...</span>
                  </>
                ) : (
                  <span>Daftarkan & Mulai Usaha</span>
                )}
              </Button>
            </form>

            <div className="text-center mt-4">
              <span className="text-xs text-muted-foreground">Sudah memiliki lisensi? </span>
              <button 
                onClick={() => router.push('/login')}
                className="text-xs text-primary font-bold hover:underline"
              >
                Masuk
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-4 text-[10px] text-muted-foreground font-medium">
          &copy; 2026 KEPOS Point of Sale. All rights reserved.
        </div>
      </div>
    </div>
  );
}
