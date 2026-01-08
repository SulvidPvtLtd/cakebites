import React from 'react';
import {
    Image,
    StyleSheet,
    Text,
    useColorScheme,
    View
} from 'react-native';
import Colors from '../constants/Colors';

type Product = {
  id: string | number;
  name: string;
  price: number;
  image: string;
};

const ProductListItem: React.FC<{ product: Product }> = ({ product }) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light']; // Fallback to light if null

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Image source={{ uri: product.image }} style={styles.image} />
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {product.name}
        </Text>
        <Text style={[styles.price, { color: theme.tint }]}>
          ${product.price}
        </Text>
      </View>
    </View>
  );
};

export default ProductListItem;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
    gap: 16, // Space between cards (RN 0.71+)
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1, // Subtle border using theme.border
    // Shadow – works well on both light and dark
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
  },
  textContainer: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
  },
  
});