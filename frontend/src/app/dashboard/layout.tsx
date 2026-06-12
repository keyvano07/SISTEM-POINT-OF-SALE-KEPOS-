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
            isCollapsed ? 'w-[78px]' : 'w-[272px]'
          )}
        >
          {/* Top: Logo + Nav */}
          <div>
            {/* Logo Area */}
            <div className="h-20 flex items-center justify-between px-4 border-b">
              <div className={cn(
                "flex items-center gap-3 transition-opacity duration-200",
                isCollapsed ? 'opacity-0 hidden' : 'opacity-100'
              )}>
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <span className="font-black text-xl text-primary tracking-wider">KEPOS</span>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted ml-auto"
              >
                {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </Button>
            </div>

            {/* Navigation Links */}
            <nav className="p-3 space-y-2">
              {filteredMenu.map((item) => {
                const isActive = pathname === item.path;
                const Icon = item.icon;

                const navButton = (
                  <Button
                    key={item.path}
                    variant={isActive ? "secondary" : "ghost"}
                    onClick={() => router.push(item.path)}
                    className={cn(
                      "w-full justify-start h-12 rounded-xl transition-all duration-200 px-4",
                      isActive 
                        ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-sm hover:bg-primary/15" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/65 font-semibold",
                      isCollapsed && "justify-center px-0"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", !isCollapsed && "mr-3", isActive && "text-primary")} />
                    {!isCollapsed && <span className="text-[15px] tracking-wide truncate">{item.name}</span>}
                  </Button>
                );

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>
                        {navButton}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-bold text-sm">
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
          <div className="p-4 border-t space-y-3">
            <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
              <Avatar className="h-10 w-10 border border-border">
                <AvatarFallback className="text-sm font-bold bg-primary/5 text-primary">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-foreground truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground font-semibold capitalize truncate">{user.role.replace('_', ' ')}</p>
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
                    className="w-full h-12 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-bold text-sm">Keluar</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start h-12 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 font-bold text-[14px]"
              >
                <LogOut className="w-5 h-5 mr-3" />
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
