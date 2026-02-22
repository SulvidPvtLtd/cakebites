// src/providers/CartProvider.tsx

import { CartItem, ProductSize } from "@/src/types";
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  useDeleteOrder,
  useInsertOrder,
  useInsertOrderItems,
} from "../api/orders";
import { Tables } from "../database.types";

type Product = Tables<"products">;

type CartType = {
  items: CartItem[];
  addItem: (product: Product, size: ProductSize) => void;
  updateQuantity: ( productId: number, size: ProductSize, quantity: number ) => void;
  removeItem: (productId: number, size: ProductSize) => void;
  clearCart: () => void;
  total: number;
  checkout: () => Promise<number>;
};

const CartContext = createContext<CartType | undefined>(undefined);

const createCartItemId = (productId: number, size: ProductSize) =>
  `${productId}_${size}`;

const isValidProduct = (product: unknown): product is Product => {
  return (
    typeof product === "object" &&
    product !== null &&
    typeof (product as Product).id === "number" &&
    typeof (product as Product).name === "string" &&
    typeof (product as Product).price === "number" &&
    (product as Product).price >= 0
  );
};

const sanitizeQuantity = (qty: number) =>
  Number.isFinite(qty) ? Math.max(1, Math.floor(qty)) : 1;

/* ---------------- Provider ---------------- */

export default function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { mutateAsync: insertOrder } = useInsertOrder();
  const { mutateAsync: insertOrderItems } = useInsertOrderItems();
  const { mutateAsync: deleteOrder } = useDeleteOrder();

  /* ---------- Derived (defensive) ---------- */

  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      if (!isValidProduct(item.product) || !Number.isFinite(item.quantity)) {
        return sum;
      }

      return sum + item.product.price * item.quantity;
    }, 0);
  }, [items]);

  /* ---------- Actions ---------- */

  const addItem = useCallback((product: Product, size: ProductSize) => {
    if (!isValidProduct(product)) {
      __DEV__ && console.warn("Invalid product passed to addItem");
      return;
    }

    const cartItemId = createCartItemId(product.id, size);

    setItems((current) => {
      const existing = current.find((it) => it.id === cartItemId);

      if (existing) {
        return current.map((it) =>
          it.id === cartItemId
            ? { ...it, quantity: sanitizeQuantity(it.quantity + 1) }
            : it,
        );
      }

      return [
        ...current,
        {
          id: cartItemId,
          product,
          product_id: product.id,
          size,
          quantity: 1,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((productId: number, size: ProductSize) => {
    const cartItemId = createCartItemId(productId, size);
    setItems((current) => current.filter((it) => it.id !== cartItemId));
  }, []);

  const updateQuantity = useCallback(
    (productId: number, size: ProductSize, quantity: number) => {
      if (!Number.isFinite(quantity)) return;

      if (quantity <= 0) {
        removeItem(productId, size);
        return;
      }

      const safeQty = sanitizeQuantity(quantity);
      const cartItemId = createCartItemId(productId, size);

      setItems((current) =>
        current.map((it) =>
          it.id === cartItemId ? { ...it, quantity: safeQty } : it,
        ),
      );
    },
    [removeItem],
  );

  const clearCart = useCallback(() => setItems([]), []);

  const checkout = useCallback(async () => {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Cart is empty.");
    }

    if (!Number.isFinite(total) || total <= 0) {
      throw new Error("Invalid cart total.");
    }

    const newOrder = await insertOrder({ total });
    if (!newOrder?.id) {
      throw new Error("Failed to create order.");
    }

    const orderItemsPayload = items.map((item) => ({
      order_id: newOrder.id,
      product_id: item.product_id,
      quantity: sanitizeQuantity(item.quantity),
      size: item.size,
    }));

    try {
      await insertOrderItems(orderItemsPayload);
    } catch (error) {
      try {
        await deleteOrder(newOrder.id);
      } catch {
        // Keep original checkout failure as the surfaced error.
      }
      throw error;
    }
    clearCart();
    return newOrder.id;
  }, [items, total, insertOrder, insertOrderItems, deleteOrder, clearCart]);

  /* ---------- Value ---------- */

  const value = useMemo(
    () => ({
      items,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      total,
      checkout,
    }),
    [items, addItem, updateQuantity, removeItem, clearCart, total, checkout],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/* ---------------- Hook ---------------- */

export const useCart = (): CartType => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
};
