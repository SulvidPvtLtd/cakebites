import { supabase } from "@/src/lib/supabase";
import type {
    Tables,
    TablesInsert,
} from "@/src/database.types";
import type { OrderStatus as AppOrderStatus } from "@/src/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/src/providers/AuthProvider";

type OrderRow = Tables<'orders'>;
type OrderItemRow = Tables<'order_items'>;
type ProductRow = Tables<'products'>;

export type OrderDetailsRow = OrderRow & {
    profiles: Pick<Tables<'profiles'>, 'id' | 'email' | 'mobile_number'> | null;
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
                .select('*, profiles!orders_user_id_fkey(id, email, mobile_number), order_items(*, products(*))')
                .eq('id', orderId)
                .single();
            if (error) {
                throw new Error(error.message);
            }
            return data as OrderDetailsRow;
        }
    });
};

const VALID_ORDER_STATUSES = new Set([
    "New",
    "Cooking",
    "Delivering",
    "Delivered",
    "Cancelled",
]);

type InsertOrderInput = Pick<
    TablesInsert<"orders">,
    "total" | "status" | "delivery_option"
>;
type InsertOrderItemsInput = Array<
    Pick<TablesInsert<"order_items">, "order_id" | "product_id" | "quantity" | "size">
>;
type OrderStatus = AppOrderStatus;

const ORDER_STATUS_FLOW: readonly OrderStatus[] = [
    "New",
    "Cooking",
    "Delivering",
    "Delivered",
    "Cancelled",
];

const TERMINAL_STATUSES = new Set<OrderStatus>(["Delivered", "Cancelled"]);

const normalizeOrderStatus = (status: unknown): OrderStatus | null => {
    if (typeof status !== "string") return null;
    const normalized = status.trim().toLowerCase();

    switch (normalized) {
        case "new":
            return "New";
        case "cooking":
            return "Cooking";
        case "delivering":
            return "Delivering";
        case "delivered":
            return "Delivered";
        case "cancelled":
            return "Cancelled";
        default:
            return null;
    }
};

const canTransitionOrderStatus = (
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
) => {
    if (currentStatus === nextStatus) return false;
    if (TERMINAL_STATUSES.has(currentStatus)) return false;

    if (nextStatus === "Cancelled") {
        return (
            currentStatus === "New" ||
            currentStatus === "Cooking" ||
            currentStatus === "Delivering"
        );
    }

    const currentIndex = ORDER_STATUS_FLOW.indexOf(currentStatus);
    const nextIndex = ORDER_STATUS_FLOW.indexOf(nextStatus);
    if (currentIndex === -1 || nextIndex === -1) return false;

    // Strictly forward one step (New -> Cooking -> Delivering -> Delivered).
    return nextIndex === currentIndex + 1;
};

export const useInsertOrder = () =>{
    const queryClient = useQueryClient();
    const {session} = useAuth();
    const userId = session?.user.id;

    return useMutation<OrderRow, Error, InsertOrderInput>({
        async mutationFn(input) {
            if (!userId) {
                throw new Error("You must be signed in to place an order.");
            }

            const total = Number(input.total);
            if (!Number.isFinite(total) || total < 0) {
                throw new Error("Invalid order total.");
            }

            const status =
                typeof input.status === "string" && VALID_ORDER_STATUSES.has(input.status)
                    ? input.status
                    : "New";

            const payload: TablesInsert<"orders"> = {
                total,
                status,
                user_id: userId,
                delivery_option: input.delivery_option === "No" ? "No" : "Yes",
            };

            const { data: newOrder, error } = await supabase
                .from('orders')
                .insert(payload)
                .select()
                .single();
            if (error) {
                throw new Error(error.message);
            }
            if (!newOrder) {
                throw new Error("Order was not created.");
            }
            return newOrder;
        },
        onSuccess: async (newOrder) => {
            await queryClient.invalidateQueries({ queryKey: ['orders'] });
            await queryClient.invalidateQueries({ queryKey: ['orders', { userId }] });
            if (newOrder?.id) {
                await queryClient.invalidateQueries({ queryKey: ['order', newOrder.id] });
            }
        },
        onError(error) {
            console.log(error);
        }
    })
};

