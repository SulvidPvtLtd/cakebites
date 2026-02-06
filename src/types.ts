export type Product = {
  id: number;
  image: string | null;
  name: string;
  price: number;
};

export type ProductSize = "S" | "M" | "L" | "XL";

export type CartItem = {
  id: string;
  product: Product;
  product_id: number;
  size: ProductSize;
  quantity: number;
};

export type OrderStatus =
  | "New"
  | "Cooking"
  | "Delivering"
  | "Delivered"
  | "Cancelled";

export const OrderStatusList: OrderStatus[] = [
  "New",
  "Cooking",
  "Delivering",
  "Delivered",
  "Cancelled",
];

export type Order = {
  id: number;
  created_at: string;
  total: number;
  user_id: string;
  status: OrderStatus;
  order_items?: OrderItem[];
};

export type OrderItem = {
  id: number;
  product_id: number;
  products: Product;
  order_id: number;
  size: ProductSize;
  quantity: number;
};

export type Profile = {
  id: string;
  group: string;
};
