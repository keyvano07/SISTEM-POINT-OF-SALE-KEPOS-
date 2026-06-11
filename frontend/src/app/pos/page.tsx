'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useShiftStore } from '@/store/useShiftStore';
import api from '@/services/api';
import PinAuthModal from '@/components/PinAuthModal';
import {
  LogOut, ShoppingCart, Shield, DollarSign,
  Loader2, Clock, AlertTriangle, CheckCircle, X,
  Wallet, CreditCard, Search, Plus, Minus, Trash2,
  Lock, Unlock, RefreshCw, ShoppingBag, ClipboardList, Package,
  Printer, ArrowRight, Smartphone, Users, UserPlus, Check,
  Menu, LayoutDashboard, Tag, ChevronLeft, ChevronRight, ShieldCheck, UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Product {
  id: number;
  category_id: number;
  sku: string;
  barcode: string;
  name: string;
  sell_price: string;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  image_url?: string | null;
  category?: { id: number; name: string };
}

interface Category {
  id: number;
  name: string;
}

interface Member {
  id: number;
  member_code: string;
  name: string;
  phone: string;
  email: string | null;
  points: number;
  total_spending: string;
  tier: 'bronze' | 'silver' | 'gold';
}

interface OrderDraftItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: string;
  subtotal: string;
  product?: Product;
}

interface OrderDraft {
  id: number;
  queue_id: string;
  order_type: 'dine_in' | 'take_away';
  table_number: string | null;
  status: 'pending' | 'locked' | 'completed' | 'expired';
  expires_at: string;
  items?: OrderDraftItem[];
  creator?: { id: number; name: string };
}

interface PosCartItem {
  product: Product;
  quantity: number;
}

interface PaymentInput {
  method: 'cash' | 'qris' | 'debit_card' | 'credit_card';
  amount: number;
  change_amount: number;
  reference_number: string;
  is_standalone_fallback: boolean;
}

interface TransactionItem {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

interface TransactionPayment {
  id: number;
  method: string;
  amount: string;
  change_amount: string;
  reference_number: string | null;
  is_standalone_fallback: boolean;
}

interface Transaction {
  id: number;
  invoice_number: string;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  grand_total: string;
  status: 'completed' | 'voided';
  created_at: string;
  cashier?: { id: number; name: string };
  items: TransactionItem[];
  payments: TransactionPayment[];
}

export default function PosPage() {
  const router = useRouter();
  const { user, clearAuth, token } = useAuthStore();
  const { activeShift, isLoading: shiftLoading, fetchActiveShift, openShift, closeShift } = useShiftStore();

  const [isHydrated, setIsHydrated] = useState(false);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState('');
  const [physicalCashInput, setPhysicalCashInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Sidebar State
  const [showSidebar, setShowSidebar] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

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
      icon: ClipboardList,
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

  const filteredMenu = menuItems.filter(item => item.roles.includes(user?.role || ''));

  // Catalog State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // Cart State
  const [cartItems, setCartItems] = useState<PosCartItem[]>([]);
  const [orderType, setOrderType] = useState<'dine_in' | 'take_away'>('dine_in');
  const [tableNumber, setTableNumber] = useState('');

  // Draft pulling state
  const [draftsList, setDraftsList] = useState<OrderDraft[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<OrderDraft | null>(null);
  const [isDraftLocked, setIsDraftLocked] = useState(false);

  // Supervisor PIN unlock modal
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [pinError, setPinError] = useState('');

  // Checkout State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [payments, setPayments] = useState<PaymentInput[]>([]);
  
  // Payment Form State
  const [payMethod, setPayMethod] = useState<'cash' | 'qris' | 'debit_card' | 'credit_card'>('cash');
  const [payAmountInput, setPayAmountInput] = useState('');
  const [payReference, setPayReference] = useState('');
  const [isStandalone, setIsStandalone] = useState(false);
  
  // QRIS Simulation
  const [qrisSimulating, setQrisSimulating] = useState(false);

  // Post-payment Receipt Modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);

  // History and Void State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyList, setHistoryList] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showVoidPinModal, setShowVoidPinModal] = useState(false);
  const [voidingTransactionId, setVoidingTransactionId] = useState<number | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [showVoidReasonModal, setShowVoidReasonModal] = useState(false);
  const [voidPin, setVoidPin] = useState('');

  // Member & Discount States (Fase 7)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<Member[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  
  // Quick Member Registration Form inside Member Modal
  const [showRegisterMemberForm, setShowRegisterMemberForm] = useState(false);
  const [registerMemberData, setRegisterMemberData] = useState({ name: '', phone: '', email: '' });
  const [registeringMember, setRegisteringMember] = useState(false);

  // Discount Calculation API State
  const [calcResult, setCalcResult] = useState<any>(null);
  const [loadingCalc, setLoadingCalc] = useState(false);

  const recalculateDiscounts = useCallback(async (itemsList: PosCartItem[], member: Member | null) => {
    if (itemsList.length === 0) {
      setCalcResult(null);
      return;
    }
    setLoadingCalc(true);
    try {
      const payload = {
        member_id: member ? member.id : null,
        items: itemsList.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity
        }))
      };
      const res = await api.post('/discounts/calculate', payload);
      if (res.data.success) {
        setCalcResult(res.data.data);
      }
    } catch (err) {
      console.error('Failed to calculate discounts:', err);
    } finally {
      setLoadingCalc(false);
    }
  }, []);

