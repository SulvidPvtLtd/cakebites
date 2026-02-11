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
import { useQuery } from "@tanstack/react-query";


// custom hook to fetch products from the database
export const useProductList = () => {
    return useQuery({
        // Define the object with some options.
        queryKey: ['products'], // The key to identify the query.
        queryFn: async () => {
        const { data, error } = await supabase.from('products').select('*');  
        if (error) {
            //  console.error('Error fetching products:', error);
            throw new Error(error.message);
        }
        return data;
        }

    });
};


  // useEffect(() => {
  //   const fetchProducts = async () => {
  //     // Simulate an API call to fetch products
  //     const { data, error } = await supabase.from('products').select('*');
  //     console.log('Fetched products:', data);
  //   };
  //   fetchProducts();
  // }, []);
