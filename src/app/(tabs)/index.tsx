import products from '@assets/data/products';
import ProductListItem from '@components/ProductListItem';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MenuScreen() {  

  return (
    <SafeAreaView >
      
      <ProductListItem product={products[5]} />
      <ProductListItem product={products[0]} />
      
    </SafeAreaView>
  );
};






/*return (
    <SafeAreaView >
      
      <ProductListItem product={products[5]} />
      <ProductListItem product={products[0]} />
      
      { <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      /> }
    </SafeAreaView>
  );*/