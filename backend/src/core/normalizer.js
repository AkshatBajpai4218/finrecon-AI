/**
 * FinRecon AI - Data Normalizer
 * Standardizes messy amounts, dates, and text across payment gateway,
 * bank statements, and orders databases.
 */

/**
 * Converts strings like "₹1,000", "1000.00", "1,000 INR", "INR 1000" into a standard JavaScript number.
 * Handles currencies, Indian number formatting (lakhs/crores), commas, parentheses for negative, etc.
 *
 * @param {string|number} value - The raw amount string or number.
 * @returns {number} Normalized float or integer.
 */
export function normalizeAmount(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }

  let str = String(value).trim();
  if (!str) return 0;

  // Check for accounting parentheses indicating negative e.g. (1,000) or (₹500)
  const isParenthesesNegative = /^\(.*\)$/.test(str);

  // Check for explicit leading negative sign before or after currency symbol
  const isExplicitNegative = /^-\s*[^\d]*\d/.test(str) || /^[^\d]*-\s*\d/.test(str);

  // Strip all non-numeric characters except decimal point
  const cleanNumeric = str.replace(/[^0-9.]/g, '');
  if (!cleanNumeric) return 0;

  const parsed = parseFloat(cleanNumeric);
  if (isNaN(parsed)) return 0;

  const result = (isParenthesesNegative || isExplicitNegative) ? -parsed : parsed;
  // Return rounded to avoid floating point precision artifacts while preserving decimals
  return Math.round(result * 100) / 100;
}

/**
 * Converts strings like "04/09/26", "2026-09-04", "Sep 4, 2026" into ISO date format "YYYY-MM-DD".
 *
 * @param {string|Date} value - Raw date string or Date object.
 * @returns {string|null} ISO date string "YYYY-MM-DD" or null if invalid.
 */
export function normalizeDate(value) {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const str = String(value).trim();
  if (!str) return null;

  // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD (with optional timestamp)
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY or DD/MM/YY or DD-MM-YY (common Indian banking standard)
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const rawYear = parseInt(dmyMatch[3], 10);

    // Expand 2-digit years (e.g. 26 -> 2026)
    const year = rawYear < 100 ? (rawYear >= 70 ? 1900 + rawYear : 2000 + rawYear) : rawYear;

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // 3. Formatted strings like "Sep 4, 2026", "September 4, 2026", "4 Sep 2026"
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

/**
 * Standardizes text values for comparison (lowercase, trimmed).
 * @param {any} value
 * @returns {string}
 */
export function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

export default {
  normalizeAmount,
  normalizeDate,
  normalizeText,
};
