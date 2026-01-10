import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, Redirect } from 'expo-router';
import { useMemo } from 'react';

import products from '@/assets/data/products';
import { defaultPizzaImage } from '@/src/components/ProductListItem';

/**
 * Route params MUST be declared at top level
 */
type ProductDetailsParams = {
  id?: string;
};

const sizes = ['S', 'M', 'L','XL'];

const ProductDetailsScreen = () => {
  const params = useLocalSearchParams<ProductDetailsParams>();

  const productId = useMemo(() => {
    if (!params.id) return null;

    const parsed = Number(params.id);
    if (Number.isNaN(parsed) || parsed <= 0) return null;

    return parsed;
  }, [params.id]);

  // Guard invalid IDs
  if (!productId) {
    return <Redirect href="/(tabs)/menu" />;
  }

  const product = useMemo(
    () => products.find((p) => p.id === productId),
    [productId]
  );

  if (!product) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.infoText}>Loading product…</Text>
      </View>
    );
  }

  const imageSource =
    typeof product.image === 'string' && product.image.length > 0
      ? { uri: product.image }
      : { uri: defaultPizzaImage };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: product.name ?? 'Product',
          headerBackTitle: 'Back',
        }}
      />
      
      <Image source={imageSource} style={styles.image} />

      <View style={styles.content}>        
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.price}>${product.price.toFixed(2)}</Text>
        
        <Text> Select size </Text>
        <View style={styles.sizesParentComponent}>
          {sizes.map((size) => (
            <View style={styles.sizeArray} key={size}>
              <Text style={styles.sizeText}> {size} </Text>
            </View>
          ))}
        </View>

        <Text style={styles.description}>
          {product.description ?? 'No description available.'}
        </Text>
        
      </View>
      
    </View>
  );
};

export default ProductDetailsScreen;

const styles = StyleSheet.create({
  
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding : 10,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: 15,
    color: '#444',
    lineHeight: 20,
  },
  infoText: {
    marginTop: 12,
    color: '#666',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    resizeMode: 'contain',
  },
  content: {
    padding: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: '500',
    color: '#ff7a00',
    marginBottom: 12,
  },  
  sizesParentComponent: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',     
    marginVertical: 10 
  },
  sizeArray: { 
    backgroundColor: 'gainsboro', 
    width: 50, 
    aspectRatio: 1,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeText: { 
    fontSize: 20, 
    color: '#333',
    fontWeight: '500',
  },
});
