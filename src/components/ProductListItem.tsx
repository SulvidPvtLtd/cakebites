import Colors from '@constants/Colors';
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { ProductType } from '../types';

export const defaultPizzaImage =
  'https://notjustdev-dummy.s3.us-east-2.amazonaws.com/food/peperoni.png';

/**
 * Layout constants
 */
const GAP = 16;
const IMAGE_RATIO = 1;
const CARD_TEXT_HEIGHT = 72;

/**
 * Type-safe image sanitizer
 */
const sanitizeImageUrl = (url?: string | null): string => {
  if (typeof url !== 'string') return defaultPizzaImage;

  const trimmed = url.trim();
  if (!trimmed.startsWith('https://')) return defaultPizzaImage;

  return trimmed;
};

type ProductListItemProps = {
  product: ProductType;
  numColumns: number;
};

const ProductListItem = ({ product, numColumns }: ProductListItemProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const imageUri = sanitizeImageUrl(product.image);

  const maxWidth = `${100 / numColumns}%` as const;

  return (
    <View
      style={[
        styles.itemWrapper,
        { maxWidth },
      ]}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>


        <View style={styles.textContainer}>
          <Text
            style={[styles.title, { color: theme.textPrimary }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {product.name}
          </Text>

          <Text style={[styles.price, { color: theme.tint }]}>
            ${product.price}
          </Text>
        </View>
      </View>
    </View>
  );
};


export default ProductListItem;

const styles = StyleSheet.create({
  itemWrapper: {
    flex: 1,
    padding: GAP / 2,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  imageContainer: {
    padding: 5,   // ← gap from card border
  },
  image: {
    width: '100%',
    aspectRatio: 1,
  },
  textContainer: {
    height: 72,
    padding: 12,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
  },
});
