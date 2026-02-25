import type { Tables } from "@/src/database.types";
import type { ProductSize } from "@/src/types";

const SIZE_PRICE_PREFIX = "[[SIZE_PRICES]]";

export const PRODUCT_SIZES: readonly ProductSize[] = ["S", "M", "L", "XL"];

export type SizePriceMap = Record<ProductSize, number>;

const isValidPrice = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

export const getDefaultSizePriceMap = (basePrice: number): SizePriceMap => ({
  S: basePrice,
  M: basePrice,
  L: basePrice,
  XL: basePrice,
});

export const normalizeSizePriceMap = (
  incoming: Partial<Record<ProductSize, unknown>>,
  fallbackBasePrice: number,
): SizePriceMap => {
  const fallback = getDefaultSizePriceMap(fallbackBasePrice);
  return {
    S: isValidPrice(incoming.S) ? incoming.S : fallback.S,
    M: isValidPrice(incoming.M) ? incoming.M : fallback.M,
    L: isValidPrice(incoming.L) ? incoming.L : fallback.L,
    XL: isValidPrice(incoming.XL) ? incoming.XL : fallback.XL,
  };
};

const parsePriceMetadata = (
  description: string | null | undefined,
): Partial<Record<ProductSize, unknown>> | null => {
  if (!description) return null;
  const firstLine = description.split("\n")[0]?.trim() ?? "";
  if (!firstLine.startsWith(SIZE_PRICE_PREFIX)) return null;

  const jsonPart = firstLine.slice(SIZE_PRICE_PREFIX.length);
  try {
    return JSON.parse(jsonPart) as Partial<Record<ProductSize, unknown>>;
  } catch {
    return null;
  }
};

export const getVisibleProductDescription = (
  description: string | null | undefined,
): string => {
  if (!description) return "";
  const lines = description.split("\n");
  const firstLine = lines[0]?.trim() ?? "";
  if (!firstLine.startsWith(SIZE_PRICE_PREFIX)) {
    return description.trim();
  }
  return lines.slice(1).join("\n").trim();
};

export const getProductSizePriceMap = (
  product: Pick<Tables<"products">, "price" | "description"> &
    Partial<Pick<Tables<"products">, "size_prices">>,
): SizePriceMap => {
  const sizePricesFromColumn =
    product.size_prices && typeof product.size_prices === "object"
      ? (product.size_prices as Partial<Record<ProductSize, unknown>>)
      : null;
  if (sizePricesFromColumn) {
    return normalizeSizePriceMap(sizePricesFromColumn, product.price ?? 0);
  }

  // Backward compatibility: read legacy description metadata while old rows are migrated.
  const metadata = parsePriceMetadata(product.description);
  return normalizeSizePriceMap(metadata ?? {}, product.price ?? 0);
};

export const buildProductDescriptionWithSizePrices = (
  visibleDescription: string,
  sizePrices: SizePriceMap,
): string => {
  const metadataLine = `${SIZE_PRICE_PREFIX}${JSON.stringify(sizePrices)}`;
  const trimmedDescription = visibleDescription.trim();
  return trimmedDescription
    ? `${metadataLine}\n${trimmedDescription}`
    : metadataLine;
};
