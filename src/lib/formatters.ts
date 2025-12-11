/**
 * Number formatting utilities for consistent display across the app
 * All monetary values formatted with 2 decimal places and comma separators
 */

/**
 * Format a number with 2 decimals and comma separators
 * @param num - The number to format
 * @returns Formatted string like "1,234,567.89"
 */
export const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '0.00';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Format a number as currency with dollar sign, 2 decimals, comma separators
 * @param num - The number to format
 * @returns Formatted string like "$1,234,567.89"
 */
export const formatCurrency = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '$0.00';
  return `$${formatNumber(num)}`;
};

/**
 * Format a percentage with 2 decimal places
 * @param num - The number to format
 * @returns Formatted string like "12.34%"
 */
export const formatPercent = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '0.00%';
  return `${num.toFixed(2)}%`;
};

/**
 * Format shares with 2 decimal places and commas
 * @param num - The number of shares
 * @returns Formatted string like "1,234.56"
 */
export const formatShares = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '0.00';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
