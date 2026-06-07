'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';
import { LogOut, ClipboardList, Shield } from 'lucide-react';

export default function PramuniagaPage() {
  const router = useRouter();
  const { user, clearAuth, token } = useAuthStore();

  useEffect(() => {
    if (!token) {
      router.push('/login');
    }
  }, [token, router]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout request failed', e);
    } finally {
      document.cookie = 'pos_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      clearAuth();
      router.push('/login');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0B0F17] text-white font-sans">
      {/* Top Navbar */}
      <nav className="border-b border-white/10 px-8 py-4 flex justify-between items-center bg-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <ClipboardList className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg">POS Tablet Pramuniaga</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-white/10 rounded-full">
              <Shield className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-8">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold mb-4">Workspace Pramuniaga: {user.name}</h2>
          <p className="text-gray-400 mb-6">Tablet input pesanan pelanggan.</p>
          <div className="border border-dashed border-white/20 rounded-2xl p-12 text-center text-gray-500">
            Akan diimplementasikan penuh pada Fase 3.
          </div>
        </div>
      </main>
    </div>
  );
}
