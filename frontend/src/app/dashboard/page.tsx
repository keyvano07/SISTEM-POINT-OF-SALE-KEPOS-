'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Package, Clipboard, ShoppingCart, UserCheck, ShieldCheck, Mail, Store } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-[#020617] text-white">
      {/* Header Section */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-8 shadow-xl">
        <h2 className="text-3xl font-extrabold mb-2 bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          Selamat Datang, {user.name}!
        </h2>
        <p className="text-slate-400">
          Anda masuk sebagai <span className="text-violet-400 capitalize font-semibold">{user.role.replace('_', ' ')}</span>. Selamat bekerja!
        </p>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 hover:border-slate-700/50 transition-all flex items-center gap-4">
            <div className="p-3 bg-violet-600/10 text-violet-400 rounded-xl">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">ID Cabang / Store ID</p>
              <p className="text-xl font-extrabold text-slate-200 mt-0.5">{user.store_id || 'Pusat'}</p>
            </div>
          </div>

          <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 hover:border-slate-700/50 transition-all flex items-center gap-4">
            <div className="p-3 bg-violet-600/10 text-violet-400 rounded-xl">
              <Mail className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Email Pegawai</p>
              <p className="text-base font-semibold text-slate-200 mt-0.5 truncate">{user.email}</p>
            </div>
          </div>

          <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 hover:border-slate-700/50 transition-all flex items-center gap-4">
            <div className="p-3 bg-emerald-600/10 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Status Otorisasi</p>
              <p className="text-base font-bold text-emerald-400 mt-0.5">Aktif & Terkoneksi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Menu Cards */}
      <div>
        <h3 className="text-xl font-extrabold text-slate-100 mb-6 flex items-center gap-2">
          <span>Akses Cepat Modul</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Manager / Admin: Inventori */}
          {['super_admin', 'manager'].includes(user.role) && (
            <button
              onClick={() => router.push('/dashboard/manager/products')}
              className="p-6 bg-[#0F172A] hover:bg-[#131C33] border border-slate-800 hover:border-violet-500/30 rounded-2xl text-left transition-all group flex flex-col justify-between h-48"
            >
              <div className="p-3 bg-violet-600/15 text-violet-400 rounded-xl w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-white text-lg mb-1">Manajemen Inventori</h4>
                <p className="text-xs text-slate-400">Atur produk, kategori, harga jual, dan status stok kritis toko.</p>
              </div>
            </button>
          )}

          {/* Stocker / Manager / Admin: Gudang */}
          {['super_admin', 'manager', 'supervisor', 'stocker'].includes(user.role) && (
            <button
              onClick={() => router.push('/dashboard/stocker')}
              className="p-6 bg-[#0F172A] hover:bg-[#131C33] border border-slate-800 hover:border-violet-500/30 rounded-2xl text-left transition-all group flex flex-col justify-between h-48"
            >
              <div className="p-3 bg-violet-600/15 text-violet-400 rounded-xl w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Clipboard className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-white text-lg mb-1">Gudang & Logistik</h4>
                <p className="text-xs text-slate-400">Pencatatan penyesuaian stok, restock barang masuk, dan monitoring log.</p>
              </div>
            </button>
          )}

          {/* Kasir / Manager / Admin: POS */}
          {['super_admin', 'manager', 'supervisor', 'kasir'].includes(user.role) && (
            <button
              onClick={() => router.push('/pos')}
              className="p-6 bg-[#0F172A] hover:bg-[#131C33] border border-slate-800 hover:border-violet-500/30 rounded-2xl text-left transition-all group flex flex-col justify-between h-48"
            >
              <div className="p-3 bg-violet-600/15 text-violet-400 rounded-xl w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-white text-lg mb-1">Point of Sale (Kasir)</h4>
                <p className="text-xs text-slate-400">Buka antarmuka kasir utama untuk melakukan checkout transaksi pelanggan.</p>
              </div>
            </button>
          )}

          {/* Pramuniaga / Admin: Draft Order */}
          {['super_admin', 'manager', 'supervisor', 'pramuniaga'].includes(user.role) && (
            <button
              onClick={() => router.push('/pramuniaga')}
              className="p-6 bg-[#0F172A] hover:bg-[#131C33] border border-slate-800 hover:border-violet-500/30 rounded-2xl text-left transition-all group flex flex-col justify-between h-48"
            >
              <div className="p-3 bg-violet-600/15 text-violet-400 rounded-xl w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-white text-lg mb-1">Pramuniaga (Draft Order)</h4>
                <p className="text-xs text-slate-400">Buat keranjang belanja sementara untuk pelanggan sebelum diproses kasir.</p>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
