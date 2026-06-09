'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';
import { Lock, Mail, Loader2, AlertCircle, Store } from 'lucide-react';

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
      if (['super_admin', 'manager', 'supervisor'].includes(user.role)) {
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
    <div className="min-h-screen flex items-center justify-center bg-[#faf8ff] font-sans text-[#131b2e]">
      
      {/* Background Decor (Subtle Ambient) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] rounded-full bg-[#e2e7ff] blur-[100px] opacity-60" />
        <div className="absolute top-[60%] -right-[10%] w-[500px] h-[500px] rounded-full bg-[#d5e3fc] blur-[120px] opacity-50" />
      </div>

      <div className="w-full max-w-[440px] z-10 px-4">
        
        {/* Luminous Brand Header */}
        <div className="text-center mb-10 space-y-4">
          <div className="mx-auto w-16 h-16 bg-[#2563eb] rounded-2xl flex items-center justify-center text-[#ffffff] shadow-[0px_8px_24px_rgba(37,99,235,0.25)]">
            <Store className="w-8 h-8" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-[32px] font-bold tracking-tight text-[#131b2e] leading-tight">
              Luminous POS
            </h1>
            <p className="text-[16px] text-[#434655] mt-1 font-medium">
              Sistem Operasional Ritel
            </p>
          </div>
        </div>

        {/* Level 3 Elevated Card */}
        <div className="bg-[#ffffff] rounded-[24px] p-8 md:p-10 shadow-[0px_20px_50px_rgba(15,23,42,0.08)] border border-[#e2e7ff]">
          
          <div className="mb-8">
            <h2 className="text-[20px] font-semibold text-[#131b2e]">Selamat Datang</h2>
            <p className="text-[14px] text-[#737686] mt-1">Masuk menggunakan kredensial Anda.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-[12px] bg-[#ffdad6] text-[#93000a] text-sm animate-fadeIn">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-[#434655] uppercase tracking-wider block">
                Email Pegawai
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-[#737686]" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="name@store.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="block w-full pl-11 pr-4 py-3.5 bg-[#f2f3ff] border border-transparent rounded-[12px] text-[#131b2e] placeholder-[#737686] focus:outline-none focus:bg-[#ffffff] focus:ring-2 focus:ring-[#004ac6] focus:border-[#004ac6] transition-all disabled:opacity-50 text-[14px] shadow-sm"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[12px] font-semibold text-[#434655] uppercase tracking-wider block">
                  Kata Sandi
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-[#737686]" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="block w-full pl-11 pr-4 py-3.5 bg-[#f2f3ff] border border-transparent rounded-[12px] text-[#131b2e] placeholder-[#737686] focus:outline-none focus:bg-[#ffffff] focus:ring-2 focus:ring-[#004ac6] focus:border-[#004ac6] transition-all disabled:opacity-50 text-[14px] shadow-sm"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full py-3.5 px-6 rounded-[12px] text-[#ffffff] font-semibold bg-[#004ac6] hover:bg-[#003ea8] active:scale-[0.98] transition-all shadow-[0px_4px_12px_rgba(0,74,198,0.2)] flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none text-[16px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Mengautentikasi...</span>
                </>
              ) : (
                <span>Masuk Sistem</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer Credit */}
        <div className="text-center mt-8 text-[12px] text-[#737686] font-medium">
          &copy; 2026 Luminous POS System. All rights reserved.
        </div>
      </div>
    </div>
  );
}
