import Colors from '@constants/Colors';
import { Link } from 'expo-router';
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Pressable,
} from 'react-native';
import { ProductType } from '../types';

export const defaultPizzaImage =
  'https://notjustdev-dummy.s3.us-east-2.amazonaws.com/food/peperoni.png';

/**
 * Layout constants
 */
const GAP = 16;
const IMAGE_RATIO = 1;
const CARD_TEXT_HEIGHT = 84;

/**
 * Image sanitizer
 */
const sanitizeImageUrl = (url?: string | null): string => {
  if (typeof url !== 'string') return defaultPizzaImage;
  return url.startsWith('https://') ? url : defaultPizzaImage;
};

/**
 * Truncate long titles
 */
const truncateTitle = (title: string, maxLength = 16): string =>
  title.length <= maxLength ? title : title.slice(0, maxLength) + '...';

type ProductListItemProps = {
  product: ProductType;
  numColumns: number;
};

export default function ProductListItem({
  product,
  numColumns,
}: ProductListItemProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <View
      style={[
        styles.itemWrapper,
        { width: `${100 / numColumns}%` },
      ]}
    >
      <Link href={`/menu/${product.id}`} asChild>
        <Pressable style={styles.shadowWrapper}>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card },
            ]}
          >
            {/* Image */}
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: sanitizeImageUrl(product.image) }}
                style={styles.image}
                resizeMode="contain"
              />
            </View>

            {/* Text */}
            <View style={styles.textContainer}>
              <Text
                style={[
                  styles.title,
                  { color: theme.textPrimary },
                ]}
                numberOfLines={1}
              >
                {truncateTitle(product.name)}
              </Text>

              <View style={styles.bottomSection}>
                <Text
                  style={[
                    styles.price,
                    { color: theme.tint },
                  ]}
                >
                  ${product.price}
                </Text>

                <Text style={styles.linkText}>
                  Go to details
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      </Link>
    </View>
  );
}

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
});
