import { supabase } from "@/src/lib/supabase";
import type {
    Tables,
} from "@/src/database.types";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/src/providers/AuthProvider";

type OrderRow = Tables<'orders'>;
type OrderItemRow = Tables<'order_items'>;
type ProductRow = Tables<'products'>;

export type OrderDetailsRow = OrderRow & {
    order_items: Array<
        OrderItemRow & {
            products: ProductRow | null;
        }
    >;
};

export const useMyOrders = () => {
    const { session } = useAuth();
    const userId = session?.user.id;

    return useQuery<OrderRow[]>({
        queryKey: ['orders', { userId }],
        enabled: !!userId,
        queryFn: async () => {
            if (!userId) return [];
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (error) {
                throw new Error(error.message);
            }
            return data ?? [];
        }
    });
};

export const useOrderList = ({ archived = false }: { archived: boolean }) => {
    const statuses = archived ? ['Delivered'] : ['New', 'Cooking', 'Delivering'];

    return useQuery<OrderRow[]>({
        queryKey: ['orders', { archived }],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .in('status', statuses)
                .order('created_at', { ascending: false });
            if (error) {
                throw new Error(error.message);
            }
            return data ?? [];
        }
    });
};

export const useOrderDetails = (id?: number | string | null) => {
    const orderId = typeof id === "number" ? id : Number(id);
    const isValidOrderId = Number.isFinite(orderId) && orderId > 0;

    return useQuery<OrderDetailsRow>({
        queryKey: ['order', orderId],
        enabled: isValidOrderId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('orders')
                .select('*, order_items(*, products(*))')
                .eq('id', orderId)
                .single();
            if (error) {
                throw new Error(error.message);
            }
            return data as OrderDetailsRow;
        }
    });
};
