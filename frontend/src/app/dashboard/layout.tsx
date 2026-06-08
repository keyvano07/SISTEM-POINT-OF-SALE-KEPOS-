'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';
import { 
  LayoutDashboard, Package, Clipboard, LogOut, ChevronLeft, ChevronRight, ShoppingCart, UserCheck
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, clearAuth } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    if (!token || !user) {
      document.cookie = 'pos_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      clearAuth();
      router.push('/login');
    }
  }, [token, user, router, clearAuth, isHydrated]);

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

  if (!isHydrated || !user || !token) return null;

  // Navigation items based on role
  const menuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['super_admin', 'manager', 'supervisor', 'kasir', 'pramuniaga', 'stocker']
    },
    {
      name: 'Manajemen Inventori',
      path: '/dashboard/manager/products',
      icon: Package,
      roles: ['super_admin', 'manager']
    },
    {
      name: 'Gudang & Logistik',
      path: '/dashboard/stocker',
      icon: Clipboard,
      roles: ['super_admin', 'manager', 'supervisor', 'stocker']
    },
    {
      name: 'Point of Sale (Kasir)',
      path: '/pos',
      icon: ShoppingCart,
      roles: ['super_admin', 'manager', 'supervisor', 'kasir']
    },
    {
      name: 'Draft Order',
      path: '/pramuniaga',
      icon: UserCheck,
      roles: ['super_admin', 'manager', 'supervisor', 'pramuniaga']
    }
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden font-sans">
      {/* Sidebar */}
      <aside 
        className={`bg-[#0F172A] border-r border-slate-800 flex flex-col justify-between transition-all duration-200 ease-in-out z-30 flex-shrink-0 ${
          isCollapsed ? 'w-20' : 'w-[260px]'
        }`}
      >
        {/* Top Header */}
        <div>
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-[#0F172A]">
            <div className={`flex items-center gap-3 transition-opacity duration-200 ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
              <div className="p-1.5 bg-violet-600 rounded-lg">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">KEPOS</span>
            </div>
            
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all ml-auto"
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {filteredMenu.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center h-12 rounded-xl transition-all relative group ${
                    isActive 
                      ? 'bg-violet-600/10 text-white font-semibold' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  } ${isCollapsed ? 'justify-center px-0' : 'px-4 gap-3'}`}
                >
                  {/* Left Active border indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-violet-600 rounded-r-full" />
                  )}
                  
                  <Icon className={`w-5 h-5 transition-transform group-hover:scale-105 ${isActive ? 'text-violet-400' : 'text-slate-400'}`} />
                  
                  {!isCollapsed && <span className="text-sm">{item.name}</span>}

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-xs font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Profile and Logout Card */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/50">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'px-2 py-2'}`}>
            <div className="w-8 h-8 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center font-bold text-violet-400 text-sm flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-slate-100">{user.name}</p>
                <p className="text-xs text-slate-400 capitalize truncate">{user.role.replace('_', ' ')}</p>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className={`w-full mt-2 flex items-center h-10 rounded-xl transition-all text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 relative group ${
              isCollapsed ? 'justify-center' : 'px-4 gap-3 text-sm font-medium'
            }`}
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span>Keluar</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-xs font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                Keluar
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-[#020617]">
          {children}
        </main>
      </div>
    </div>
  );
}
