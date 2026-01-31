/**
 * TypeScript type definitions for Google Authenticator Export Decoder
 * Based on the protobuf schema from google_auth.proto
 */

// =============================================================================
// Protobuf Enums (matching google_auth.proto)
// =============================================================================

/**
 * Algorithm used for OTP generation
 * Maps to MigrationPayload.Algorithm in protobuf
 */
export enum Algorithm {
  ALGORITHM_UNSPECIFIED = 0,
  SHA1 = 1,
  SHA256 = 2,
  SHA512 = 3,
  MD5 = 4,
}

/**
 * String representation of Algorithm enum for decoded output
 */
export type AlgorithmString =
  | 'ALGORITHM_UNSPECIFIED'
  | 'SHA1'
  | 'SHA256'
  | 'SHA512'
  | 'MD5';

/**
 * Number of digits in the OTP code
 * Maps to MigrationPayload.DigitCount in protobuf
 */
export enum DigitCount {
  DIGIT_COUNT_UNSPECIFIED = 0,
  SIX = 1,
  EIGHT = 2,
  SEVEN = 3,
}

/**
 * String representation of DigitCount enum for decoded output
 */
export type DigitCountString =
  | 'DIGIT_COUNT_UNSPECIFIED'
  | 'SIX'
  | 'EIGHT'
  | 'SEVEN';

/**
 * Type of OTP (HOTP = counter-based, TOTP = time-based)
 * Maps to MigrationPayload.OtpType in protobuf
 */
export enum OtpType {
  OTP_TYPE_UNSPECIFIED = 0,
  HOTP = 1,
  TOTP = 2,
}

/**
 * String representation of OtpType enum for decoded output
 */
export type OtpTypeString = 'OTP_TYPE_UNSPECIFIED' | 'HOTP' | 'TOTP';

// =============================================================================
// Protobuf Message Interfaces
// =============================================================================

/**
 * Raw OTP parameters as decoded from protobuf
 * Maps to MigrationPayload.OtpParameters in protobuf
 * Note: secret is base64-encoded bytes from protobuf
 */
export interface OtpParameters {
  /** Base64-encoded secret bytes from protobuf */
  secret: string;
  /** Account name (e.g., "user@example.com") */
  name: string;
  /** Issuer name (e.g., "GitHub", "Google") */
  issuer: string;
  /** Algorithm used for OTP generation */
  algorithm: Algorithm | AlgorithmString;
  /** Number of digits in the OTP code */
  digits: DigitCount | DigitCountString;
  /** Type of OTP (HOTP or TOTP) */
  type: OtpType | OtpTypeString;
  /** Counter value for HOTP */
  counter: string | number;
  /** Unique identifier for the account */
  unique_id?: string;
}

/**
 * Full migration payload as decoded from protobuf
 * Maps to MigrationPayload message in protobuf
 */
export interface MigrationPayload {
  /** Array of OTP accounts */
  otp_parameters: OtpParameters[];
  /** Protocol version */
  version: number;
  /** Total number of QR codes in batch */
  batch_size: number;
  /** Index of this QR code in batch (0-based) */
  batch_index: number;
  /** Unique identifier for this batch */
  batch_id: number;
}

// =============================================================================
// Application Types
// =============================================================================

/**
 * Decoded account with base32-encoded TOTP secret
 * This is the processed output after protobuf decoding
 */
export interface Account {
  /** Account name (e.g., "user@example.com") */
  name: string;
  /** Issuer name (e.g., "GitHub", "Google") */
  issuer: string;
  /** Base32-encoded secret for use in TOTP apps */
  totpSecret: string;
  /** Algorithm as string */
  algorithm: AlgorithmString;
  /** Digit count as string */
  digits: DigitCountString;
  /** OTP type as string */
  type: OtpTypeString;
  /** Counter value for HOTP (as number) */
  counter: number;
  /** Unique identifier for the account */
  uniqueId?: string;
}

/**
 * Batch information for multi-QR exports
 */
export interface BatchInfo {
  /** Total number of QR codes in batch */
  batchSize: number;
  /** Index of this QR code in batch (0-based) */
  batchIndex: number;
  /** Unique identifier for this batch */
  batchId: number;
  /** Protocol version */
  version: number;
}

/**
 * Result of decoding a single QR code
 */
