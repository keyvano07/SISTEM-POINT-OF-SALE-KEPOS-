'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Package, Clipboard, ShoppingCart, UserCheck, ShieldCheck, Mail, Store } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
 const router = useRouter();
 const { user } = useAuthStore();

 if (!user) return null;

  const modules = [
    {
      title: 'Manajemen Inventori',
      description: 'Atur produk, kategori, harga jual, dan status stok kritis toko.',
      icon: Package,
      path: '/dashboard/manager/products',
      roles: ['super_admin', 'manager'],
      featured: false,
    },
    {
      title: 'Gudang & Logistik',
      description: 'Pencatatan penyesuaian stok, restock barang masuk, dan monitoring log.',
      icon: Clipboard,
      path: '/dashboard/stocker',
      roles: ['super_admin', 'manager', 'supervisor', 'stocker'],
      featured: false,
    },
    {
      title: 'Point of Sale (Kasir)',
      description: 'Buka antarmuka kasir utama untuk melakukan checkout transaksi pelanggan.',
      icon: ShoppingCart,
      path: '/pos',
      roles: ['super_admin', 'manager', 'supervisor', 'kasir'],
      featured: true,
    },
    {
      title: 'Pramuniaga (Draft)',
      description: 'Buat keranjang belanja sementara untuk pelanggan sebelum diproses kasir.',
      icon: UserCheck,
      path: '/pramuniaga',
      roles: ['super_admin', 'manager', 'supervisor', 'pramuniaga'],
      featured: false,
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome Header */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-6 lg:p-8">
          <h2 className="text-2xl lg:text-3xl font-bold mb-1 tracking-tight">
            Selamat Datang, {user.name}!
          </h2>
          <p className="text-muted-foreground">
            Anda masuk sebagai{' '}
            <Badge variant="secondary" className="text-xs font-semibold capitalize ml-1">
              {user.role.replace('_', ' ')}
            </Badge>
          </p>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="p-4 bg-muted/50 rounded-lg flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Store ID</p>
                <p className="text-lg font-bold mt-0.5">{user.store_id || 'Pusat'}</p>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
                <Mail className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Email</p>
                <p className="text-sm font-semibold mt-0.5 truncate">{user.email}</p>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-lg">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Status</p>
                <p className="text-sm font-bold mt-0.5 text-emerald-600">Aktif & Terkoneksi</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Access Modules */}
      <div>
        <h3 className="text-lg font-bold mb-4">Akses Cepat Modul</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules
            .filter(mod => mod.roles.includes(user.role))
            .map((mod) => {
              const Icon = mod.icon;
              
              if (mod.featured) {
                return (
                  <button
                    key={mod.path}
                    onClick={() => router.push(mod.path)}
                    className="p-6 bg-primary hover:bg-primary/90 rounded-xl text-left transition-all group flex flex-col justify-between h-48 shadow-lg shadow-primary/20 relative overflow-hidden active:scale-[0.98]"
                  >
                    <div className="absolute -top-[10%] -right-[10%] w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    <div className="p-2.5 bg-white/20 text-primary-foreground rounded-lg w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform z-10">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="relative z-10">
                      <h4 className="font-bold text-primary-foreground text-lg mb-1">{mod.title}</h4>
                      <p className="text-sm text-primary-foreground/70 font-medium">{mod.description}</p>
                    </div>
                  </button>
                );
              }
              
              return (
                <Card
                  key={mod.path}
                  className="hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group h-48 flex flex-col"
                  onClick={() => router.push(mod.path)}
                >
                  <CardContent className="p-6 flex flex-col justify-between h-full">
                    <div className="p-2.5 bg-muted text-muted-foreground rounded-lg w-10 h-10 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base mb-1">{mod.title}</h4>
                      <p className="text-sm text-muted-foreground">{mod.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </div>
    </div>
  );
}