export const useInsertOrderItems = () => {
    const queryClient = useQueryClient();

    return useMutation<OrderItemRow[], Error, InsertOrderItemsInput>({
        async mutationFn(items) {
            if (!Array.isArray(items) || items.length === 0) {
                throw new Error("No order items to insert.");
            }

            const payload = items
                .map((item) => ({
                    order_id: item.order_id,
                    product_id: item.product_id,
                    quantity: Number(item.quantity ?? 0),
                    size: item.size,
                }))
                .filter(
                    (item) =>
                        Number.isFinite(item.order_id) &&
                        item.order_id > 0 &&
                        Number.isFinite(item.product_id) &&
                        item.product_id > 0 &&
                        Number.isFinite(item.quantity) &&
                        item.quantity > 0 &&
                        typeof item.size === "string" &&
                        item.size.length > 0,
                );

            if (payload.length === 0) {
                throw new Error("Order items payload is invalid.");
            }

            const { data, error } = await supabase
                .from("order_items")
                .insert(payload)
                .select();

            if (error) {
                throw new Error(error.message);
            }

            return data ?? [];
        },
        async onSuccess(insertedItems) {
            const orderIds = [...new Set(insertedItems.map((item) => item.order_id))];
            await Promise.all(
                orderIds.map((orderId) =>
                    queryClient.invalidateQueries({ queryKey: ["order", orderId] }),
                ),
            );
        },
        onError(error) {
            console.log(error);
        },
    });
};

export const useDeleteOrder = () => {
    const queryClient = useQueryClient();
    const { session } = useAuth();
    const userId = session?.user.id;

    return useMutation<void, Error, number>({
        async mutationFn(orderId) {
            const parsedOrderId = Number(orderId);
            if (!Number.isFinite(parsedOrderId) || parsedOrderId <= 0) {
                throw new Error("Invalid order id.");
            }

            const { error } = await supabase
                .from("orders")
                .delete()
                .eq("id", parsedOrderId);

            if (error) {
                throw new Error(error.message);
            }
        },
        onSuccess: async (_data, deletedOrderId) => {
            await queryClient.invalidateQueries({ queryKey: ["orders"] });
            await queryClient.invalidateQueries({ queryKey: ["orders", { userId }] });
            await queryClient.invalidateQueries({ queryKey: ["order", deletedOrderId] });
        },
        onError(error) {
            console.log(error);
        },
    });
};

export const useUpdateOrderStatus = () => {
    const queryClient = useQueryClient();
    const { session } = useAuth();
    const userId = session?.user.id;

    return useMutation<
        OrderRow,
        Error,
        { orderId: number; currentStatus: string; nextStatus: OrderStatus }
    >({
        async mutationFn({ orderId, currentStatus, nextStatus }) {
            if (!Number.isFinite(orderId) || orderId <= 0) {
                throw new Error("Invalid order id.");
            }

            const normalizedCurrentStatus = normalizeOrderStatus(currentStatus);
            const normalizedNextStatus = normalizeOrderStatus(nextStatus);

            if (!normalizedCurrentStatus || !normalizedNextStatus) {
                throw new Error("Invalid order status.");
            }

            if (!canTransitionOrderStatus(normalizedCurrentStatus, normalizedNextStatus)) {
                throw new Error(
                    `Invalid status transition: ${normalizedCurrentStatus} -> ${normalizedNextStatus}.`,
                );
            }

            const { data, error } = await supabase
                .from("orders")
                .update({ status: normalizedNextStatus })
                .eq("id", orderId)
                .eq("status", currentStatus)
                .select("*")
                .single();

            if (error) {
                throw new Error(error.message);
            }

            return data;
        },
        onSuccess: async (updatedOrder) => {
            await queryClient.invalidateQueries({ queryKey: ["orders"] });
            await queryClient.invalidateQueries({ queryKey: ["orders", { userId }] });
            await queryClient.invalidateQueries({ queryKey: ["order", updatedOrder.id] });
        },
        onError(error) {
            console.log(error);
        },
    });
};
