import { useProductList } from '@/src/api/products';
import ProductListItem from '@components/ProductListItem';
import { ActivityIndicator, FlatList, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const GAP = 16;
const NUM_COLUMNS = 2;

export default function MenuScreen() {

  const { data: products, error, isLoading } = useProductList();
  
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
