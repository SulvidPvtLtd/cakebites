import Colors from '@constants/Colors';
import { Link } from 'expo-router';
import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
// import { Product } from '../types'; - we used this because we had not exported the Tables type from database.types,
import { Tables } from '../database.types';

export const defaultPizzaImage =
  'https://notjustdev-dummy.s3.us-east-2.amazonaws.com/food/peperoni.png';

const GAP = 16;
const IMAGE_RATIO = 1;
const CARD_TEXT_HEIGHT = 84;

const sanitizeImageUrl = (url?: string | null): string => {
  if (typeof url !== 'string') return defaultPizzaImage;
  return url.startsWith('https://') ? url : defaultPizzaImage;
};

const truncateTitle = (title: string, maxLength = 16): string =>
  title.length <= maxLength ? title : title.slice(0, maxLength) + '...';

type ProductListItemProps = {
  // product: Product; - we used this because we had not exported the Tables type from database.types, 
  // but now we can be more specific and use the exact type from the database schema for better type safety.
  product: Tables<'products'>;
  numColumns: number;
  showAdminStockState?: boolean;
};

const ProductListItem = ({
  product,
  numColumns,
  showAdminStockState = false,
}: ProductListItemProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isOutOfStock = !product.is_active || !product.in_stock;

  return (
    <View style={[styles.itemWrapper, { width: `${100 / numColumns}%` }]}>
      {/* ✅ RELATIVE PATH — stays in (admin) or (user) */}
      <Link
        href={{
          pathname: './menu/[id]',
          params: { id: product.id },
        }}
        asChild
      >
        <Pressable style={styles.shadowWrapper}>
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: sanitizeImageUrl(product.image) }}
                style={styles.image}
                resizeMode="contain"
              />
            </View>

            <View style={styles.textContainer}>
              <Text
                style={[styles.title, { color: theme.textPrimary }]}
                numberOfLines={1}
              >
                {truncateTitle(product.name)}
              </Text>

              <View style={styles.bottomSection}>
                <Text style={[styles.price, { color: theme.tint }]}>
                  ${product.price}
                </Text>

                {showAdminStockState && isOutOfStock && (
                  <Text style={styles.stockBadge}>Out of stock</Text>
                )}

                <Text style={styles.linkText}>Go to details</Text>
              </View>
            </View>
          </View>
        </Pressable>
      </Link>
    </View>
  );
};

export default ProductListItem;



const styles = StyleSheet.create({
  itemWrapper: {
    paddingHorizontal: GAP / 2,
    marginBottom: GAP, // ✅ REAL separation between cards
  },

  shadowWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },

  card: {
    borderRadius: 16,
    overflow: 'hidden', // shadow lives outside
  },

  imageContainer: {
    padding: 8,
  },

  image: {
    width: '100%',
    aspectRatio: IMAGE_RATIO,
  },

  textContainer: {
    height: CARD_TEXT_HEIGHT,
    paddingTop: 6,
    paddingHorizontal: 12,
    paddingBottom: 14,
  },

  title: {
    fontSize: 15,
    fontWeight: '600',
  },

  bottomSection: {
    marginTop: 'auto',
  },

  price: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },

  linkText: {
    fontSize: 14,
    color: 'orange',
    textDecorationLine: 'underline',
  },

  stockBadge: {
    alignSelf: 'flex-start',
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#D32F2F',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
