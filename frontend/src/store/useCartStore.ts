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

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  orderType: 'dine_in' | 'take_away';
  tableNumber: string;
  addItem: (product: Product) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  setOrderType: (type: 'dine_in' | 'take_away') => void;
  setTableNumber: (tableNumber: string) => void;
  getSubtotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  orderType: 'dine_in',
  tableNumber: '',

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
    set({ items: [], orderType: 'dine_in', tableNumber: '' });
  },

  setOrderType: (orderType) => {
    set({ orderType, tableNumber: orderType === 'take_away' ? '' : get().tableNumber });
  },

  setTableNumber: (tableNumber) => {
    set({ tableNumber });
  },

  getSubtotal: () => {
    return get().items.reduce(
      (sum, item) => sum + parseFloat(item.product.sell_price) * item.quantity,
      0
    );
  },
}));
