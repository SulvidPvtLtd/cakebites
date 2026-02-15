import { supabase } from "@/src/lib/supabase";
import type {
    Tables,
    TablesInsert,
    TablesUpdate,
} from "@/src/database.types";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/src/providers/AuthProvider";

type OrderRow = Tables<'orders'>;

export const useAdminOrderList = ({archived = false}) => {

    const statuses = archived ? ['Cancelled', 'Delivered'] : ['New','Cooking','Delivering'];

    return useQuery<OrderRow[]>({
        queryKey: ['orders', { archived }],
        queryFn: async () => {
        const { data, error } = await supabase.from('orders').select('*').in('status', statuses);  
        if (error) {
            //  console.error('Error fetching orders:', error);
            throw new Error(error.message);
        }
        return data ?? [];
        }
    });
};


export const useMyOrderList = () => {

    // Since this is a custom hook. we have access to other hooks, 
    // such as the auth hook to get the current user id and then fetch only the orders for that user. 
    // For simplicity, we are fetching all orders here.
    const {session} = useAuth();
    const id = session?.user.id;

    return useQuery<OrderRow[]>({
        queryKey: ['orders', { userId: id }],
        enabled: !!id,
        queryFn: async () => {
            if (!id) return [];
        const { data, error } = await supabase.from('orders').select('*').eq('user_id', id);  
        if (error) {
            //  console.error('Error fetching orders:', error);
            throw new Error(error.message);
        }
        return data ?? [];
        }

    });
};
