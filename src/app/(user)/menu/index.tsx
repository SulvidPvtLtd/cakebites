import ProductListItem from '@components/ProductListItem';
import React, { useEffect } from 'react';
import { ActivityIndicator, FlatList , Text} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProductList } from '@/src/api/products';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';


const GAP = 16;
const NUM_COLUMNS = 2;

export default function MenuScreen() {

  const { data: products, error, isLoading } = useProductList();
  const queryClient = useQueryClient();

  useEffect(() => {
    const productsChannel = supabase
      .channel('user-products-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'products' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['products'] });
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['products'] });
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'products' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['products'] });
        },
      )
      .subscribe();

    return () => {
      productsChannel.unsubscribe();
    };
  }, [queryClient]);

  if(isLoading) {
    return <ActivityIndicator size="large" color="midnightblue" />;  
  }

  if(error) {
    return <Text>Failed to return the product</Text>;
  };



  return (
    <SafeAreaView
      style={{ flex: 1 }}
      edges={['left', 'right']} // 🔥 prevents top & bottom gaps
    >
      <FlatList
        key={`columns-${NUM_COLUMNS}`}
        // data={products} // This is data from the device dummy data.
        data={products} // This is data from the supabase database.
        renderItem={({ item }) => (
          <ProductListItem
            product={item}
            numColumns={NUM_COLUMNS}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        numColumns={NUM_COLUMNS}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: GAP / 2, //  keep horizontal spacing
          paddingTop: 8,              //  minimal top spacing
          paddingBottom: 12,          //  tight spacing above tab bar
        }}
      />
    </SafeAreaView>
  );
}
