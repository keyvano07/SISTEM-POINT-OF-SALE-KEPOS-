import { create } from 'zustand';

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  category_id: number;
  sku: string;
  barcode: string;
  name: string;
  description: string | null;
  buy_price: string;
  sell_price: string;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  is_low_stock?: boolean;
  category?: Category;
}

export interface Member {
  id: number;
  member_code: string;
  name: string;
  phone: string;
  email: string | null;
  points: number;
  total_spending: string;
  tier: 'bronze' | 'silver' | 'gold';
}

export interface Discount {
  id: number;
  name: string;
  description: string | null;
  scope: 'transaction' | 'product' | 'category';
  type: 'percentage' | 'fixed_amount';
  value: string;
  target: 'all' | 'member_only' | 'tier_specific';
  target_tier: 'bronze' | 'silver' | 'gold' | null;
  target_product_id: number | null;
  target_category_id: number | null;
  min_purchase_amount: string;
  max_discount_amount: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CalculatedItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  subtotal: number;
  appliedDiscount: Discount | null;
}

interface CalculatedCartResult {
  items: CalculatedItem[];
  originalSubtotal: number;
  itemDiscountsTotal: number;
  transactionDiscount: Discount | null;
  transactionDiscountAmount: number;
  totalDiscount: number;
  grandTotal: number;
  earnedPoints: number;
}

interface CartState {
  items: CartItem[];
  orderType: 'dine_in' | 'take_away';
  tableNumber: string;
  selectedMember: Member | null;
  activeDiscounts: Discount[];
  addItem: (product: Product) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  setOrderType: (type: 'dine_in' | 'take_away') => void;
  setTableNumber: (tableNumber: string) => void;
  setSelectedMember: (member: Member | null) => void;
  setActiveDiscounts: (discounts: Discount[]) => void;
  getSubtotal: () => number;
  getCalculatedCart: () => CalculatedCartResult;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  orderType: 'dine_in',
  tableNumber: '',
  selectedMember: null,
  activeDiscounts: [],

  addItem: (product) => {
    const items = get().items;
    const existingIndex = items.findIndex((item) => item.product.id === product.id);

    if (existingIndex !== -1) {
      const updatedItems = [...items];
      updatedItems[existingIndex].quantity += 1;
      set({ items: updatedItems });
    } else {
      set({ items: [...items, { product, quantity: 1 }] });
    }
  },

  removeItem: (productId) => {
    set({
      items: get().items.filter((item) => item.product.id !== productId),
    });
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    const updatedItems = get().items.map((item) =>
      item.product.id === productId ? { ...item, quantity } : item
    );
    set({ items: updatedItems });
  },

  clearCart: () => {
    set({ items: [], orderType: 'dine_in', tableNumber: '', selectedMember: null });
  },

  setOrderType: (orderType) => {
    set({ orderType, tableNumber: orderType === 'take_away' ? '' : get().tableNumber });
  },

  setTableNumber: (tableNumber) => {
    set({ tableNumber });
  },

  setSelectedMember: (selectedMember) => {
    set({ selectedMember });
  },

  setActiveDiscounts: (activeDiscounts) => {
    set({ activeDiscounts });
  },

  getSubtotal: () => {
    return get().items.reduce(
      (sum, item) => sum + parseFloat(item.product.sell_price) * item.quantity,
      0
    );
  },

  getCalculatedCart: () => {
    const items = get().items;
    const member = get().selectedMember;
    const discounts = get().activeDiscounts;

    let totalItemsDiscount = 0;
    const processedItems: CalculatedItem[] = items.map((item) => {
      const unitPrice = parseFloat(item.product.sell_price);
      const itemSubtotalBefore = unitPrice * item.quantity;
      let maxDiscount = 0;
      let appliedDiscount: Discount | null = null;

      // Check product and category discounts
      discounts.forEach((disc) => {
        // Eligibility check
        if (disc.target === 'member_only' && !member) return;
        if (disc.target === 'tier_specific' && (!member || member.tier !== disc.target_tier)) return;

        let applies = false;
        if (disc.scope === 'product' && disc.target_product_id === item.product.id) {
          applies = true;
        } else if (disc.scope === 'category' && disc.target_category_id === item.product.category_id) {
          applies = true;
        }

        if (applies) {
          let amt = 0;
          if (disc.type === 'percentage') {
            amt = itemSubtotalBefore * (parseFloat(disc.value) / 100);
          } else if (disc.type === 'fixed_amount') {
            amt = parseFloat(disc.value) * item.quantity;
          }

          if (disc.max_discount_amount !== null) {
            amt = Math.min(amt, parseFloat(disc.max_discount_amount));
          }
          amt = Math.min(amt, itemSubtotalBefore);

          if (amt > maxDiscount) {
            maxDiscount = amt;
            appliedDiscount = disc;
          }
        }
      });

      totalItemsDiscount += maxDiscount;

      return {
        product: item.product,
        quantity: item.quantity,
        unitPrice,
        discountAmount: maxDiscount,
        subtotal: itemSubtotalBefore - maxDiscount,
        appliedDiscount,
      };
    });

    const itemsSubtotal = processedItems.reduce((sum, i) => sum + i.subtotal, 0);

    // Calculate transaction-level discount
    let maxTxDiscount = 0;
    let appliedTxDiscount: Discount | null = null;

    discounts.forEach((disc) => {
      if (disc.scope !== 'transaction') return;
      if (disc.target === 'member_only' && !member) return;
      if (disc.target === 'tier_specific' && (!member || member.tier !== disc.target_tier)) return;

      if (itemsSubtotal < parseFloat(disc.min_purchase_amount)) return;

      let amt = 0;
      if (disc.type === 'percentage') {
        amt = itemsSubtotal * (parseFloat(disc.value) / 100);
      } else if (disc.type === 'fixed_amount') {
        amt = parseFloat(disc.value);
      }

      if (disc.max_discount_amount !== null) {
        amt = Math.min(amt, parseFloat(disc.max_discount_amount));
      }
      amt = Math.min(amt, itemsSubtotal);

      if (amt > maxTxDiscount) {
        maxTxDiscount = amt;
        appliedTxDiscount = disc;
      }
    });

    const originalSubtotal = items.reduce((sum, item) => sum + parseFloat(item.product.sell_price) * item.quantity, 0);
    const totalDiscount = totalItemsDiscount + maxTxDiscount;
    const grandTotal = itemsSubtotal - maxTxDiscount;
    const earnedPoints = Math.floor(grandTotal / 10000);

    return {
      items: processedItems,
      originalSubtotal,
      itemDiscountsTotal: totalItemsDiscount,
      transactionDiscount: appliedTxDiscount,
      transactionDiscountAmount: maxTxDiscount,
      totalDiscount,
      grandTotal,
      earnedPoints,
    };
  },
}));
