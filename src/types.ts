// Helper types for the database schema. 
// These types are used in the Supabase client and throughout the app to ensure type safety when working with data from the database.
/**********************************
  Step 1: Load the database type definition
  IMPORT the Database type structure from "database.types"

  Step 2: Create a generic helper type for tables
  DEFINE a type called Tables<T>

  T must be one of the table names inside Database.public.Tables

  FOR the given table name T:
      GET the "Row" type of that table
      (i.e. the structure of a single record in that table)

  RETURN that row structure as the type

  Meaning in words: “If I give you a table name, give me the TypeScript type of one row in that table.”

*/

import type { Tables as SupabaseTables } from "./database.types";
export type {
  Database,
  Enums,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./database.types";

// project-defined helper (replaced by generated helpers from src/database.types)
// export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
// project-defined helper (replaced by generated helpers from src/database.types)
// export type Enums<T extends keyof Database["public"]["Enums"]> =  Database["public"]["Enums"][T];

// export type Product = {
//   id: number;
//   image: string | null;
//   name: string;
//   price: number;
// };

export type ProductSize = "S" | "M" | "L" | "XL";

export type CartItem = {
  id: string;
  product: SupabaseTables<"products">;
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

// project-defined Order type (replaced with Supabase table row type)
// export type Order = {
//   id: number;
//   created_at: string;
//   total: number;
//   user_id: string;
//   status: OrderStatus;
//   order_items?: OrderItem[];
// };
export type Order = SupabaseTables<"orders"> & {
  order_items?: OrderItem[];
};

export type OrderItem = {
  id: number;
  product_id: number;
  // Supabase full row requires fields (like created_at) that mock assets don't include.
  products: Pick<
    SupabaseTables<"products">, "id" | "image" | "name" | "price" | "description"
  >; // Include only fields used by order UIs
  order_id: number;
  size: ProductSize;
  quantity: number;
};

// project-defined type (replaced with Supabase table row type)
// export type Profile = {
//   id: string;
//   group: string;
// };
export type Profile = SupabaseTables<"profiles">;
