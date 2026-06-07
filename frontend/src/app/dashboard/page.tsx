'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';
import { LogOut, LayoutDashboard, Shield, Package, Clipboard } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, clearAuth, token } = useAuthStore();

  useEffect(() => {
    if (!token || !user) {
      document.cookie = 'pos_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      clearAuth();
      router.push('/login');
    }
  }, [token, user, router, clearAuth]);

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

  if (!user || !token) return null;

  return (
    <div className="min-h-screen bg-[#0B0F17] text-white font-sans">
      {/* Top Navbar */}
      <nav className="border-b border-white/10 px-8 py-4 flex justify-between items-center bg-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-600 rounded-lg">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg">POS Dashboard</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-white/10 rounded-full">
              <Shield className="w-4 h-4 text-violet-400" />
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

      {/* Main Dashboard Layout */}
      <main className="max-w-7xl mx-auto p-8">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold mb-4">Selamat Datang, {user.name}!</h2>
          <p className="text-gray-400 mb-6">
            Anda login sebagai <span className="text-violet-400 capitalize font-medium">{user.role}</span>. Selamat bekerja!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
              <h3 className="font-bold text-gray-300 text-sm uppercase tracking-wide">ID Cabang</h3>
              <p className="text-3xl font-extrabold mt-2 text-violet-400">{user.store_id || '-'}</p>
            </div>
            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
              <h3 className="font-bold text-gray-300 text-sm uppercase tracking-wide">Email Pegawai</h3>
              <p className="text-lg font-semibold mt-2 truncate text-violet-400">{user.email}</p>
            </div>
            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
              <h3 className="font-bold text-gray-300 text-sm uppercase tracking-wide">Status Otorisasi</h3>
              <p className="text-lg font-semibold mt-2 text-emerald-400">Aktif & Terhubung</p>
            </div>
          </div>

          {/* Quick Actions for manager/super_admin */}
          {['super_admin', 'manager'].includes(user.role) && (
            <div className="mt-8 pt-8 border-t border-white/10">
              <h3 className="text-lg font-bold mb-4">Manajemen Toko</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                  onClick={() => router.push('/dashboard/manager/products')}
                  className="p-6 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 rounded-2xl text-left transition-all group"
                >
                  <Package className="w-8 h-8 text-violet-400 mb-4 group-hover:scale-105 transition-transform" />
                  <h4 className="font-bold text-white mb-1 font-sans">Manajemen Inventori</h4>
                  <p className="text-xs text-gray-400 font-sans">Atur produk, kategori, harga jual, dan lihat status stok kritis.</p>
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions for stocker / supervisor / manager / super_admin */}
          {['super_admin', 'manager', 'supervisor', 'stocker'].includes(user.role) && (
            <div className="mt-8 pt-8 border-t border-white/10">
              <h3 className="text-lg font-bold mb-4">Operasional Gudang</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                  onClick={() => router.push('/dashboard/stocker')}
                  className="p-6 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 rounded-2xl text-left transition-all group"
                >
                  <Clipboard className="w-8 h-8 text-indigo-400 mb-4 group-hover:scale-105 transition-transform" />
                  <h4 className="font-bold text-white mb-1 font-sans">Gudang & Logistik</h4>
                  <p className="text-xs text-gray-400 font-sans">Catat penyesuaian stok, restock barang masuk, dan pantau log pergerakan barang.</p>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
