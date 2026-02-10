import { supabase } from '@/src/lib/supabase';
import products from '@assets/data/products';
import ProductListItem from '@components/ProductListItem';
import React, { useEffect } from 'react';
import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const GAP = 16;
const NUM_COLUMNS = 2;

export default function MenuScreen() {

  useEffect(() => {
    const fetchProducts = async () => {
      // Simulate fetching products from an API
      const {data, error} = await supabase.from("products").select("*");
      
      console.log(error);
      console.log(data);
      
    };   

    fetchProducts();
    
  }, []); // useEffect run once on mount


  return (
    <SafeAreaView
      style={{ flex: 1 }}
      edges={['left', 'right']} // prevents top & bottom gaps
    >
      <FlatList
        key={`columns-${NUM_COLUMNS}`}
        data={products}
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
