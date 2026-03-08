import { useAdminProductList } from '@/src/api/products';
import ProductListItem from '@components/ProductListItem';
import { FlatList, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LoadingState from '@/src/components/LoadingState';

const GAP = 16;
const NUM_COLUMNS = 2;

export default function MenuScreen() {

  const { data: products, error, isLoading } = useAdminProductList();
  const sortedProducts = [...(products ?? [])].sort((a, b) => {
    const aOut = !a.is_active || !a.in_stock;
    const bOut = !b.is_active || !b.in_stock;
    if (aOut !== bOut) {
      return aOut ? -1 : 1;
    }
    return b.id - a.id;
  });
  
    if(isLoading) {
      return (
        <LoadingState
          title="Loading products"
          message="Preparing the catalog for the admin view."
        />
      );
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
        data={sortedProducts}
        renderItem={({ item }) => (
          <ProductListItem
            product={item}
            numColumns={NUM_COLUMNS}
            showAdminStockState
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
