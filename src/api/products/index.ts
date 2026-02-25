/***
 * All logic for fetching products from the database will be here. This is a custom hook that can
 *  be used in any component to fetch products.
 * We are using react-query to manage the state of our data fetching. 
 * It provides a simple and efficient way to fetch, cache, and update data in our application.
 * The useQuery hook takes an object with some options. The queryKey is a unique key 
 * that identifies the query. The queryFn is a function that returns a promise. 
 * It is called when the query is executed.
 * In our case, the queryFn is an async function that uses the supabase client to fetch products 
 * from the 'products' table. If there is an error, we throw an error with the message from 
 * the supabase error object.
 * If the data is fetched successfully, we return the data.
 */
import { supabase } from "@/src/lib/supabase";
import type {
    Tables,
    TablesInsert,
    TablesUpdate,
} from "@/src/database.types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type ProductRow = Tables<"products">;
type ProductInsert = TablesInsert<"products">;
type ProductUpdate = TablesUpdate<"products">;


// custom hook to fetch products from the database
export const useProductList = () => {
    return useQuery<ProductRow[]>({
        // Define the object with some options.
        queryKey: ['products'], // The key to identify the query.
        queryFn: async () => {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .eq('in_stock', true);
        if (error) {
            //  console.error('Error fetching products:', error);
            throw new Error(error.message);
        }
        return data ?? [];
        }

    });
};

export const useAdminProductList = () => {
    return useQuery<ProductRow[]>({
        queryKey: ['admin-products'],
        queryFn: async () => {
            const { data, error } = await supabase.from('products').select('*');
            if (error) {
                throw new Error(error.message);
            }
            return data ?? [];
        }
    });
};

export const useProduct = (id: number) => {
     return useQuery<ProductRow>({
        // Define the object with some options.
        queryKey: ['products', id], // The key to identify the query to the products with id = 1, =2,=3 etc.
        enabled: Number.isFinite(id) && id > 0,
        queryFn: async () => {
        const { data, error } = await supabase
            .from('products')
            .select('*')  // select all columns from the products table
            .eq('id', id) // filter by id
            .single();   // return a single row instead of an array
        if (error) {
            //  console.error('Error fetching products:', error);
            throw new Error(error.message);
        }
        return data;
        }

    });
};

export const useInsertProduct = () =>{
    const queryClient = useQueryClient();
    return useMutation({
        // project-defined payload type (replaced by generated Supabase Insert type)
        // async mutationFn(data: { image?: string | null; name: string; price: number; description?: string | null }) {
        async mutationFn(data: Pick<ProductInsert, "image" | "name" | "price" | "description" | "in_stock">) {
        const { data: newProduct, error } =    await supabase.from('products').insert({                
                image: data.image ?? null,
                name: data.name,
                price: data.price,
                description: data.description ?? null,
                in_stock: data.in_stock ?? true,
                is_active: true,
            }).select().single();
            if (error) {
                //  console.error('Error fetching products:', error);
                throw new Error(error.message);
            }
            return newProduct;
        },
        onSuccess: async (newProduct) => {
            await queryClient.invalidateQueries({ queryKey: ['products'] });
            await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            if (newProduct?.id) {
                await queryClient.invalidateQueries({ queryKey: ['products', newProduct.id] });
            }
        }
    })
};

export const useUpdateProduct = () =>{
    const queryClient = useQueryClient();
    return useMutation({
        // project-defined payload type (replaced by generated Supabase Update type)
        // async mutationFn(data: { id: number; image?: string | null; name: string; price: number; description?: string | null }) {
        async mutationFn(data: { id: ProductRow["id"] } & Pick<ProductUpdate, "image" | "name" | "price" | "description" | "in_stock">) {
        const { data: updatedProduct, error } =    await supabase.from('products').update({                
                image: data.image ?? null,
                name: data.name,
                price: data.price,
                description: data.description ?? null,
                in_stock: data.in_stock,
                is_active: true,
            }).eq('id', data.id).select().single();
            if (error) {
                throw new Error(error.message);
            }
            return updatedProduct;
        },
        onSuccess: async (updatedProduct) => {
            await queryClient.invalidateQueries({ queryKey: ['products'] });
            await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            if (updatedProduct?.id) {
                await queryClient.invalidateQueries({ queryKey: ['products', updatedProduct.id] });
            }
        }
    })
};

export const useDeleteProduct = () => {
    const queryClient = useQueryClient();
    return useMutation({
        async mutationFn(id: number) {
            const { error } = await supabase
                .from('products')
                .update({
                    is_active: false,
                    in_stock: false,
                } satisfies Pick<ProductUpdate, 'is_active' | 'in_stock'>)
                .eq('id', id);
            if (error) {
                throw new Error(error.message);
            }
            return id;
        },
        onSuccess: async (deletedProductId) => {
            await queryClient.invalidateQueries({ queryKey: ['products'] });
            await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            await queryClient.invalidateQueries({ queryKey: ['products', deletedProductId] });
        }
    });
};
