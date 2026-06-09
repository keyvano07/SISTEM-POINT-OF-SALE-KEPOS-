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
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-background text-on-background">
      {/* Header Section */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-8 shadow-sm">
        <h2 className="text-[32px] font-bold mb-2 text-on-surface tracking-tight">
          Selamat Datang, {user.name}!
        </h2>
        <p className="text-[16px] text-on-surface-variant font-medium">
          Anda masuk sebagai <span className="text-primary font-semibold capitalize">{user.role.replace('_', ' ')}</span>. Selamat bekerja!
        </p>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="p-6 bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm flex items-center gap-4">
            <div className="p-3 bg-primary-container text-on-primary-container rounded-xl">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[12px] text-on-surface-variant font-semibold uppercase tracking-wider">ID Cabang / Store ID</p>
              <p className="text-[20px] font-bold text-on-surface mt-0.5">{user.store_id || 'Pusat'}</p>
            </div>
          </div>

          <div className="p-6 bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm flex items-center gap-4">
            <div className="p-3 bg-primary-container text-on-primary-container rounded-xl">
              <Mail className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-on-surface-variant font-semibold uppercase tracking-wider">Email Pegawai</p>
              <p className="text-[16px] font-semibold text-on-surface mt-0.5 truncate">{user.email}</p>
            </div>
          </div>

          <div className="p-6 bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm flex items-center gap-4">
            <div className="p-3 bg-[#e0f2fe] text-[#0369a1] rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[12px] text-on-surface-variant font-semibold uppercase tracking-wider">Status Otorisasi</p>
              <p className="text-[16px] font-bold text-on-surface mt-0.5">Aktif & Terkoneksi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Menu Cards */}
      <div>
        <h3 className="text-[20px] font-bold text-on-surface mb-6 flex items-center gap-2">
          <span>Akses Cepat Modul</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Manager / Admin: Inventori */}
          {['super_admin', 'manager'].includes(user.role) && (
            <button
              onClick={() => router.push('/dashboard/manager/products')}
              className="p-6 bg-surface-container-lowest hover:bg-surface-container border border-outline-variant rounded-3xl text-left transition-colors group flex flex-col justify-between h-48 shadow-sm"
            >
              <div className="p-3 bg-secondary-container text-on-secondary-container rounded-xl w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-on-surface text-[18px] mb-1">Manajemen Inventori</h4>
                <p className="text-[14px] text-on-surface-variant font-medium">Atur produk, kategori, harga jual, dan status stok kritis toko.</p>
              </div>
            </button>
          )}

          {/* Stocker / Manager / Admin: Gudang */}
          {['super_admin', 'manager', 'supervisor', 'stocker'].includes(user.role) && (
            <button
              onClick={() => router.push('/dashboard/stocker')}
              className="p-6 bg-surface-container-lowest hover:bg-surface-container border border-outline-variant rounded-3xl text-left transition-colors group flex flex-col justify-between h-48 shadow-sm"
            >
              <div className="p-3 bg-secondary-container text-on-secondary-container rounded-xl w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Clipboard className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-on-surface text-[18px] mb-1">Gudang & Logistik</h4>
                <p className="text-[14px] text-on-surface-variant font-medium">Pencatatan penyesuaian stok, restock barang masuk, dan monitoring log.</p>
              </div>
            </button>
          )}

          {/* Kasir / Manager / Admin: POS */}
          {['super_admin', 'manager', 'supervisor', 'kasir'].includes(user.role) && (
            <button
              onClick={() => router.push('/pos')}
              className="p-6 bg-primary hover:bg-[#003ea8] border border-transparent rounded-3xl text-left transition-colors group flex flex-col justify-between h-48 shadow-[0px_8px_24px_rgba(0,74,198,0.25)] relative overflow-hidden"
            >
              <div className="absolute -top-[10%] -right-[10%] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <div className="p-3 bg-white/20 text-on-primary rounded-xl w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform z-10">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div className="relative z-10">
                <h4 className="font-bold text-on-primary text-[18px] mb-1">Point of Sale (Kasir)</h4>
                <p className="text-[14px] text-primary-fixed-dim font-medium">Buka antarmuka kasir utama untuk melakukan checkout transaksi pelanggan.</p>
              </div>
            </button>
          )}

          {/* Pramuniaga / Admin: Draft Order */}
          {['super_admin', 'manager', 'supervisor', 'pramuniaga'].includes(user.role) && (
            <button
              onClick={() => router.push('/pramuniaga')}
              className="p-6 bg-surface-container-lowest hover:bg-surface-container border border-outline-variant rounded-3xl text-left transition-colors group flex flex-col justify-between h-48 shadow-sm"
            >
              <div className="p-3 bg-secondary-container text-on-secondary-container rounded-xl w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-on-surface text-[18px] mb-1">Pramuniaga (Draft)</h4>
                <p className="text-[14px] text-on-surface-variant font-medium">Buat keranjang belanja sementara untuk pelanggan sebelum diproses kasir.</p>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
