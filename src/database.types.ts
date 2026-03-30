export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      delivery_settings: {
        Row: {
          collection_address: string | null
          delivery_rate: number
          fulfillment_location_id: number | null
          id: number
          updated_at: string
        }
        Insert: {
          collection_address?: string | null
          delivery_rate?: number
          fulfillment_location_id?: number | null
          id?: number
          updated_at?: string
        }
        Update: {
          collection_address?: string | null
          delivery_rate?: number
          fulfillment_location_id?: number | null
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      inventory_locations: {
        Row: {
          address: string | null
          code: string
          created_at: string
          id: number
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          id?: number
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          id?: number
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_levels: {
        Row: {
          created_at: string
          id: number
          location_id: number
          on_hand: number
          product_id: number
          reserved: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          location_id: number
          on_hand?: number
          product_id: number
          reserved?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          location_id?: number
          on_hand?: number
          product_id?: number
          reserved?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_levels_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_levels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          delta_on_hand: number
          delta_reserved: number
          id: number
          location_id: number
          metadata: Json | null
          movement_type: string
          on_hand_after: number
          on_hand_before: number
          order_id: number | null
          product_id: number
          reason: string | null
          reserved_after: number
          reserved_before: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delta_on_hand?: number
          delta_reserved?: number
          id?: number
          location_id: number
          metadata?: Json | null
          movement_type?: string
          on_hand_after: number
          on_hand_before: number
          order_id?: number | null
          product_id: number
          reason?: string | null
          reserved_after: number
          reserved_before: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delta_on_hand?: number
          delta_reserved?: number
          id?: number
          location_id?: number
          metadata?: Json | null
          movement_type?: string
          on_hand_after?: number
          on_hand_before?: number
          order_id?: number | null
          product_id?: number
          reason?: string | null
          reserved_after?: number
          reserved_before?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          available: number
          created_at: string
          id: number
          location_id: number
          metadata: Json | null
          note: string | null
          on_hand: number
          product_id: number
          reorder_point: number
          reserved: number
          resolved_at: string | null
          safety_stock: number
          severity: string
          status: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          available?: number
          created_at?: string
          id?: number
          location_id: number
          metadata?: Json | null
          note?: string | null
          on_hand?: number
          product_id: number
          reorder_point?: number
          reserved?: number
          resolved_at?: string | null
          safety_stock?: number
          severity?: string
          status?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          available?: number
          created_at?: string
          id?: number
          location_id?: number
          metadata?: Json | null
          note?: string | null
          on_hand?: number
          product_id?: number
          reorder_point?: number
          reserved?: number
          resolved_at?: string | null
          safety_stock?: number
          severity?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_alerts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: number
          order_id: number
          product_id: number
          quantity: number | null
          size: string
        }
        Insert: {
          created_at?: string
          id?: number
          order_id: number
          product_id: number
          quantity?: number | null
          size?: string
        }
        Update: {
          created_at?: string
          id?: number
          order_id?: number
          product_id?: number
          quantity?: number | null
          size?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          delivery_option: string
          id: number
          payment_gateway: string | null
          payment_transaction_id: string | null
          status: string
          total: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          delivery_option?: string
          id?: number
          payment_gateway?: string | null
          payment_transaction_id?: string | null
          status?: string
          total?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          delivery_option?: string
          id?: number
          payment_gateway?: string | null
          payment_transaction_id?: string | null
          status?: string
          total?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          gateway: string
          gateway_transaction_id: string | null
          id: string
          metadata: Json | null
          order_id: number | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          gateway: string
          gateway_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          order_id?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          gateway?: string
          gateway_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          order_id?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          created_at: string
          description: string | null
          id: number
          image: string | null
          in_stock: boolean
          is_active: boolean
          name: string
          price: number
          sku: string | null
          size_prices: Json
          track_inventory: boolean
          unit_cost: number
        }
        Insert: {
          barcode?: string | null
          created_at?: string
          description?: string | null
          id?: number
          image?: string | null
          in_stock?: boolean
          is_active?: boolean
          name: string
          price: number
          sku?: string | null
          size_prices?: Json
          track_inventory?: boolean
          unit_cost?: number
        }
        Update: {
          barcode?: string | null
          created_at?: string
          description?: string | null
          id?: number
          image?: string | null
          in_stock?: boolean
          is_active?: boolean
          name?: string
          price?: number
          sku?: string | null
          size_prices?: Json
          track_inventory?: boolean
          unit_cost?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          delivery_address: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          group: string
          id: string
          mobile_number: string | null
          surname: string | null
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          delivery_address?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          group?: string
          id: string
          mobile_number?: string | null
          surname?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          delivery_address?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          group?: string
          id?: string
          mobile_number?: string | null
          surname?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      reorder_rules: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          lead_time_days: number
          location_id: number
          product_id: number
          reorder_point: number
          safety_stock: number
          supplier_id: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          is_active?: boolean
          lead_time_days?: number
          location_id: number
          product_id: number
          reorder_point?: number
          safety_stock?: number
          supplier_id?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          is_active?: boolean
          lead_time_days?: number
          location_id?: number
          product_id?: number
          reorder_point?: number
          safety_stock?: number
          supplier_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reorder_rules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorder_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorder_rules_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: number
          is_active: boolean
          lead_time_days: number
          name: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: number
          is_active?: boolean
          lead_time_days?: number
          name: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: number
          is_active?: boolean
          lead_time_days?: number
          name?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          id: number
          product_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          product_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          product_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

