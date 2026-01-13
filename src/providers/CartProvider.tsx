// src/providers/CartProvider.tsx

import { CartItem, Product, ProductSize } from '@/src/types';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

/* ---------------- Types ---------------- */

type CartContextType = {
  items: CartItem[];
  addItem: (product: Product, size: ProductSize) => void;
  removeItem: (productId: number, size: ProductSize) => void;
  updateQuantity: (productId: number,size: ProductSize,quantity: number) => void;
  clearCart: () => void;
};

/* ---------------- Context ---------------- */

const CartContext = createContext<CartContextType | null>(null);

/* ---------------- Utils ---------------- */

/**
 * Deterministic cart item ID.
 * Stable across sessions and API sync.
 */
const createCartItemId = (
  productId: number,
  size: ProductSize
): string => {
  return `${productId}_${size}`;
};

const isValidProduct = (product: Product): boolean => {
  return (
    typeof product === 'object' &&
    typeof product.id === 'number' &&
    product.id > 0 &&
    typeof product.name === 'string' &&
    typeof product.price === 'number' &&
    product.price >= 0
  );
};

/* ---------------- Provider ---------------- */

const CartProvider = ({ children }: PropsWithChildren) => {
  const [items, setItems] = useState<CartItem[]>([]);

  /* ---------- Actions ---------- */

  const addItem = useCallback(
    (product: Product, size: ProductSize) => {
      if (!isValidProduct(product)) {
        if (__DEV__) {
          console.warn('Invalid product passed to addItem');
        }
        return;
      }

      const productId = product.id;
      const cartItemId = createCartItemId(productId, size);

      setItems((current) => {
        const existing = current.find(
          (item) => item.id === cartItemId
        );

        if (existing) {
          return current.map((item) =>
            item.id === cartItemId
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }

        const newItem: CartItem = {
          id: cartItemId,
          product,
          product_id: productId,
          size,
          quantity: 1,
        };

        return [...current, newItem];
      });
    },
    []
  );

  const removeItem = useCallback(
    (productId: number, size: ProductSize) => {
      const cartItemId = createCartItemId(productId, size);

      setItems((current) =>
        current.filter((item) => item.id !== cartItemId)
      );
    },
    []
  );

  const updateQuantity = useCallback(
    (
      productId: number,
      size: ProductSize,
      quantity: number
    ) => {
      if (quantity <= 0) {
        removeItem(productId, size);
        return;
      }

      const cartItemId = createCartItemId(productId, size);

      setItems((current) =>
        current.map((item) =>
          item.id === cartItemId
            ? { ...item, quantity }
            : item
        )
      );
    },
    [removeItem]
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  /* ---------- Memoized value ---------- */

  const value = useMemo<CartContextType>(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [items, addItem, removeItem, updateQuantity, clearCart]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export default CartProvider;

/* ---------------- Hook ---------------- */

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      'useCart must be used within a CartProvider'
    );
  }

  return context;
};
