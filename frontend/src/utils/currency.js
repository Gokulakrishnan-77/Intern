/**
 * Currency Conversion and Formatting Utility
 * Base currency is USD internally, supports instant switching to Indian Rupee (INR - ₹).
 * Exchange rate: 1 USD = 83.50 INR
 */

export const USD_TO_INR_RATE = 83.5;

export const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
];

/**
 * Convert USD base amount to target currency
 */
export const convertFare = (amountInUSD, targetCurrency = 'INR') => {
  const num = Number(amountInUSD) || 0;
  if (targetCurrency === 'INR') {
    return Math.round(num * USD_TO_INR_RATE);
  }
  return Number(num.toFixed(2));
};

/**
 * Format fare with currency symbol
 */
export const formatFare = (amountInUSD, currency = 'INR') => {
  const converted = convertFare(amountInUSD, currency);
  if (currency === 'INR') {
    return `₹${converted.toLocaleString('en-IN')}`;
  }
  return `$${converted.toFixed(2)}`;
};

/**
 * Get currency symbol
 */
export const getCurrencySymbol = (currency = 'INR') => {
  return currency === 'INR' ? '₹' : '$';
};

/**
 * Get saved preferred currency from localStorage (default: INR)
 */
export const getSavedCurrency = () => {
  try {
    return localStorage.getItem('rideshare_currency') || 'INR';
  } catch (e) {
    return 'INR';
  }
};

/**
 * Save preferred currency to localStorage
 */
export const saveCurrency = (currency) => {
  try {
    localStorage.setItem('rideshare_currency', currency);
  } catch (e) {}
};