  useEffect(() => {
    recalculateDiscounts(cartItems, selectedMember);
  }, [cartItems, selectedMember, recalculateDiscounts]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated && !token) {
      router.push('/login');
    }
  }, [token, router, isHydrated]);

  // Fetch active shift on mount
  useEffect(() => {
    if (isHydrated && token) {
      fetchActiveShift();
    }
  }, [isHydrated, token, fetchActiveShift]);

  // Auto-show/hide open shift modal depending on active shift status
  useEffect(() => {
    if (isHydrated && !shiftLoading && token) {
      setShowOpenShiftModal(!activeShift);
    }
  }, [isHydrated, shiftLoading, activeShift, token]);

  // Fetch Catalog & Drafts when shift is active
  useEffect(() => {
    if (isHydrated && token && activeShift) {
      fetchCatalog();
      fetchDrafts();
    }
  }, [isHydrated, token, activeShift]);

  const triggerAlert = useCallback((type: 'success' | 'error', text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 5000);
  }, []);

  const fetchCatalog = async () => {
    setLoadingProducts(true);
    setProductsError(null);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories')
      ]);
      const activeProducts = (prodRes.data.data || []).filter((p: Product) => p.is_active);
      setProducts(activeProducts);
      setCategories(catRes.data.data || []);
    } catch (err) {
      console.error(err);
      setProductsError('Gagal memuat katalog produk dari server.');
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchDrafts = async () => {
    setLoadingDrafts(true);
    try {
      const res = await api.get('/order-drafts');
      setDraftsList(res.data.data || []);
    } catch (err) {
      console.error('Gagal mengambil draft antrean:', err);
    } finally {
      setLoadingDrafts(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/transactions');
      setHistoryList(res.data.data || []);
    } catch (err) {
      console.error('Gagal mengambil riwayat transaksi:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseRupiahToNumber(openingCashInput);
    if (amount < 0) {
      triggerAlert('error', 'Jumlah modal awal tidak valid.');
      return;
    }
    setSubmitting(true);
    try {
      const shiftData = await openShift(amount);
      setShowOpenShiftModal(false);
      setOpeningCashInput('');
      triggerAlert('success', `Shift ${shiftData.shift_code} berhasil dibuka.`);
    } catch (err) {
      triggerAlert('error', (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseRupiahToNumber(physicalCashInput);
    if (amount < 0) {
      triggerAlert('error', 'Jumlah uang fisik tidak valid.');
      return;
    }
    setSubmitting(true);
    try {
      await closeShift(amount);
      setShowCloseShiftModal(false);
      setPhysicalCashInput('');
      // Clear auth and redirect to login
      document.cookie = 'pos_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      clearAuth();
      router.push('/login');
    } catch (err) {
      triggerAlert('error', (err as Error).message);
      setSubmitting(false);
    }
  };

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

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  const formatInputRupiah = (value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) return '';
    return new Intl.NumberFormat('id-ID').format(parseInt(clean, 10));
  };

  const parseRupiahToNumber = (formattedValue: string) => {
    const clean = formattedValue.replace(/\D/g, '');
    return clean ? parseInt(clean, 10) : 0;
  };

  // Draft and Cart Syncing logic
  const syncCartToServer = async (updatedItems: PosCartItem[]) => {
    if (!selectedDraft || isDraftLocked) return;
    try {
      const payload = {
        items: updatedItems.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity
        }))
      };
      await api.put(`/order-drafts/${selectedDraft.id}`, payload);
    } catch (err) {
      console.error('Failed to sync cart changes to server draft:', err);
    }
  };

  const handleAddItem = (product: Product) => {
    if (isDraftLocked) {
      triggerAlert('error', 'Keranjang terkunci (Draft dari Pramuniaga). Silakan buka kunci terlebih dahulu.');
      return;
    }

    const existingIndex = cartItems.findIndex(item => item.product.id === product.id);
    let newItems: PosCartItem[] = [];

    if (existingIndex !== -1) {
      newItems = cartItems.map((item, idx) => 
        idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      newItems = [...cartItems, { product, quantity: 1 }];
    }

    setCartItems(newItems);
    syncCartToServer(newItems);
  };

  const handleRemoveItem = (productId: number) => {
    if (isDraftLocked) {
      triggerAlert('error', 'Keranjang terkunci (Draft dari Pramuniaga). Silakan buka kunci terlebih dahulu.');
      return;
    }

    const newItems = cartItems.filter(item => item.product.id !== productId);
    setCartItems(newItems);
    syncCartToServer(newItems);
  };

  const handleUpdateQuantity = (productId: number, newQty: number) => {
    if (isDraftLocked) {
      triggerAlert('error', 'Keranjang terkunci (Draft dari Pramuniaga). Silakan buka kunci terlebih dahulu.');
      return;
    }

    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    const newItems = cartItems.map(item => 
      item.product.id === productId ? { ...item, quantity: newQty } : item
    );
    setCartItems(newItems);
    syncCartToServer(newItems);
  };

  const handlePullDraft = async (draft: OrderDraft) => {
    setSubmitting(true);
    try {
      // 1. Lock the draft on server
      const lockRes = await api.post(`/order-drafts/${draft.id}/lock`);
      if (lockRes.data.success) {
        // 2. Fetch full detail to ensure we have all items
        const detailRes = await api.get(`/order-drafts/${draft.id}`);
        const fullDraft = detailRes.data.data;

        const itemsToLoad = (fullDraft.items || []).map((item: OrderDraftItem) => ({
          product: item.product!,
          quantity: item.quantity
        }));

        setCartItems(itemsToLoad);
        setOrderType(fullDraft.order_type);
        setTableNumber(fullDraft.table_number || '');
        setSelectedDraft(fullDraft);
        setIsDraftLocked(true);
        setShowDraftModal(false);
        triggerAlert('success', `Antrean ${fullDraft.queue_id} berhasil ditarik dan dikunci.`);
      } else {
        triggerAlert('error', lockRes.data.message || 'Gagal mengunci draf.');
      }
    } catch (err) {
      console.error(err);
      let errMsg = 'Gagal menarik draf pesanan.';
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string } } }).response;
        if (response?.data?.message) {
          errMsg = response.data.message;
        }
      }
      triggerAlert('error', errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlockSuccess = async (pin: string) => {
    if (!selectedDraft) return;
    setUnlocking(true);
    setPinError('');
    try {
      const res = await api.post(`/order-drafts/${selectedDraft.id}/unlock`, { pin });
      if (res.data.success) {
        setIsDraftLocked(false);
        setShowUnlockModal(false);
        triggerAlert('success', 'Kunci draf pesanan berhasil dibuka. Keranjang sekarang dapat diedit.');
      }
    } catch (err) {
      console.error(err);
      let errMsg = 'PIN otorisasi tidak valid.';
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string } } }).response;
        if (response?.data?.message) {
          errMsg = response.data.message;
        }
      }
      setPinError(errMsg);
    } finally {
      setUnlocking(false);
    }
  };

  const handleResetCart = () => {
    setCartItems([]);
    setOrderType('dine_in');
    setTableNumber('');
    setSelectedDraft(null);
    setIsDraftLocked(false);
    setSelectedMember(null);
    setCalcResult(null);
    triggerAlert('success', 'Keranjang kasir berhasil di-reset.');
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const match = products.find(p => 
        p.barcode === searchQuery.trim() || 
        p.sku.toLowerCase() === searchQuery.trim().toLowerCase()
      );
      if (match) {
        handleAddItem(match);
        setSearchQuery('');
        triggerAlert('success', `Produk ${match.name} berhasil ditambahkan.`);
      }
    }
  };

  const getSubtotal = () => {
    if (calcResult) {
      return calcResult.subtotal;
    }
    return cartItems.reduce((sum, item) => sum + parseFloat(item.product.sell_price) * item.quantity, 0);
  };

  const getTax = () => {
    if (calcResult) {
      return calcResult.tax_amount;
    }
    return getSubtotal() * 0.11;
  };

  const getGrandTotal = () => {
    if (calcResult) {
      return calcResult.grand_total;
    }
    return getSubtotal() + getTax();
  };

  const getDiscountAmount = () => {
    if (calcResult) {
      return calcResult.item_discounts_total + calcResult.transaction_discount_amount;
    }
    return 0;
  };

  // CHECKOUT & PAYMENTS LOGIC
  const handleOpenCheckout = () => {
    setPayments([]);
    setPayMethod('cash');
    setPayAmountInput(getGrandTotal().toString());
    setPayReference('');
    setIsStandalone(false);
    setShowCheckoutModal(true);
  };

  const getRemainingBalance = () => {
    const totalPaid = payments.reduce((sum, p) => sum + p.amount - p.change_amount, 0);
    return Math.max(0, getGrandTotal() - totalPaid);
  };

  const getChangeDue = () => {
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    return Math.max(0, totalPaid - getGrandTotal());
  };

  const handleAddPayment = () => {
    const amt = parseRupiahToNumber(payAmountInput);
    if (amt <= 0) {
      triggerAlert('error', 'Jumlah pembayaran tidak valid.');
      return;
    }

    const remaining = getRemainingBalance();
    
    let change = 0;
    if (payMethod === 'cash') {
      // Change is only calculated for cash payments when payment exceeds remaining balance
      if (amt > remaining) {
        change = amt - remaining;
      }
    }

    const newPayment: PaymentInput = {
      method: payMethod,
      amount: amt,
      change_amount: change,
      reference_number: (payMethod !== 'cash') ? payReference : '',
      is_standalone_fallback: payMethod !== 'cash' && isStandalone
    };

    setPayments([...payments, newPayment]);
    
    // Reset inputs
    setPayReference('');
    const nextRemaining = Math.max(0, remaining - (amt - change));
    setPayAmountInput(nextRemaining.toString());
  };

  const handleRemovePayment = (index: number) => {
    const newPayments = payments.filter((_, idx) => idx !== index);
    setPayments(newPayments);
    const totalPaid = newPayments.reduce((sum, p) => sum + p.amount - p.change_amount, 0);
    setPayAmountInput(Math.max(0, getGrandTotal() - totalPaid).toString());
  };

  const simulateQrisPayment = () => {
    setQrisSimulating(true);
    setTimeout(() => {
      setQrisSimulating(false);
      const randRef = 'MOCK-QRIS-' + Math.floor(100000 + Math.random() * 900000);
      setPayReference(randRef);
      setIsStandalone(false);
      triggerAlert('success', 'Simulasi Pembayaran QRIS Berhasil!');
    }, 2000);
  };

  const handleFinalizeCheckout = async () => {
    if (getRemainingBalance() > 0) {
      triggerAlert('error', 'Pembayaran belum mencukupi.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        order_draft_id: selectedDraft ? selectedDraft.id : null,
        subtotal: getSubtotal(),
        discount_amount: getDiscountAmount(),
        tax_amount: getTax(),
        grand_total: getGrandTotal(),
        member_id: selectedMember ? selectedMember.id : null,
        discount_id: calcResult ? calcResult.transaction_discount_id : null,
        payments: payments.map(p => ({
          method: p.method,
          amount: p.amount,
          change_amount: p.change_amount,
          reference_number: p.reference_number || null,
          is_standalone_fallback: p.is_standalone_fallback
        })),
        items: !selectedDraft ? cartItems.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity
        })) : null
      };

      const res = await api.post('/transactions', payload);
      
      if (res.data.success) {
        // Fetch full transaction details for receipt including items
        const trxId = res.data.data.id;
        const historyRes = await api.get('/transactions');
        const fullTrx = (historyRes.data.data || []).find((t: Transaction) => t.id === trxId);

        setCompletedTransaction(fullTrx || res.data.data);
        setShowCheckoutModal(false);
        setShowReceiptModal(true);
        handleResetCart();
        triggerAlert('success', 'Transaksi berhasil diselesaikan.');
        fetchCatalog(); // refresh catalog stocks
      }
    } catch (err) {
      console.error(err);
      let errMsg = 'Gagal memproses transaksi.';
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string } } }).response;
        if (response?.data?.message) {
          errMsg = response.data.message;
        }
      }
      triggerAlert('error', errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchMembers = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (memberSearchQuery.trim().length < 3) {
      triggerAlert('error', 'Masukkan minimal 3 karakter untuk mencari member.');
      return;
    }
    setSearchingMembers(true);
    try {
      const res = await api.get('/members', {
        params: { search: memberSearchQuery }
      });
      if (res.data.success) {
        setMemberSearchResults(res.data.data || []);
        if ((res.data.data || []).length === 0) {
          triggerAlert('error', 'Tidak ditemukan member dengan kata kunci tersebut.');
        }
      }
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Gagal mencari member.');
    } finally {
      setSearchingMembers(false);
    }
  };

  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerMemberData.name.trim() || !registerMemberData.phone.trim()) {
      triggerAlert('error', 'Nama dan Nomor HP wajib diisi.');
      return;
    }
    setRegisteringMember(true);
    try {
      const res = await api.post('/members', {
        name: registerMemberData.name.trim(),
        phone: registerMemberData.phone.trim(),
        email: registerMemberData.email.trim() || null
      });
      if (res.data.success) {
        triggerAlert('success', `Member "${res.data.data.name}" berhasil terdaftar!`);
        setSelectedMember(res.data.data);
        setShowMemberModal(false);
        setRegisterMemberData({ name: '', phone: '', email: '' });
        setShowRegisterMemberForm(false);
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Gagal mendaftarkan member baru.';
      triggerAlert('error', msg);
    } finally {
      setRegisteringMember(false);
    }
  };

  const handlePrintReceipt = (trx: Transaction) => {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) {
      triggerAlert('error', 'Pop-up terblokir oleh browser. Izinkan pop-up untuk cetak struk.');
      return;
    }

    const cashierName = trx.cashier?.name || user?.name || 'Staff';
    
    // Items html table
    const itemsHtml = (trx.items || []).map((item: TransactionItem) => `
      <tr>
        <td style="padding: 4px 0; font-size: 11px;">${item.product_name}<br/><small>${item.quantity} x Rp ${parseFloat(item.unit_price).toLocaleString('id-ID')}</small></td>
        <td style="text-align: right; padding: 4px 0; font-size: 11px; font-family: monospace; vertical-align: bottom;">Rp ${parseFloat(item.subtotal).toLocaleString('id-ID')}</td>
      </tr>
    `).join('');

    // Payments html
    const paymentsHtml = (trx.payments || []).map((p: TransactionPayment) => `
      <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0;">
        <span style="text-transform: uppercase;">${p.method.replace('_', ' ')}:</span>
        <span style="font-family: monospace;">Rp ${parseFloat(p.amount).toLocaleString('id-ID')}</span>
      </div>
      ${p.reference_number ? `<div style="font-size: 9px; color: #555; text-align: right; margin-bottom: 4px;">Ref: ${p.reference_number} ${p.is_standalone_fallback ? '(EDC)' : ''}</div>` : ''}
    `).join('');

    const changeSum = (trx.payments || []).reduce((sum: number, p: TransactionPayment) => sum + parseFloat(p.change_amount), 0);

    printWindow.document.write(`
      <html>
        <head>
          <title>Struk Belanja - ${trx.invoice_number}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; color: #000; padding: 10px; width: 280px; margin: 0 auto; line-height: 1.2; }
            .text-center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="text-center">
            <h2 style="margin: 0; font-size: 14px;">KEPOS POINT OF SALE</h2>
            <p style="margin: 2px 0; font-size: 10px;">Mall Jakarta Lt. 2 No. 45</p>
            <p style="margin: 2px 0; font-size: 10px;">Telp: (021) 555-9876</p>
          </div>
          <div class="divider"></div>
          <div style="font-size: 10px; margin-bottom: 6px;">
            <div>INV: ${trx.invoice_number}</div>
            <div>TGL: ${new Date(trx.created_at || new Date()).toLocaleString('id-ID')}</div>
            <div>KASIR: ${cashierName}</div>
          </div>
          <div class="divider"></div>
          <table>
            ${itemsHtml}
          </table>
          <div class="divider"></div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0;">
            <span>Subtotal:</span>
            <span style="font-family: monospace;">Rp ${parseFloat(trx.subtotal || '0').toLocaleString('id-ID')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0;">
            <span>PPN (11%):</span>
            <span style="font-family: monospace;">Rp ${parseFloat(trx.tax_amount || '0').toLocaleString('id-ID')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; padding: 2px 0;">
            <span>GRAND TOTAL:</span>
            <span style="font-family: monospace;">Rp ${parseFloat(trx.grand_total || '0').toLocaleString('id-ID')}</span>
          </div>
          <div class="divider"></div>
          ${paymentsHtml}
          ${changeSum > 0 ? `
            <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0;">
              <span>KEMBALIAN:</span>
              <span style="font-family: monospace;">Rp ${changeSum.toLocaleString('id-ID')}</span>
            </div>
          ` : ''}
          <div class="divider"></div>
          <div class="text-center" style="font-size: 9px; margin-top: 12px;">
            Terima Kasih Atas Kunjungan Anda<br/>Struk ini adalah bukti pembayaran sah.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // VOID LOGIC
  const handleOpenVoidPin = (trxId: number) => {
    setVoidingTransactionId(trxId);
    setVoidReason('');
    setShowVoidPinModal(true);
  };

  const handleVoidPinSuccess = async (pin: string) => {
    setShowVoidPinModal(false);
    setShowVoidReasonModal(true);
    setVoidPin(pin);
  };

  const handleConfirmVoid = async () => {
    if (!voidReason || voidReason.length < 4) {
      triggerAlert('error', 'Alasan void minimal harus 4 karakter.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/transactions/${voidingTransactionId}/void`, {
        pin: voidPin,
        reason: voidReason
      });

      if (res.data.success) {
        triggerAlert('success', 'Transaksi berhasil di-void dan stok dikembalikan.');
        setShowVoidReasonModal(false);
        setVoidingTransactionId(null);
        setVoidReason('');
        fetchHistory(); // refresh history list
        fetchCatalog(); // refresh catalog stocks
      }
    } catch (err) {
      console.error(err);
      let errMsg = 'Gagal membatalkan transaksi.';
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string } } }).response;
        if (response?.data?.message) {
          errMsg = response.data.message;
        }
      }
      triggerAlert('error', errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter products based on search query and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.barcode.includes(searchQuery);
    const matchesCategory = selectedCategoryId === null || product.category_id === selectedCategoryId;
    return matchesSearch && matchesCategory;
  });

  if (!isHydrated || !user) return null;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
        {/* Alert Toast */}
        {alertMsg && (
          <Alert variant={alertMsg.type === 'success' ? 'success' : 'destructive'} className="fixed top-6 right-6 z-[60] animate-fade-in w-auto max-w-md shadow-lg">
            {alertMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <AlertDescription className="font-medium text-sm">{alertMsg.text}</AlertDescription>
          </Alert>
        )}

        {/* Top Navbar */}
        <nav className="border-b border-border/80 px-6 py-3.5 flex justify-between items-center bg-card/85 backdrop-blur-md shadow-sm sticky top-0 z-30 transition-all duration-300">
          <div className="flex items-center gap-3.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(!showSidebar)}
              className="h-9 w-9 text-muted-foreground hover:bg-accent rounded-xl"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="p-2 bg-primary rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform duration-200 cursor-pointer">
              <ShoppingCart className="w-5 h-5 text-primary-foreground" />
            </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight text-foreground">KEPOS Terminal</span>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Point of Sale</span>
            </div>
            {activeShift && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 text-primary font-mono font-bold text-[10px] rounded-full shadow-sm select-none">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span>{activeShift.shift_code}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeShift && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold text-xs shadow-sm select-none">
              <Wallet className="w-3.5 h-3.5 text-emerald-550" />
              <span>Modal: <strong className="font-mono font-bold">{formatCurrency(activeShift.opening_cash)}</strong></span>
            </div>
          )}
          
          {activeShift && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { fetchHistory(); setShowHistoryModal(true); }}
              className="gap-2 h-9 rounded-xl px-4 text-xs font-semibold hover:bg-accent border border-border/50 text-foreground transition-all duration-200 active:scale-95 shadow-sm"
            >
              <ClipboardList className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Riwayat</span>
            </Button>
          )}

          <div className="flex items-center gap-2.5 bg-muted/40 hover:bg-muted/65 px-3 py-1 rounded-xl transition-all duration-200 border border-border/60 shadow-sm cursor-pointer select-none group">
            <div className="w-6 h-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-extrabold uppercase group-hover:scale-105 transition-transform duration-200">
              {user.name.substring(0, 2)}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-bold leading-tight text-foreground">{user.name}</p>
              <p className="text-[9px] text-muted-foreground capitalize leading-none font-medium mt-0.5">{user.role}</p>
            </div>
          </div>

          {activeShift && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCloseShiftModal(true)}
              className="gap-1.5 h-9 rounded-xl text-xs font-bold border-rose-500/20 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 transition-all duration-200 active:scale-95 shadow-sm"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Tutup Shift</span>
            </Button>
          )}

          {!activeShift && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleLogout}
              className="gap-1.5 h-9 rounded-xl text-xs font-bold shadow-sm transition-all duration-200 active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </Button>
          )}
        </div>
      </nav>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col justify-start">
        {shiftLoading ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <span className="font-semibold text-sm">Memeriksa status shift...</span>
          </div>
        ) : !activeShift ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-16 h-16 text-amber-500" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Shift Belum Dibuka</h2>
              <p className="text-muted-foreground max-w-md text-sm">Anda harus membuka shift terlebih dahulu sebelum dapat melayani transaksi pelanggan.</p>
            </div>
            <Button size="lg" onClick={() => setShowOpenShiftModal(true)} className="gap-2 text-base px-8 h-12 shadow-lg">
              <DollarSign className="w-5 h-5" /> Buka Shift Sekarang
            </Button>
          </div>
        ) : (
          /* Active Shift - 3-Pane POS Layout */
          <div className="px-6 py-6 grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
            
            {/* COLUMN 1 & 2: Product Catalog & Search */}
            <div className="xl:col-span-2 bg-card border border-border rounded-xl p-6 shadow-xl space-y-5">
              
              {/* Search & Scan Box */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="w-5 h-5 text-muted-foreground" />
                </span>
                <Input
                  type="text"
                  placeholder="Cari menu, SKU, atau scan barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyPress}
                  className="pl-11 h-11"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-primary-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none -mx-1 px-1">
                <button
                  onClick={() => setSelectedCategoryId(null)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                    selectedCategoryId === null
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-102"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground border border-transparent"
                  }`}
                >
                  Semua
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                      selectedCategoryId === cat.id
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-102"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground border border-transparent"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Products Catalog Grid */}
              {loadingProducts ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-xs">Memuat katalog...</span>
                </div>
              ) : productsError ? (
                <div className="text-center py-12 text-destructive bg-rose-500/5 border border-rose-500/10 rounded-lg p-4">
                  <p className="text-xs font-semibold">{productsError}</p>
                  <button onClick={fetchCatalog} className="mt-3 px-3 py-1.5 bg-accent border border-border rounded-xl text-xs hover:bg-accent">Coba Lagi</button>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs">Tidak ada menu yang sesuai pencarian.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[550px] overflow-y-auto pr-1 scrollbar-thin">
                  {filteredProducts.map(product => {
                    const isOutOfStock = product.stock_quantity <= 0;
                    const isLowStock = !isOutOfStock && product.stock_quantity <= product.low_stock_threshold;
                    
                    return (
                      <div 
                        key={product.id}
                        onClick={() => !isOutOfStock && handleAddItem(product)}
                        className={`bg-card border border-border/85 rounded-xl flex flex-col justify-between shadow-sm hover:shadow-lg hover:border-primary/35 hover:-translate-y-1 transition-all duration-300 group relative cursor-pointer active:scale-[0.98] overflow-hidden ${
                          isOutOfStock ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      >
                        {/* Product Image Section */}
                        <div className="w-full h-28 relative bg-muted border-b border-border/80 flex items-center justify-center overflow-hidden">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground/30">
                              <Package className="w-8 h-8" />
                            </div>
                          )}
                          
                          {/* Stock overlays */}
                          {isOutOfStock ? (
                            <span className="absolute top-2 right-2 px-2 py-0.5 text-[9px] font-bold bg-destructive text-destructive-foreground rounded-full shadow animate-pulse">Habis</span>
                          ) : isLowStock ? (
                            <span className="absolute top-2 right-2 px-2 py-0.5 text-[9px] font-bold bg-amber-500 text-black rounded-full shadow">Stok {product.stock_quantity}</span>
                          ) : null}
                        </div>

                        {/* Product Info Section */}
                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <div>
                            <span className="text-[9px] text-primary font-mono tracking-tight block">{product.sku}</span>
                            <h4 className="font-bold text-xs text-foreground mt-1.5 leading-snug group-hover:text-primary transition-colors line-clamp-2">{product.name}</h4>
                            {product.category && (
                              <span className="text-[9px] text-muted-foreground block mt-0.5">{product.category.name}</span>
                            )}
                          </div>

                          <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between">
                            <span className="font-bold text-emerald-600 text-xs font-mono">
                              Rp {parseFloat(product.sell_price).toLocaleString('id-ID')}
                            </span>
                            <span className="p-1.5 bg-primary/10 text-primary rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm flex items-center justify-center">
                              <Plus className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

            {/* COLUMN 3: Cart Items */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-xl space-y-4 flex flex-col justify-between" style={{ minHeight: '520px' }}>
              
              {/* Cart Header */}
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm">Keranjang</h3>
                </div>
                <button
                  onClick={() => { fetchDrafts(); setShowDraftModal(true); }}
                  className="h-9 px-3 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95 border border-border/50"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-primary" />
                  <span>Tarik Antrean</span>
                </button>
              </div>

              {/* Locked State Banner */}
              {selectedDraft && (
                <div className={`p-3 rounded-xl flex items-center justify-between border ${
                  isDraftLocked 
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                }`}>
                  <div className="flex items-center gap-2">
                    {isDraftLocked ? <Lock className="w-4 h-4 flex-shrink-0" /> : <Unlock className="w-4 h-4 flex-shrink-0" />}
                    <div className="text-left">
                      <p className="text-xs font-bold font-mono leading-none">{selectedDraft.queue_id}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {isDraftLocked ? 'Antrean Terkunci' : 'Kunci Terbuka'} ({selectedDraft.order_type === 'dine_in' ? `Meja ${tableNumber}` : 'Take Away'})
                      </p>
                    </div>
                  </div>
                  {isDraftLocked && (
                    <button
                      onClick={() => setShowUnlockModal(true)}
                      className="h-8 px-3 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-all active:scale-95"
                    >
                      Buka Kunci
                    </button>
                  )}
                </div>
              )}

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto max-h-[350px] space-y-3 pr-1 scrollbar-thin py-2">
                {cartItems.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-muted-foreground/35 animate-pulse" />
                    <p className="text-xs font-semibold text-muted-foreground">Keranjang Kosong</p>
                    <p className="text-[10px] text-muted-foreground mt-1 max-w-[160px] mx-auto">Scan barcode atau pilih menu di sebelah kiri.</p>
                  </div>
                ) : (
                  cartItems.map(item => {
                    const calcItem = calcResult?.items?.find((i: any) => i.product_id === item.product.id);
                    const discountAmount = calcItem ? calcItem.discount_amount : 0;
                    const itemSubtotal = calcItem ? calcItem.subtotal : (parseFloat(item.product.sell_price) * item.quantity);

                    return (
                      <div key={item.product.id} className="bg-muted/40 hover:bg-muted/70 border border-border/80 rounded-xl p-3 flex justify-between gap-3 transition-colors shadow-sm" style={{ minHeight: '56px' }}>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-xs text-foreground leading-normal truncate">{item.product.name}</h5>
                          <span className="text-[9px] text-muted-foreground font-mono block">Rp {parseFloat(item.product.sell_price).toLocaleString('id-ID')} / pcs</span>
                          
                          <div className="flex items-center flex-wrap gap-1 mt-1">
                            {discountAmount > 0 ? (
                              <>
                                <span className="line-through text-[10px] text-muted-foreground/60 font-mono">
                                  Rp {(parseFloat(item.product.sell_price) * item.quantity).toLocaleString('id-ID')}
                                </span>
                                <span className="font-bold text-xs text-emerald-600 font-mono">
                                  Rp {itemSubtotal.toLocaleString('id-ID')}
                                </span>
                                <Badge variant="destructive" className="text-[7px] py-0 px-1 tracking-normal font-mono h-3.5 flex items-center">
                                  Disc
                                </Badge>
                              </>
                            ) : (
                              <span className="font-bold text-xs text-emerald-600 font-mono">
                                  Rp {itemSubtotal.toLocaleString('id-ID')}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end justify-between gap-1">
                          {!isDraftLocked ? (
                            <button
                              onClick={() => handleRemoveItem(item.product.id)}
                              className="text-muted-foreground hover:text-destructive w-7 h-7 flex items-center justify-center rounded transition-colors active:scale-95"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                          )}

                          <div className="flex items-center bg-background border border-border/80 rounded-xl overflow-hidden p-0.5 font-mono shadow-sm">
                            <button
                              onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                              disabled={isDraftLocked}
                              className={`w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-primary-foreground rounded-lg transition-colors active:scale-90 ${
                                isDraftLocked ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted'
                              }`}
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="w-7 text-center text-xs font-mono font-bold text-foreground">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                              disabled={isDraftLocked}
                              className={`w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-primary-foreground rounded-lg transition-colors active:scale-90 ${
                                isDraftLocked ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted'
                              }`}
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Cart Reset Button */}
              {cartItems.length > 0 && (
                <button
                  onClick={handleResetCart}
                  className="w-full py-2.5 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 rounded-xl text-xs font-bold transition-all active:scale-98"
                >
                  Reset / Batalkan Transaksi
                </button>
              )}

            </div>

            {/* COLUMN 4: Payment Summary */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-xl space-y-6">
              <h3 className="text-sm font-bold flex items-center gap-2 pb-3 border-b border-border">
                <CreditCard className="w-4 h-4 text-primary" />
                <span>Panel Pembayaran</span>
              </h3>

              {/* Member Section (Fase 7) */}
              <div className="p-3 bg-muted/50 rounded-xl border border-border space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>Informasi Member</span>
                  </span>
                  {!selectedMember ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setMemberSearchQuery('');
                        setMemberSearchResults([]);
                        setShowRegisterMemberForm(false);
                        setShowMemberModal(true);
                      }}
                      className="h-7 px-3 text-[10px] font-bold gap-1 rounded-full border border-border/40"
                    >
                      <Plus className="w-3 h-3" /> Cari / Daftar
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedMember(null)}
                      className="h-6 px-1.5 text-[9px] text-destructive hover:text-destructive hover:bg-destructive/10 gap-0.5 rounded-full"
                    >
                      Hapus
                    </Button>
                  )}
                </div>

                {selectedMember ? (
                  <div className="text-xs space-y-1 bg-card border border-border p-2.5 rounded-xl shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-foreground truncate max-w-[120px]">{selectedMember.name}</span>
                      <Badge className="text-[8px] uppercase px-1.5 py-0.5 tracking-wider rounded-full" variant={
                        selectedMember.tier === 'gold' ? 'gold' : selectedMember.tier === 'silver' ? 'silver' : 'bronze'
                      }>
                        {selectedMember.tier}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>Code: #{selectedMember.member_code}</span>
                      <span className="text-emerald-500 font-bold">{selectedMember.points} Pts</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic text-center py-2 bg-background/40 rounded-lg border border-dashed border-border/40">
                    Transaksi ini belum ditautkan ke member.
                  </p>
                )}
              </div>

              {/* Order Info */}
              <div className="space-y-3 text-xs bg-muted/40 p-4 rounded-xl border border-border/80">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipe Pesanan:</span>
                  <span className="font-bold text-foreground capitalize">{orderType === 'dine_in' ? 'Dine In' : 'Take Away'}</span>
                </div>
                {orderType === 'dine_in' && (
                  <div className="flex justify-between">
                     <span className="text-muted-foreground">Nomor Meja:</span>
                    <span className="font-bold text-foreground">{tableNumber || '-'}</span>
                  </div>
                )}
                {selectedDraft && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Masa Berlaku:</span>
                    <span className="font-bold text-amber-400 font-mono text-[10px]">
                      s/d {new Date(selectedDraft.expires_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>

              {/* Pricing breakdown */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground font-semibold">Subtotal</span>
                  <span className="font-bold font-mono text-foreground">{formatCurrency(getSubtotal())}</span>
                </div>

                {calcResult && calcResult.item_discounts_total > 0 && (
                  <div className="flex justify-between items-center py-1.5 border-b border-border/50 text-rose-500 font-medium">
                    <span>Diskon Item</span>
                    <span className="font-bold font-mono">- {formatCurrency(calcResult.item_discounts_total)}</span>
                  </div>
                )}

                {calcResult && calcResult.transaction_discount_amount > 0 && (
                  <div className="flex justify-between items-center py-1.5 border-b border-border/50 text-rose-500 font-medium">
                    <span>Diskon Transaksi</span>
                    <span className="font-bold font-mono">- {formatCurrency(calcResult.transaction_discount_amount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground font-semibold">Pajak PPN (11%)</span>
                  <span className="font-bold font-mono text-muted-foreground">{formatCurrency(getTax())}</span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-bold text-emerald-600">Grand Total</span>
                  <span className="text-xl font-extrabold text-emerald-600 font-mono">{formatCurrency(getGrandTotal())}</span>
                </div>

                {calcResult && calcResult.earned_points > 0 && (
                  <div className="flex justify-between items-center py-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 rounded">
                    <span>Poin Didapat:</span>
                    <span className="font-mono">+{calcResult.earned_points} Pts</span>
                  </div>
                )}
              </div>

              {/* Checkout trigger */}
              <button
                onClick={handleOpenCheckout}
                disabled={cartItems.length === 0}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                <DollarSign className="w-4.5 h-4.5" />
                <span>Bayar & Selesai (Fase 5)</span>
              </button>

            </div>

          </div>
        )}
      </div>

      {/* ===== CHECKOUT & SPLIT PAYMENT MODAL ===== */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-4xl bg-card border border-border/80 rounded-2xl p-6 shadow-2xl space-y-6 animate-fade-in my-8">
            <div className="flex justify-between items-center pb-3 border-b border-border/80">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <span>Checkout & Proses Pembayaran</span>
              </h3>
              <button onClick={() => setShowCheckoutModal(false)} className="p-1.5 rounded-full hover:bg-accent text-muted-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* Left Column: Billing Details (2/5 size) */}
              <div className="lg:col-span-2 bg-muted/40 border border-border/80 rounded-xl p-5 space-y-4 shadow-sm">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Detail Pembelian</h4>
                
                <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {cartItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs py-1 border-b border-border/40">
                      <span className="text-muted-foreground truncate max-w-[150px]">{item.product.name}</span>
                      <span className="font-mono text-muted-foreground">{item.quantity} x {formatCurrency(item.product.sell_price)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-border/60 space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span className="font-mono text-foreground">{formatCurrency(getSubtotal())}</span>
                  </div>

                  {calcResult && calcResult.item_discounts_total > 0 && (
                    <div className="flex justify-between text-rose-500 font-medium">
                      <span>Diskon Item:</span>
                      <span className="font-mono">- {formatCurrency(calcResult.item_discounts_total)}</span>
                    </div>
                  )}

                  {calcResult && calcResult.transaction_discount_amount > 0 && (
                    <div className="flex justify-between text-rose-500 font-medium">
                      <span>Diskon Transaksi:</span>
                      <span className="font-mono">- {formatCurrency(calcResult.transaction_discount_amount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-muted-foreground">
                    <span>PPN (11%):</span>
                    <span className="font-mono text-foreground">{formatCurrency(getTax())}</span>
                  </div>

                  <div className="flex justify-between text-sm font-bold text-emerald-600 pt-1.5 border-t border-border/60">
                    <span>Total Tagihan:</span>
                    <span className="font-mono text-lg">{formatCurrency(getGrandTotal())}</span>
                  </div>

                  {calcResult && calcResult.earned_points > 0 && (
                    <div className="flex justify-between text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded">
                      <span>Poin Belanja:</span>
                      <span className="font-mono">+{calcResult.earned_points} Pts</span>
                    </div>
                  )}
                </div>

                {/* Added Payments List */}
                <div className="pt-3 border-t border-border/60 space-y-2">
                  <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Metode Pembayaran Ditambahkan</h5>
                  {payments.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic bg-background/30 rounded-lg p-2.5 border border-dashed border-border/50 text-center">
                      Belum ada pembayaran ditambahkan.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {payments.map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-card border border-border/80 p-2.5 rounded-xl text-xs shadow-sm">
                          <div>
                            <span className="font-semibold uppercase text-primary text-[10px]">{p.method.replace('_', ' ')}</span>
                            {p.reference_number && (
                              <span className="text-[9px] text-muted-foreground font-mono block">Ref: {p.reference_number}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold font-mono text-foreground">{formatCurrency(p.amount)}</span>
                            <button onClick={() => handleRemovePayment(idx)} className="text-destructive hover:text-rose-400 p-0.5 hover:bg-destructive/10 rounded transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Payments Input (3/5 size) */}
              <div className="lg:col-span-3 space-y-5">
                
                {/* Method selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase block">Pilih Metode Pembayaran</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'cash', label: 'Tunai', icon: DollarSign },
                      { id: 'qris', label: 'QRIS', icon: Smartphone },
                      { id: 'debit_card', label: 'Debit', icon: CreditCard },
                      { id: 'credit_card', label: 'Kredit', icon: CreditCard },
                    ].map(m => {
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setPayMethod(m.id as 'cash' | 'qris' | 'debit_card' | 'credit_card');
                            setPayReference('');
                            setIsStandalone(false);
                          }}
                          className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all duration-200 active:scale-95 ${
                            payMethod === m.id
                              ? 'bg-primary border-transparent text-primary-foreground shadow-lg shadow-primary/25 scale-102'
                              : 'bg-muted/40 border-transparent text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Amount input */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase block">Jumlah Uang Pembayaran (IDR)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-base font-bold">Rp</span>
                    <input
                      type="text"
                      placeholder="Masukkan jumlah bayar..."
                      value={payAmountInput}
                      onChange={(e) => setPayAmountInput(formatInputRupiah(e.target.value))}
                      className="w-full bg-muted/40 border border-border/80 rounded-xl pl-12 pr-4 h-12 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground font-mono"
                    />
                  </div>

                  {/* Quick cash suggestions */}
                  {payMethod === 'cash' && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[5000, 10000, 20000, 50000, 100000, 200000].map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setPayAmountInput(formatInputRupiah(sug.toString()))}
                          className="px-3 py-1.5 bg-muted/40 border border-border/60 text-muted-foreground rounded-full text-xs font-semibold font-mono hover:text-foreground hover:bg-muted/80 active:scale-95 transition-all"
                        >
                          {formatCurrency(sug)}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setPayAmountInput(formatInputRupiah(getRemainingBalance().toString()))}
                        className="px-4 py-1.5 bg-primary/10 border border-primary/20 text-primary rounded-full text-xs font-bold hover:bg-primary/25 active:scale-95 transition-all"
                      >
                        Uang Pas
                      </button>
                    </div>
                  )}
                </div>

                {/* Standalone Fallback / QRIS Simulator Section */}
                {payMethod !== 'cash' && (
                  <div className="bg-muted/40 border border-border/80 rounded-xl p-4 space-y-3.5">
                    {payMethod === 'qris' && (
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        {/* Mock QRIS Code */}
                        <div className="w-28 h-28 bg-white p-1.5 rounded-xl flex items-center justify-center relative overflow-hidden group shadow-md border border-border/50">
                          <img
                            src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=simulate-qris-payment"
                            alt="QRIS Code Simulator"
                            className="w-full h-full object-contain"
                          />
                          {qrisSimulating && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                          )}
                          <div className="absolute top-0 left-0 w-full h-1 bg-red-500/80 animate-bounce" />
                        </div>
                        
                        <div className="flex-1 space-y-2 text-center sm:text-left">
                          <h5 className="text-xs font-bold text-foreground">Simulator Pembayaran Digital (QRIS)</h5>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Simulasikan pemindaian kode QR oleh pelanggan. Klik tombol di bawah untuk mengisi nomor referensi transaksi secara otomatis.
                          </p>
                          <button
                            type="button"
                            onClick={simulateQrisPayment}
                            disabled={qrisSimulating}
                            className="px-3.5 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none text-primary-foreground text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all active:scale-95 shadow-sm shadow-primary/10"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>Simulasikan Pembayaran Berhasil</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Standalone Mode Toggle for Cards */}
                    {payMethod !== 'qris' && (
                      <div className="flex justify-between items-center py-2 border-b border-border/40">
                        <div>
                          <label className="text-xs font-bold text-foreground">Gunakan Mesin EDC Standalone</label>
                          <p className="text-[10px] text-muted-foreground">Aktifkan jika pembayaran di-swipe manual tanpa integrasi API langsung.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isStandalone}
                          onChange={(e) => setIsStandalone(e.target.checked)}
                          className="h-4.5 w-4.5 accent-primary rounded bg-accent border-border focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                      </div>
                    )}

                    {/* Reference trace field */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Nomor Referensi / Trace Number {isStandalone ? 'EDC' : 'Sistem'}
                      </label>
                      <input
                        type="text"
                        placeholder="Trace / Auth Code / Reference ID..."
                        value={payReference}
                        onChange={(e) => setPayReference(e.target.value)}
                        className="w-full bg-card border border-border/80 rounded-xl px-4 h-10 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                      />
                    </div>
                  </div>
                )}

                {/* Add Payment Action Button */}
                <button
                  type="button"
                  onClick={handleAddPayment}
                  disabled={!payAmountInput || parseFloat(payAmountInput) <= 0}
                  className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none border border-transparent rounded-xl text-xs font-bold transition-all active:scale-98 flex items-center justify-center gap-1.5 shadow-md shadow-primary/10"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambahkan Pembayaran</span>
                </button>

                {/* Pay summary totals and action */}
                <div className="pt-4 border-t border-border/80 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs bg-muted/40 border border-border/80 p-4 rounded-xl shadow-inner">
                    <div>
                      <p className="text-muted-foreground">Tersisa Harus Dibayar:</p>
                      <p className="text-lg font-bold text-primary font-mono mt-0.5">{formatCurrency(getRemainingBalance())}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-muted-foreground">Kembalian Uang Tunai:</p>
                      <p className="text-lg font-bold text-emerald-600 font-mono mt-0.5">{formatCurrency(getChangeDue())}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCheckoutModal(false)}
                      className="flex-1 h-12 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold text-xs rounded-xl transition-all border border-border/50"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleFinalizeCheckout}
                      disabled={submitting || getRemainingBalance() > 0}
                      className="flex-[2] h-12 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none text-primary-foreground font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                    >
                      {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                      <span>Konfirmasi & Selesaikan Pembayaran</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* ===== POST-PAYMENT RECEIPT MODAL ===== */}
      {showReceiptModal && completedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="w-full max-w-md bg-card border border-border/80 rounded-2xl p-6 shadow-2xl space-y-6 animate-scale-in text-center">
            
            <div className="flex flex-col items-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 ring-8 ring-emerald-500/5 transition-transform duration-500 scale-100">
                <CheckCircle size={36} className="animate-pulse" />
              </div>
              <h3 className="text-xl font-extrabold text-foreground">Pembayaran Berhasil!</h3>
              <p className="text-xs text-muted-foreground mt-1.5">Invoice: <strong className="text-primary font-mono font-bold">{completedTransaction.invoice_number}</strong></p>
            </div>

            {/* Micro Receipt Preview */}
            <div className="bg-muted/40 border border-border/80 rounded-xl p-4 text-left space-y-3 max-h-[220px] overflow-y-auto scrollbar-thin text-xs shadow-inner">
              <div className="border-b border-border/60 pb-2 text-[10px] text-muted-foreground flex justify-between font-mono">
                <span>POS KEPOS STORE</span>
                <span>{new Date(completedTransaction?.created_at || new Date()).toLocaleString('id-ID')}</span>
              </div>
              
              <div className="space-y-1">
                {(completedTransaction?.items || []).map((item: TransactionItem, idx: number) => (
                  <div key={idx} className="flex justify-between font-mono">
                    <span className="text-muted-foreground truncate max-w-[200px]">{item.product_name} x{item.quantity}</span>
                    <span className="font-semibold">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border/60 pt-2 space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(completedTransaction?.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>PPN (11%):</span>
                  <span className="font-semibold">{formatCurrency(completedTransaction?.tax_amount || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-600 text-sm border-t border-border/60 pt-1.5">
                  <span>Total Tagihan:</span>
                  <span>{formatCurrency(completedTransaction?.grand_total || 0)}</span>
                </div>
              </div>

              {/* Payments details */}
              <div className="border-t border-dashed border-border/60 pt-2 space-y-1">
                {(completedTransaction?.payments || []).map((p: TransactionPayment, idx: number) => (
                  <div key={idx} className="flex justify-between text-[10px] text-muted-foreground uppercase font-mono">
                    <span>{p.method.replace('_', ' ')}:</span>
                    <span>{formatCurrency(p.amount)}</span>
                  </div>
                ))}
                {((completedTransaction?.payments || []).reduce((sum: number, p: TransactionPayment) => sum + parseFloat(p.change_amount), 0) > 0) && (
                  <div className="flex justify-between text-[10px] text-emerald-600 font-bold font-mono">
                    <span>KEMBALIAN:</span>
                    <span>{formatCurrency((completedTransaction?.payments || []).reduce((sum: number, p: TransactionPayment) => sum + parseFloat(p.change_amount), 0))}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => handlePrintReceipt(completedTransaction)}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98]"
              >
                <Printer className="w-4.5 h-4.5" />
                <span>Cetak Struk Belanja (PDF)</span>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowReceiptModal(false);
                  setCompletedTransaction(null);
                }}
                className="w-full h-12 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold text-sm rounded-xl flex items-center justify-center gap-1.5 transition-all border border-border/50 active:scale-[0.98]"
              >
                <span>Mulai Transaksi Baru</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ===== MEMBER SEARCH & REGISTRATION MODAL ===== */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <h3 className="text-md font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>Pencarian & Registrasi Member</span>
              </h3>
              <button 
                onClick={() => {
                  setShowMemberModal(false);
                  setShowRegisterMemberForm(false);
                }} 
                className="p-1 rounded-md hover:bg-accent text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!showRegisterMemberForm ? (
              <div className="space-y-4">
                <form onSubmit={handleSearchMembers} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Cari Nama / No Telp / Code..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      className="pl-8 text-xs h-9"
                    />
                  </div>
                  <Button type="submit" size="sm" disabled={searchingMembers} className="h-9 px-3 gap-1">
                    {searchingMembers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>Cari</span>
                  </Button>
                </form>

                {/* Search Results List */}
                <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                  {memberSearchResults.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      {searchingMembers ? 'Mencari member...' : 'Masukkan kata kunci untuk mencari member.'}
                    </p>
                  ) : (
                    memberSearchResults.map((m) => (
                      <div 
                        key={m.id} 
                        className="flex justify-between items-center bg-muted/50 border border-border p-2.5 rounded-lg text-xs hover:border-primary/50 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-foreground">{m.name}</span>
                            <Badge className="text-[7px] uppercase px-1 py-0" variant={
                              m.tier === 'gold' ? 'gold' : m.tier === 'silver' ? 'silver' : 'bronze'
                            }>
                              {m.tier}
                            </Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            <span>Code: #{m.member_code} • HP: {m.phone}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelectedMember(m);
                            setShowMemberModal(false);
                          }}
                          className="h-7 px-2.5 text-[10px] font-bold"
                        >
                          Pilih
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-border pt-3 flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Pelanggan belum terdaftar?</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowRegisterMemberForm(true)} 
                    className="h-8 gap-1 text-[11px] font-semibold"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Daftar Baru
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegisterMember} className="space-y-3 text-xs">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Pendaftaran Member Baru</h4>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Nama Lengkap *</label>
                  <Input
                    type="text"
                    required
                    placeholder="Masukkan nama lengkap"
                    value={registerMemberData.name}
                    onChange={(e) => setRegisterMemberData(prev => ({ ...prev, name: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Nomor HP / WA *</label>
                  <Input
                    type="tel"
                    required
                    placeholder="Contoh: 081234567890"
                    value={registerMemberData.phone}
                    onChange={(e) => setRegisterMemberData(prev => ({ ...prev, phone: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Email (Opsional)</label>
                  <Input
                    type="email"
                    placeholder="Contoh: pelanggan@gmail.com"
                    value={registerMemberData.email}
                    onChange={(e) => setRegisterMemberData(prev => ({ ...prev, email: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowRegisterMemberForm(false)} 
                    className="flex-1 h-9 text-xs"
                  >
                    Kembali
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={registeringMember} 
                    className="flex-1 h-9 text-xs gap-1"
                  >
                    {registeringMember ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Daftarkan</span>
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ===== TRANSACTION HISTORY MODAL (WITH VOID OPTION) ===== */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="w-full max-w-4xl bg-card border border-border rounded-xl p-6 shadow-2xl space-y-6 animate-fade-in">
            
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                <span>Riwayat Transaksi Hari Ini</span>
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="p-1 rounded-xl hover:bg-accent text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingHistory ? (
              <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-xs">Mengambil riwayat transaksi...</span>
              </div>
            ) : historyList.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm">Belum ada transaksi terekam hari ini.</p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1 scrollbar-thin text-xs">
                
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-1.5 border-b border-border">
                  <div className="col-span-3">No Invoice / Waktu</div>
                  <div className="col-span-4">Item Pembelian</div>
                  <div className="col-span-2 text-right">Grand Total</div>
                  <div className="col-span-1 text-center">Status</div>
                  <div className="col-span-2 text-right">Aksi</div>
                </div>

                <div className="space-y-3.5">
                  {historyList.map(trx => {
                    const isVoided = trx.status === 'voided';
                    return (
                      <div 
                        key={trx.id}
                        className={`grid grid-cols-12 gap-2 items-center bg-muted border border-border p-4 rounded-lg ${
                          isVoided ? 'opacity-55 border-rose-500/10' : 'hover:border-border'
                        }`}
                      >
                        {/* Invoice & Time */}
                        <div className="col-span-3 text-left">
                          <span className="font-extrabold text-foreground block font-mono">{trx.invoice_number}</span>
                          <span className="text-[10px] text-muted-foreground font-mono block mt-1">
                            {new Date(trx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • {trx.cashier?.name || 'Staff'}
                          </span>
                        </div>

                        {/* Items list */}
                        <div className="col-span-4 text-left max-h-[80px] overflow-y-auto pr-1 scrollbar-none font-mono">
                          {trx.items.map((item, idx) => (
                            <div key={idx} className="text-[11px] text-muted-foreground leading-tight">
                              • {item.product_name} x{item.quantity}
                            </div>
                          ))}
                        </div>

                        {/* Total */}
                        <div className="col-span-2 text-right font-bold font-mono text-foreground">
                          {formatCurrency(trx.grand_total)}
                        </div>

                        {/* Status */}
                        <div className="col-span-1 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            isVoided 
                              ? 'bg-rose-500/15 border border-destructive/20 text-destructive' 
                              : 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-600'
                          }`}>
                            {isVoided ? 'Void' : 'Sukses'}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="col-span-2 flex justify-end gap-2">
                          <button
                            onClick={() => handlePrintReceipt(trx)}
                            className="p-1.5 bg-muted hover:bg-accent border border-border rounded-lg text-muted-foreground hover:text-primary-foreground transition-all active:scale-95"
                            title="Cetak Struk"
                          >
                            <Printer size={15} />
                          </button>
                          
                          {!isVoided ? (
                            <button
                              onClick={() => handleOpenVoidPin(trx.id)}
                              className="px-2.5 py-1.5 bg-destructive/10 hover:bg-destructive border border-destructive/20 text-destructive hover:text-primary-foreground rounded-lg text-[10px] font-bold transition-all active:scale-95 flex items-center gap-1"
                            >
                              <AlertTriangle size={12} />
                              <span>Void</span>
                            </button>
                          ) : (
                            <div className="w-16 h-8 flex items-center justify-center text-[10px] text-muted-foreground italic">
                              Batal
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== VOID PIN AUTH MODAL (Polymorphic PIN auth modal wrapper) ===== */}
      <PinAuthModal
        isOpen={showVoidPinModal}
        onClose={() => { setShowVoidPinModal(false); setVoidingTransactionId(null); }}
        onSuccess={handleVoidPinSuccess}
        title="Otorisasi Void Transaksi"
        description="Masukkan 6-digit PIN Supervisor atau Manager untuk menyetujui void transaksi ini."
        errorMessage={pinError}
        isLoading={unlocking}
      />

      {/* ===== VOID REASON MODAL ===== */}
      {showVoidReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="w-full max-w-sm bg-card border border-border rounded-xl p-6 shadow-2xl space-y-5">
            <div className="text-center space-y-2">
              <div className="mx-auto w-fit p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                <AlertTriangle className="w-8 h-8 animate-pulse" />
              </div>
              <h4 className="text-base font-bold">Alasan Void Transaksi</h4>
              <p className="text-xs text-muted-foreground">Tindakan ini akan mengembalikan stok barang dan membatalkan status pembayaran.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Alasan Pembatalan</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Contoh: Pembatalan oleh pembeli / salah input kasir..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-550 placeholder:text-muted-foreground text-foreground resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowVoidReasonModal(false);
                    setVoidingTransactionId(null);
                    setVoidReason('');
                    setVoidPin('');
                  }}
                  className="flex-1 h-11 bg-accent hover:bg-muted text-muted-foreground font-bold text-xs rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmVoid}
                  disabled={submitting || voidReason.length < 4}
                  className="flex-[2] h-11 bg-rose-600 hover:bg-rose-500 disabled:bg-accent disabled:text-muted-foreground disabled:cursor-not-allowed text-primary-foreground font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Batalkan Transaksi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== DRAFT UNLOCK PIN AUTH MODAL WRAPPER ===== */}
      <PinAuthModal
        isOpen={showUnlockModal}
        onClose={() => { setShowUnlockModal(false); }}
        onSuccess={handleUnlockSuccess}
        title="Otorisasi Buka Kunci"
        description="Masukkan 6-digit PIN Supervisor atau Manager untuk mengedit draft antrean pesanan ini."
        errorMessage={pinError}
        isLoading={unlocking}
      />

      {/* ===== OPEN SHIFT MODAL ===== */}
      {showOpenShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-2xl space-y-6">
            {/* Close button */}
            <button
              onClick={() => { setShowOpenShiftModal(false); }}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-accent text-muted-foreground hover:text-primary-foreground transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="mx-auto w-fit p-4 bg-primary/10 rounded-lg border border-primary/20">
                <DollarSign className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold mt-4">Buka Shift Baru</h3>
              <p className="text-sm text-muted-foreground">Masukkan jumlah uang tunai yang ada di laci kas sebagai modal awal.</p>
            </div>

            <form onSubmit={handleOpenShift} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-semibold uppercase block">Modal Awal Laci Kas (IDR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">Rp</span>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="100.000"
                    value={openingCashInput}
                    onChange={(e) => setOpeningCashInput(formatInputRupiah(e.target.value))}
                    className="w-full bg-muted border border-border rounded-xl pl-12 pr-4 h-12 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground text-foreground font-mono"
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[50000, 100000, 150000, 200000, 300000, 500000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setOpeningCashInput(formatInputRupiah(amount.toString()))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 ${
                        parseRupiahToNumber(openingCashInput) === amount
                          ? 'bg-primary/20 border-primary/40 text-primary'
                          : 'bg-muted border-border text-muted-foreground hover:text-primary-foreground hover:border-border'
                      }`}
                    >
                      {formatCurrency(amount)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !openingCashInput}
                className="w-full h-12 bg-primary hover:bg-primary/95 disabled:bg-accent disabled:text-muted-foreground disabled:cursor-not-allowed text-primary-foreground font-bold text-xs rounded-xl shadow-lg shadow-primary/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                <span>Buka Shift</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== CLOSE SHIFT MODAL (Blind Cash Drop) ===== */}
      {showCloseShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-2xl space-y-6">
            {/* Close button */}
            <button
              onClick={() => setShowCloseShiftModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-accent text-muted-foreground hover:text-primary-foreground transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="mx-auto w-fit p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <Clock className="w-10 h-10 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold mt-4 text-foreground">Tutup Shift</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hitung uang fisik di laci kas Anda secara manual, lalu masukkan jumlahnya di bawah. Anda <strong className="text-amber-700 font-extrabold">tidak akan melihat</strong> jumlah yang diharapkan sistem (Blind Cash Drop).
              </p>
            </div>

            {/* Warning box */}
            <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3.5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                Setelah shift ditutup, Anda akan <strong>otomatis logout</strong> dari sistem. Pastikan semua transaksi sudah selesai diproses.
              </p>
            </div>

            <form onSubmit={handleCloseShift} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-semibold uppercase block">Total Uang Fisik di Laci (IDR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">Rp</span>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Jumlah setelah dihitung manual..."
                    value={physicalCashInput}
                    onChange={(e) => setPhysicalCashInput(formatInputRupiah(e.target.value))}
                    className="w-full bg-muted border border-border rounded-xl pl-12 pr-4 h-12 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder:text-muted-foreground text-foreground font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !physicalCashInput}
                className="w-full h-12 bg-amber-500 hover:bg-amber-400 disabled:bg-accent disabled:text-muted-foreground disabled:cursor-not-allowed text-black font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                <span>Tutup Shift & Logout</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== DRAFS PULL MODAL ===== */}
      {showDraftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-card border border-border rounded-xl p-6 shadow-2xl space-y-6 animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                <span>Daftar Antrean Draft Pesanan (Pramuniaga)</span>
              </h3>
              <button
                onClick={() => setShowDraftModal(false)}
                className="p-1 rounded-xl hover:bg-accent text-muted-foreground hover:text-primary-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDrafts ? (
              <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-xs">Mengambil daftar draft...</span>
              </div>
            ) : draftsList.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm">Tidak ada antrean draf aktif saat ini.</p>
                <button
                  onClick={fetchDrafts}
                  className="mt-3 px-3.5 py-2 bg-muted border border-border rounded-xl text-xs font-semibold hover:bg-accent flex items-center gap-1 mx-auto active:scale-95 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Segarkan</span>
                </button>
              </div>
            ) : (
              <div className="max-h-[350px] overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                {draftsList.map(draft => (
                  <div 
                    key={draft.id}
                    className="bg-muted border border-border rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-primary/20 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm font-mono text-primary">{draft.queue_id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          draft.order_type === 'dine_in' 
                            ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' 
                            : 'bg-primary/10 border border-primary/20 text-primary'
                        }`}>
                          {draft.order_type === 'dine_in' ? `Dine In (Meja ${draft.table_number})` : 'Take Away'}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Dibuat oleh: <span className="text-muted-foreground font-semibold">{draft.creator?.name || 'Staff'}</span> • Berlaku s/d {new Date(draft.expires_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2.5 md:pt-0 border-border">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] text-muted-foreground block">Total Est.</span>
                        <span className="text-xs font-bold text-emerald-600 font-mono">
                          {formatCurrency(draft.items?.reduce((sum, it) => sum + parseFloat(it.subtotal), 0) || 0)}
                        </span>
                      </div>
                      <button
                        onClick={() => handlePullDraft(draft)}
                        disabled={submitting}
                        className="h-10 px-4 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                      >
                        {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Tarik Antrean</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-3 px-6 border-t bg-card/85 text-center text-[10px] text-muted-foreground">
        KEPOS Point of Sale © 2026. All rights reserved.
      </footer>
      {/* Sidebar Overlay Drawer */}
      {showSidebar && (
        <div 
          onClick={() => setShowSidebar(false)}
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm transition-opacity duration-300"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-card border-r shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-out transform",
          showSidebar ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b flex justify-between items-center bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl text-primary-foreground shadow-md shadow-primary/10">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm tracking-tight">KEPOS Menu</h4>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Navigasi Utama</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSidebar(false)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg"
          >
            <X className="w-4.5 h-4.5" />
          </Button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {filteredMenu.map((item) => {
            const isActive = item.path === '/pos';
            const Icon = item.icon;

            return (
              <Button
                key={item.path}
                variant={isActive ? "secondary" : "ghost"}
                onClick={() => {
                  setShowSidebar(false);
                  router.push(item.path);
                }}
                className={cn(
                  "w-full justify-start h-11 px-4 font-semibold rounded-xl text-sm transition-all duration-200",
                  isActive 
                    ? "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                )}
              >
                <Icon className={cn("w-4.5 h-4.5 mr-3", isActive ? "text-primary" : "text-muted-foreground")} />
                <span>{item.name}</span>
              </Button>
            );
          })}
        </div>

        {/* Bottom Profile / Logout */}
        <div className="p-4 border-t bg-muted/10">
          <div className="flex items-center gap-3 mb-3 p-2 bg-card border border-border/40 rounded-xl shadow-sm">
            <Avatar className="h-10 w-10 border border-border/80">
              <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary uppercase">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-foreground leading-tight">{user.name}</p>
              <p className="text-[10px] text-muted-foreground capitalize truncate leading-none mt-1">{user.role.replace('_', ' ')}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-center h-10 text-destructive hover:text-destructive hover:bg-destructive/10 font-bold text-xs rounded-xl border border-destructive/10 transition-all duration-200 flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar dari Akun</span>
          </Button>
        </div>
      </aside>

    </div>
  </TooltipProvider>
  );
}
