import products from '@assets/data/products';
import ProductListItem from '@components/ProductListItem';
import React from 'react';
import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const GAP = 16;
const NUM_COLUMNS = 3; // change to 3 safely

export default function MenuScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        key={`columns-${NUM_COLUMNS}`} // ← CRITICAL
        data={products}
        renderItem={({ item }) => <ProductListItem product={item} numColumns={NUM_COLUMNS} />}
        keyExtractor={(item) => item.id.toString()}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={{ padding: GAP / 2 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

