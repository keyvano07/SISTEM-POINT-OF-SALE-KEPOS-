'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';
import { 
  LayoutDashboard, Package, Clipboard, LogOut, ChevronLeft, ChevronRight, 
  ShoppingCart, UserCheck, ShieldCheck, Tag, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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
    <TooltipProvider delayDuration={0}>
      <div className="flex min-h-screen bg-background overflow-hidden font-sans">
        {/* Sidebar */}
        <aside 
          className={cn(
            "bg-card border-r flex flex-col justify-between transition-all duration-200 ease-in-out z-30 flex-shrink-0",
            isCollapsed ? 'w-[68px]' : 'w-64'
          )}
        >
          {/* Top: Logo + Nav */}
          <div>
            {/* Logo Area */}
            <div className="h-16 flex items-center justify-between px-3 border-b">
              <div className={cn(
                "flex items-center gap-2.5 transition-opacity duration-200",
                isCollapsed ? 'opacity-0 hidden' : 'opacity-100'
              )}>
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground shadow-sm">
                  <LayoutDashboard className="w-4 h-4" />
                </div>
                <span className="font-bold text-lg text-primary tracking-tight">KEPOS</span>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-8 w-8 text-muted-foreground ml-auto"
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </Button>
            </div>

            {/* Navigation Links */}
            <nav className="p-2 space-y-1">
              {filteredMenu.map((item) => {
                const isActive = pathname === item.path;
                const Icon = item.icon;

                const navButton = (
                  <Button
                    key={item.path}
                    variant={isActive ? "secondary" : "ghost"}
                    onClick={() => router.push(item.path)}
                    className={cn(
                      "w-full justify-start h-10 font-medium",
                      isActive && "bg-primary/10 text-primary font-semibold hover:bg-primary/15",
                      isCollapsed && "justify-center px-0"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", !isCollapsed && "mr-2.5", isActive && "text-primary")} />
                    {!isCollapsed && <span className="text-sm truncate">{item.name}</span>}
                  </Button>
                );

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>
                        {navButton}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-semibold">
                        {item.name}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return navButton;
              })}
            </nav>
          </div>

          {/* Bottom: Profile & Logout */}
          <div className="p-3 border-t">
            <div className={cn("flex items-center gap-2.5 mb-2", isCollapsed && "justify-center")}>
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground capitalize truncate">{user.role.replace('_', ' ')}</p>
                </div>
              )}
            </div>

            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="w-full h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Keluar</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start h-9 text-destructive hover:text-destructive hover:bg-destructive/10 font-medium text-sm"
              >
                <LogOut className="w-4 h-4 mr-2.5" />
                <span>Keluar</span>
              </Button>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
