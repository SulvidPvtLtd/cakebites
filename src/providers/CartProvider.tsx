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
import { Tables } from "../database.types";

type Product = Tables<"products">;
type FulfillmentOption = "DELIVERY" | "COLLECTION";
export type CheckoutDraftItem = {
  product_id: number;
  size: ProductSize;
  quantity: number;
  unitPrice: number;
};

export type CheckoutDraft = {
  items: CheckoutDraftItem[];
  total: number;
  delivery_option: "Yes" | "No";
};

type CartType = {
  items: CartItem[];
  addItem: (product: Product, size: ProductSize, unitPrice: number) => void;
  updateQuantity: ( productId: number, size: ProductSize, quantity: number ) => void;
  removeItem: (productId: number, size: ProductSize) => void;
  clearCart: () => void;
  total: number;
  getCheckoutDraft: (deliveryFee?: number) => CheckoutDraft;
  fulfillmentOption: FulfillmentOption | null;
  hasAcceptedDeliveryTerms: boolean;
  setFulfillmentOption: (option: FulfillmentOption | null) => void;
  acceptDeliveryTerms: () => void;
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
const sanitizeUnitPrice = (price: number) =>
  Number.isFinite(price) ? Math.max(0, price) : 0;
/* ---------------- Provider ---------------- */

export default function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [fulfillmentOption, setFulfillmentOption] = useState<FulfillmentOption | null>(null);
  const [hasAcceptedDeliveryTerms, setHasAcceptedDeliveryTerms] = useState(false);

  /* ---------- Derived (defensive) ---------- */

  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      if (!isValidProduct(item.product) || !Number.isFinite(item.quantity)) {
        return sum;
      }

      return sum + sanitizeUnitPrice(item.unitPrice) * item.quantity;
    }, 0);
  }, [items]);

  /* ---------- Actions ---------- */

  const addItem = useCallback((product: Product, size: ProductSize, unitPrice: number) => {
    if (!isValidProduct(product)) {
      __DEV__ && console.warn("Invalid product passed to addItem");
      return;
    }
    const safeUnitPrice = sanitizeUnitPrice(unitPrice);

    const cartItemId = createCartItemId(product.id, size);

    setItems((current) => {
      const existing = current.find((it) => it.id === cartItemId);

      if (existing) {
        const updatedQuantity = sanitizeQuantity(existing.quantity + 1);
        return current.map((it) =>
          it.id === cartItemId
            ? {
                ...it,
                unitPrice: safeUnitPrice,
                quantity: updatedQuantity,
                totalPrice: safeUnitPrice * updatedQuantity,
              }
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
          unitPrice: safeUnitPrice,
          quantity: 1,
          totalPrice: safeUnitPrice,
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
        current.map((it) => {
          if (it.id !== cartItemId) return it;
          return {
            ...it,
            quantity: safeQty,
            totalPrice: sanitizeUnitPrice(it.unitPrice) * safeQty,
          };
        }),
      );
    },
    [removeItem],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    setFulfillmentOption(null);
    setHasAcceptedDeliveryTerms(false);
  }, []);

  const acceptDeliveryTerms = useCallback(() => {
    setHasAcceptedDeliveryTerms(true);
  }, []);

  const getCheckoutDraft = useCallback((deliveryFee = 0) => {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Cart is empty.");
    }

    if (!Number.isFinite(total) || total <= 0) {
      throw new Error("Invalid cart total.");
    }

    if (!fulfillmentOption) {
      throw new Error("Please choose delivery or collection before checkout.");
    }

    const safeDeliveryFee =
      fulfillmentOption === "DELIVERY" && Number.isFinite(deliveryFee) && deliveryFee > 0
        ? deliveryFee
        : 0;
    return {
      total: total + safeDeliveryFee,
      delivery_option: (fulfillmentOption === "DELIVERY" ? "Yes" : "No") as "Yes" | "No",
      items: items.map((item) => ({
        product_id: item.product_id,
        quantity: sanitizeQuantity(item.quantity),
        size: item.size,
        unitPrice: sanitizeUnitPrice(item.unitPrice),
      })),
    };
  }, [items, total, fulfillmentOption]);

  /* ---------- Value ---------- */

  const value = useMemo(
    () => ({
      items,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      total,
      getCheckoutDraft,
      fulfillmentOption,
      hasAcceptedDeliveryTerms,
      setFulfillmentOption,
      acceptDeliveryTerms,
    }),
    [
      items,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      total,
      getCheckoutDraft,
      fulfillmentOption,
      hasAcceptedDeliveryTerms,
      setFulfillmentOption,
      acceptDeliveryTerms,
    ],
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