export interface DecodeResult {
  /** Decoded accounts */
  accounts: Account[];
  /** Batch information */
  batch: BatchInfo;
}

// =============================================================================
// Export Format Types
// =============================================================================

/**
 * CSV export format
 */
export interface CsvExportOptions {
  /** Include header row */
  includeHeader?: boolean;
  /** Field delimiter (default: comma) */
  delimiter?: string;
}

/**
 * JSON export format
 */
export interface JsonExportOptions {
  /** Pretty print with indentation */
  prettyPrint?: boolean;
  /** Indentation spaces (default: 2) */
  indent?: number;
}

/**
 * Bitwarden/Vaultwarden login URI entry
 */
export interface BitwardenUri {
  match: null;
  uri: string;
}

/**
 * Bitwarden/Vaultwarden login item
 */
export interface BitwardenLogin {
  uris: BitwardenUri[];
  username: string;
  password: string;
  /** TOTP URI in otpauth:// format */
  totp: string;
}

/**
 * Bitwarden/Vaultwarden export item
 */
export interface BitwardenItem {
  id: string;
  organizationId: null;
  folderId: string | null;
  /** Item type: 1 = login */
  type: 1;
  reprompt: 0;
  name: string;
  notes: string;
  favorite: boolean;
  login: BitwardenLogin;
  collectionIds: null;
}

/**
 * Bitwarden/Vaultwarden folder entry
 */
export interface BitwardenFolder {
  id: string;
  name: string;
}

/**
 * Bitwarden/Vaultwarden export format
 * Compatible with Bitwarden and Vaultwarden import
 */
export interface BitwardenExport {
  folders: BitwardenFolder[];
  items: BitwardenItem[];
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Supported export formats
 */
export type ExportFormat = 'csv' | 'json' | 'bitwarden';

/**
 * Map from DigitCount enum to actual digit count number
 */
export const DIGIT_COUNT_MAP: Record<DigitCountString, number> = {
  DIGIT_COUNT_UNSPECIFIED: 6,
  SIX: 6,
  SEVEN: 7,
  EIGHT: 8,
};

/**
 * Map from Algorithm enum to algorithm string for otpauth URI
 */
export const ALGORITHM_MAP: Record<AlgorithmString, string> = {
  ALGORITHM_UNSPECIFIED: 'SHA1',
  SHA1: 'SHA1',
  SHA256: 'SHA256',
  SHA512: 'SHA512',
  MD5: 'MD5',
};

/**
 * Helper function to convert DigitCount to number
 */
export function digitCountToNumber(
  digits: DigitCount | DigitCountString
): number {
  if (typeof digits === 'number') {
    const map: Record<DigitCount, number> = {
      [DigitCount.DIGIT_COUNT_UNSPECIFIED]: 6,
      [DigitCount.SIX]: 6,
      [DigitCount.SEVEN]: 7,
      [DigitCount.EIGHT]: 8,
    };
    return map[digits] ?? 6;
  }
  return DIGIT_COUNT_MAP[digits] ?? 6;
}

/**
 * Helper function to get algorithm string for otpauth URI
 */
export function algorithmToString(
  algorithm: Algorithm | AlgorithmString
): string {
  if (typeof algorithm === 'number') {
    const map: Record<Algorithm, string> = {
      [Algorithm.ALGORITHM_UNSPECIFIED]: 'SHA1',
      [Algorithm.SHA1]: 'SHA1',
      [Algorithm.SHA256]: 'SHA256',
      [Algorithm.SHA512]: 'SHA512',
      [Algorithm.MD5]: 'MD5',
    };
    return map[algorithm] ?? 'SHA1';
  }
  return ALGORITHM_MAP[algorithm] ?? 'SHA1';
}

/**
 * QR scan result from html5-qrcode
 */
export interface QrScanResult {
  /** Raw decoded text from QR code */
  decodedText: string;
  /** Format of the QR code */
  format?: string;
}

/**
 * Error types for the application
 */
export type DecoderErrorType =
  | 'INVALID_URI'
  | 'MISSING_DATA'
  | 'DECODE_FAILED'
  | 'INVALID_FORMAT';

/**
 * Application error with type information
 */
export interface DecoderError {
  type: DecoderErrorType;
  message: string;
  originalError?: Error;
}
