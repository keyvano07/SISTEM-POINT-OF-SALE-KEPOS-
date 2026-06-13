'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';
import { Lock, Mail, Loader2, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, token } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, redirect
  useEffect(() => {
    if (token) {
      router.push('/dashboard');
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email dan kata sandi harus diisi.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: jwtToken, user } = response.data.data;
      
      // Set session cookie for Next.js Middleware
      document.cookie = `pos_token=${jwtToken}; path=/; max-age=86400; SameSite=Strict`;
      
      setAuth(user, jwtToken);
      
      // Redirect based on role
      if (['super_admin', 'owner', 'manager', 'supervisor'].includes(user.role)) {
        router.push('/dashboard');
      } else if (user.role === 'pramuniaga') {
        router.push('/pramuniaga');
      } else if (user.role === 'kasir') {
        router.push('/pos');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error(err);
      const errorObj = err as { response?: { data?: { message?: string } } };
      if (errorObj.response?.data?.message) {
        setError(errorObj.response.data.message);
      } else {
        setError('Koneksi ke server gagal. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/30 to-background font-sans relative overflow-hidden">
      
      {/* Ambient Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute top-[60%] -right-[10%] w-[500px] h-[500px] rounded-full bg-accent blur-[120px] opacity-50" />
      </div>

      <div className="w-full max-w-[440px] z-10 px-4">
        
        {/* Brand Header */}
        <div className="text-center mb-8 space-y-3">
          <div className="mx-auto w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/25">
            <Store className="w-7 h-7" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              KEPOS
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              Sistem Point of Sale
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-border/60 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Selamat Datang</CardTitle>
            <CardDescription>Masuk menggunakan kredensial Anda.</CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {error && (
                <Alert variant="destructive" className="animate-fade-in">
                  <AlertDescription className="font-medium text-sm">{error}</AlertDescription>
                </Alert>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email Pegawai
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="login-email"
                    type="email"
                    required
                    placeholder="name@store.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="pl-10 h-11 bg-muted/50"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Kata Sandi
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="pl-10 h-11 bg-muted/50"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-base font-semibold"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span>Mengautentikasi...</span>
                  </>
                ) : (
                  <span>Masuk Sistem</span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-muted-foreground font-medium">
          &copy; 2026 KEPOS Point of Sale. All rights reserved.
        </div>
      </div>
    </div>
  );
}
