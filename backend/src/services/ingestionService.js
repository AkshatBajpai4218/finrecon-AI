import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import Papa from 'papaparse';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/**
 * Ingestion Service
 * Parses incoming CSV and PDF files into structured row records.
 */

/**
 * Parses CSV input (Buffer, raw string, or file path) using PapaParse.
 * @param {Buffer|string} input
 * @param {object} [options={}]
 * @returns {Array<object>}
 */
export function parseCsv(input, options = {}) {
  let csvString = '';

  if (Buffer.isBuffer(input)) {
    csvString = input.toString('utf-8');
  } else if (typeof input === 'string') {
    if (fs.existsSync(input)) {
      csvString = fs.readFileSync(input, 'utf-8');
    } else {
      csvString = input;
    }
  } else {
    throw new TypeError('Invalid CSV input: expected Buffer, CSV string, or valid file path.');
  }

  const result = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: header => header.trim(),
    ...options,
  });

  if (result.errors && result.errors.length > 0) {
    const fatal = result.errors.filter(e => e.type !== 'FieldMismatch');
    if (fatal.length > 0) {
      console.warn('CSV parsing warnings:', fatal);
    }
  }

  return result.data || [];
}

/**
 * Parses PDF bank statements using pdf-parse and heuristic tabular extraction.
 * Detects lines containing: Date | Description | Amount / Reference
 *
 * @param {Buffer|string} input - PDF buffer or file path
 * @returns {Promise<{ rows: Array<object>, confidence: number, isLowConfidence: boolean, warning: string|null }>}
 */
export async function parseBankStatementPdf(input) {
  let buffer;

  if (Buffer.isBuffer(input)) {
    buffer = input;
  } else if (typeof input === 'string' && fs.existsSync(input)) {
    buffer = fs.readFileSync(input);
  } else {
    throw new TypeError('Invalid PDF input: expected Buffer or existing file path.');
  }

  const pdfFn = typeof pdfParse === 'function' ? pdfParse : (pdfParse.default || pdfParse);
  const pdfData = await pdfFn(buffer);
  const text = pdfData.text || '';

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const rows = [];
  let matchingLinesCount = 0;

  // Regex pattern for common bank statement layout:
  // Date: DD/MM/YYYY or YYYY-MM-DD
  // Description: Narration / UTR / Reference
  // Amount: Deposit / Credit value at the end of line or middle
  const rowPattern = /^(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\s+(.+?)\s+([₹$€]?\s*[\d,]+(?:\.\d{1,2})?)$/;

  for (const line of lines) {
    // Skip obvious header or footer lines
    if (/page \d+/i.test(line) || /statement of account/i.test(line) || /^date\s+description/i.test(line)) {
      continue;
    }

    const match = line.match(rowPattern);
    if (match) {
      matchingLinesCount++;
      const rawDate = match[1];
      const rawDesc = match[2].trim();
      const rawAmount = match[3].trim();

      // Extract transaction reference from description if present (e.g. TXN1001, UPI/1001)
      const refMatch = rawDesc.match(/(TXN[-_]?\w+|UPI[-_]?\w+|REF[-_]?\w+)/i);
      const reference = refMatch ? refMatch[1] : `PDF-${rows.length + 1}`;

      rows.push({
        reference,
        description: rawDesc,
        credit: rawAmount,
        date: rawDate,
        source: 'pdf_statement',
      });
    }
  }

  // Calculate confidence: ratio of parsed rows to non-empty lines (excluding headers)
  const confidence = lines.length > 0 ? Math.min(1.0, matchingLinesCount / Math.max(lines.length * 0.4, 1)) : 0;
  const isLowConfidence = rows.length < 2 || confidence < 0.6;
  const warning = isLowConfidence
    ? 'PDF parsing confidence is low — tabular transaction rows may be incomplete or non-standard.'
    : null;

  return {
    rows,
    confidence: Number(confidence.toFixed(2)),
    isLowConfidence,
    warning,
  };
}

/**
 * General purpose file parser automatically delegating between CSV and PDF.
 * @param {Buffer|string} input
 * @param {string} [filename='']
 * @returns {Promise<{ rows: Array<object>, isPdf: boolean, isLowConfidence: boolean, warning: string|null }>}
 */
export async function parseFile(input, filename = '') {
  const isPdf = /\.pdf$/i.test(filename) || (typeof input === 'string' && /\.pdf$/i.test(input));

  if (isPdf) {
    const pdfResult = await parseBankStatementPdf(input);
    return {
      rows: pdfResult.rows,
      isPdf: true,
      isLowConfidence: pdfResult.isLowConfidence,
      warning: pdfResult.warning,
    };
  }

  const rows = parseCsv(input);
  return {
    rows,
    isPdf: false,
    isLowConfidence: false,
    warning: null,
  };
}

export const parseCSV = parseCsv;
export default {
  parseCsv,
  parseBankStatementPdf,
  parseFile,
};
