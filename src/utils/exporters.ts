/**
 * Export utility functions for Google Authenticator accounts
 *
 * This module provides functions to export decoded TOTP accounts
 * to various formats (CSV, JSON, Bitwarden) with browser download capability.
 */

import type {
  Account,
  BitwardenExport,
  BitwardenItem,
  CsvExportOptions,
  JsonExportOptions,
} from '../types';
import { algorithmToString, digitCountToNumber } from '../types';

// =============================================================================
// Constants
// =============================================================================

/**
 * Default TOTP period in seconds (Google Authenticator uses 30)
 */
const DEFAULT_PERIOD = 30;

/**
 * CSV column headers
 */
const CSV_HEADERS = [
  'name',
  'issuer',
  'totpSecret',
  'algorithm',
  'digits',
  'type',
  'counter',
] as const;

// =============================================================================
// CSV Export
// =============================================================================

/**
 * Escape a value for CSV format
 * Values containing commas, quotes, or newlines must be quoted
 *
 * @param value - The value to escape
 * @returns CSV-safe escaped value
 */
function escapeCSVValue(value: string | number): string {
  const stringValue = String(value);
  // If the value contains comma, double quote, or newline, wrap in quotes
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n')
  ) {
    // Escape double quotes by doubling them
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Convert accounts to CSV format
 *
 * @param accounts - Array of decoded accounts
 * @param options - CSV export options
 * @returns CSV string with headers and data rows
 *
 * @example
 * ```typescript
 * const csv = toCSV(accounts);
 * // name,issuer,totpSecret,algorithm,digits,type,counter
 * // user@example.com,GitHub,JBSWY3DPEHPK3PXP,SHA1,6,TOTP,0
 * ```
 */
export function toCSV(
  accounts: Account[],
  options: CsvExportOptions = {}
): string {
  const { includeHeader = true, delimiter = ',' } = options;

  const rows: string[] = [];

  // Add header row if requested
  if (includeHeader) {
    rows.push(CSV_HEADERS.join(delimiter));
  }

  // Add data rows
  for (const account of accounts) {
    const row = [
      escapeCSVValue(account.name),
      escapeCSVValue(account.issuer),
      escapeCSVValue(account.totpSecret),
      escapeCSVValue(algorithmToString(account.algorithm)),
      escapeCSVValue(digitCountToNumber(account.digits)),
      escapeCSVValue(account.type),
      escapeCSVValue(account.counter),
    ];
    rows.push(row.join(delimiter));
  }

  return rows.join('\n');
}

// =============================================================================
// JSON Export
// =============================================================================

/**
 * Convert accounts to JSON format
 *
 * @param accounts - Array of decoded accounts
 * @param options - JSON export options
 * @returns JSON string representation of accounts
 *
 * @example
 * ```typescript
 * const json = toJSON(accounts, { prettyPrint: true });
 * ```
 */
export function toJSON(
  accounts: Account[],
  options: JsonExportOptions = {}
): string {
  const { prettyPrint = true, indent = 2 } = options;

  // Map accounts to a clean export format
  const exportData = accounts.map((account) => ({
    name: account.name,
    issuer: account.issuer,
    totpSecret: account.totpSecret,
    algorithm: algorithmToString(account.algorithm),
    digits: digitCountToNumber(account.digits),
    type: account.type,
    counter: account.counter,
    uniqueId: account.uniqueId,
  }));

  if (prettyPrint) {
    return JSON.stringify(exportData, null, indent);
  }

  return JSON.stringify(exportData);
}

// =============================================================================
// Bitwarden/Vaultwarden Export
// =============================================================================

/**
 * Generate an otpauth:// URI for a TOTP/HOTP account
 *
 * @param account - The account to generate URI for
 * @returns otpauth:// URI string
 */
function generateOtpauthUri(account: Account): string {
  const type = account.type === 'HOTP' ? 'hotp' : 'totp';
  const algorithm = algorithmToString(account.algorithm);
  const digits = digitCountToNumber(account.digits);

  // Label format: issuer:name or just name if no issuer
  const label = account.issuer
    ? `${encodeURIComponent(account.issuer)}:${encodeURIComponent(account.name)}`
    : encodeURIComponent(account.name);

  // Build query parameters
  const params = new URLSearchParams();
  params.set('secret', account.totpSecret);

  if (account.issuer) {
    params.set('issuer', account.issuer);
  }

  // Only include non-default values to keep URI clean
  if (algorithm !== 'SHA1') {
    params.set('algorithm', algorithm);
  }

  if (digits !== 6) {
    params.set('digits', String(digits));
  }

  if (type === 'totp') {
    // Period is always 30 for Google Authenticator exports
    // Only include if non-default (but GA always uses 30)
    params.set('period', String(DEFAULT_PERIOD));
  } else {
    // HOTP uses counter instead of period
    params.set('counter', String(account.counter));
  }

  return `otpauth://${type}/${label}?${params.toString()}`;
}

/**
 * Convert a single account to Bitwarden item format
 *
 * @param account - The account to convert
 * @returns BitwardenItem object
 */
function accountToBitwardenItem(account: Account): BitwardenItem {
  return {
    id: crypto.randomUUID(),
    organizationId: null,
    folderId: null,
    type: 1, // 1 = login item
    reprompt: 0,
    name: account.issuer || account.name || 'Unnamed Account',
    notes: '',
    favorite: false,
    login: {
      uris: [],
      username: account.name,
      password: '',
      totp: generateOtpauthUri(account),
    },
    collectionIds: null,
  };
}

/**
 * Convert accounts to Bitwarden/Vaultwarden import format
 *
 * This format is compatible with both Bitwarden and Vaultwarden.
 * Each account is converted to a login item with the TOTP URI stored
 * in the login.totp field.
 *
 * @param accounts - Array of decoded accounts
 * @returns BitwardenExport object ready for JSON serialization
 *
 * @example
 * ```typescript
 * const bitwardenData = toBitwardenFormat(accounts);
 * const json = JSON.stringify(bitwardenData, null, 2);
 * ```
 */
export function toBitwardenFormat(accounts: Account[]): BitwardenExport {
  return {
    folders: [],
    items: accounts.map(accountToBitwardenItem),
  };
}

/**
 * Convert accounts to Bitwarden JSON string
 *
 * Convenience function that combines toBitwardenFormat() with JSON.stringify()
 *
 * @param accounts - Array of decoded accounts
 * @param prettyPrint - Whether to format the JSON (default: true)
 * @returns JSON string in Bitwarden import format
 */
export function toBitwardenJSON(
  accounts: Account[],
  prettyPrint = true
): string {
  const data = toBitwardenFormat(accounts);
  return prettyPrint ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

// =============================================================================
// Browser Download Utilities
// =============================================================================

/**
 * Trigger a file download in the browser
 *
 * Creates a temporary blob URL and triggers a download via a hidden anchor element.
 * Works in all modern browsers.
 *
 * @param content - The file content as a string
 * @param filename - The suggested filename for download
 * @param mimeType - The MIME type of the content
 *
 * @example
 * ```typescript
 * downloadFile(csvContent, 'accounts.csv', 'text/csv');
 * downloadFile(jsonContent, 'accounts.json', 'application/json');
 * ```
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  // Create a blob from the content
  const blob = new Blob([content], { type: mimeType });

  // Create a temporary URL for the blob
  const url = URL.createObjectURL(blob);

  // Create a hidden anchor element for download
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // Append to body, click, and cleanup
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Release the blob URL
  URL.revokeObjectURL(url);
}

/**
 * Download accounts as CSV file
 *
 * @param accounts - Array of decoded accounts
 * @param filename - Filename for download (default: 'totp-accounts.csv')
 * @param options - CSV export options
 */
export function downloadCSV(
  accounts: Account[],
  filename = 'totp-accounts.csv',
  options?: CsvExportOptions
): void {
  const content = toCSV(accounts, options);
  downloadFile(content, filename, 'text/csv;charset=utf-8');
}

/**
 * Download accounts as JSON file
 *
 * @param accounts - Array of decoded accounts
 * @param filename - Filename for download (default: 'totp-accounts.json')
 * @param options - JSON export options
 */
export function downloadJSON(
  accounts: Account[],
  filename = 'totp-accounts.json',
  options?: JsonExportOptions
): void {
  const content = toJSON(accounts, options);
  downloadFile(content, filename, 'application/json;charset=utf-8');
}

/**
 * Download accounts as Bitwarden-compatible JSON file
 *
 * @param accounts - Array of decoded accounts
 * @param filename - Filename for download (default: 'bitwarden-export.json')
 * @param prettyPrint - Whether to format the JSON (default: true)
 */
export function downloadBitwarden(
  accounts: Account[],
  filename = 'bitwarden-export.json',
  prettyPrint = true
): void {
  const content = toBitwardenJSON(accounts, prettyPrint);
  downloadFile(content, filename, 'application/json;charset=utf-8');
}

// =============================================================================
// Utility Exports
// =============================================================================

/**
 * Get the appropriate file extension for an export format
 *
 * @param format - The export format
 * @returns File extension with dot (e.g., '.csv')
 */
export function getFileExtension(
  format: 'csv' | 'json' | 'bitwarden'
): string {
  switch (format) {
    case 'csv':
      return '.csv';
    case 'json':
    case 'bitwarden':
      return '.json';
    default:
      return '.txt';
  }
}

/**
 * Get the MIME type for an export format
 *
 * @param format - The export format
 * @returns MIME type string
 */
export function getMimeType(format: 'csv' | 'json' | 'bitwarden'): string {
  switch (format) {
    case 'csv':
      return 'text/csv;charset=utf-8';
    case 'json':
    case 'bitwarden':
      return 'application/json;charset=utf-8';
    default:
      return 'text/plain;charset=utf-8';
  }
}

/**
 * Generate a timestamped filename for exports
 *
 * @param prefix - Filename prefix (default: 'totp-accounts')
 * @param format - Export format for extension
 * @returns Timestamped filename
 *
 * @example
 * ```typescript
 * generateFilename('accounts', 'csv');
 * // Returns: 'accounts-2024-01-15-143052.csv'
 * ```
 */
export function generateFilename(
  prefix = 'totp-accounts',
  format: 'csv' | 'json' | 'bitwarden' = 'json'
): string {
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[T:]/g, '-')
    .replace(/\..+/, '')
    .replace(/-/g, '');

  // Format: YYYYMMDD-HHmmss
  const formattedTimestamp = `${timestamp.slice(0, 8)}-${timestamp.slice(8, 14)}`;

  return `${prefix}-${formattedTimestamp}${getFileExtension(format)}`;
}
