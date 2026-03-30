type FormatCurrencyOptions = {
  isCents?: boolean;
  fallback?: string;
  showSymbol?: boolean;
};

export const formatCurrencyZAR = (
  amount: number,
  { isCents = false, fallback = "R0.00", showSymbol = true }: FormatCurrencyOptions = {},
) => {
  if (!Number.isFinite(amount)) return fallback;
  const normalized = isCents ? amount / 100 : amount;
  const formatted = normalized.toFixed(2);
  return showSymbol ? `R${formatted}` : formatted;
};
