'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';
import { 
  LayoutDashboard, Package, Clipboard, LogOut, ChevronLeft, ChevronRight, ShoppingCart, UserCheck, ShieldCheck, Tag, Users
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
      name: 'Promo Diskon',
      path: '/dashboard/manager/discounts',
      icon: Tag,
      roles: ['super_admin', 'manager']
    },
    {
      name: 'Manajemen Member',
      path: '/dashboard/manager/members',
      icon: Users,
      roles: ['super_admin', 'manager', 'supervisor']
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
    },
    {
      name: 'Audit & Rekonsiliasi',
      path: '/dashboard/supervisor/audit',
      icon: ShieldCheck,
      roles: ['super_admin', 'manager', 'supervisor']
    }
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen bg-background text-on-background overflow-hidden font-sans">
      {/* Sidebar */}
      <aside 
        className={`bg-surface border-r border-outline-variant flex flex-col justify-between transition-all duration-200 ease-in-out z-30 flex-shrink-0 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Top Header */}
        <div>
          <div className="h-16 flex items-center justify-between px-4 border-b border-outline-variant bg-surface">
            <div className={`flex items-center gap-3 transition-opacity duration-200 ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
              <div className="w-8 h-8 bg-primary-container rounded-lg flex items-center justify-center text-on-primary-container shadow-sm">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <span className="font-bold text-[20px] text-primary tracking-tight">KEPOS</span>
            </div>
            
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors ml-auto"
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5">
            {filteredMenu.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center h-11 rounded-xl transition-colors relative group ${
                    isActive 
                      ? 'bg-primary-container text-on-primary-container font-semibold' 
                      : 'text-on-surface-variant hover:bg-surface-container'
                  } ${isCollapsed ? 'justify-center px-0' : 'px-3.5 gap-3'}`}
                >
                  <Icon className={`w-5 h-5 transition-transform group-hover:scale-105 ${isActive ? 'text-on-primary-container' : 'text-on-surface-variant'}`} />
                  
                  {!isCollapsed && <span className="text-[14px]">{item.name}</span>}

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-4 px-3 py-1.5 bg-inverse-surface text-inverse-on-surface text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-md">
                      {item.name}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Profile and Logout Card */}
        <div className="p-4 border-t border-outline-variant bg-surface-container-lowest">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center font-bold text-on-secondary-container text-sm flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold truncate text-on-surface">{user.name}</p>
                <p className="text-[12px] text-on-surface-variant capitalize truncate">{user.role.replace('_', ' ')}</p>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className={`w-full mt-3 flex items-center h-10 rounded-xl transition-colors text-error hover:bg-error-container hover:text-on-error-container relative group ${
              isCollapsed ? 'justify-center' : 'px-3 gap-3 text-[14px] font-medium'
            }`}
          >
            <LogOut className="w-4.5 h-4.5" />
            {!isCollapsed && <span>Keluar</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-4 px-3 py-1.5 bg-inverse-surface text-inverse-on-surface text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-md">
                Keluar
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
