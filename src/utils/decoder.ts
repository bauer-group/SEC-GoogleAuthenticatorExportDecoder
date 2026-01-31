/**
 * Browser-compatible protobuf decoder for Google Authenticator export QR codes
 *
 * This module decodes the migration URI format used by Google Authenticator
 * when exporting accounts via QR code. It uses protobufjs with an embedded
 * proto schema for browser compatibility.
 *
 * URI Format: otpauth-migration://offline?data=<url-encoded-base64-protobuf>
 */

import * as protobuf from 'protobufjs';
import * as base32 from 'hi-base32';
import type {
  Account,
  AlgorithmString,
  BatchInfo,
  DecodeResult,
  DecoderError,
  DigitCountString,
  OtpTypeString,
} from '../types';

// =============================================================================
// Embedded Protobuf Schema
// =============================================================================

/**
 * Proto definition embedded as string for browser compatibility.
 * Cannot use loadSync() in browser - must use parse() instead.
 * Schema from: https://github.com/beemdevelopment/Aegis/pull/406/files
 */
const PROTO_DEFINITION = `
syntax = "proto3";

package googleauth;

message MigrationPayload {
  enum Algorithm {
    ALGORITHM_UNSPECIFIED = 0;
    SHA1 = 1;
    SHA256 = 2;
    SHA512 = 3;
    MD5 = 4;
  }

  enum DigitCount {
    DIGIT_COUNT_UNSPECIFIED = 0;
    SIX = 1;
    EIGHT = 2;
    SEVEN = 3;
  }

  enum OtpType {
    OTP_TYPE_UNSPECIFIED = 0;
    HOTP = 1;
    TOTP = 2;
  }

  message OtpParameters {
    bytes secret = 1;
    string name = 2;
    string issuer = 3;
    Algorithm algorithm = 4;
    DigitCount digits = 5;
    OtpType type = 6;
    int64 counter = 7;
    string unique_id = 8;
  }

  repeated OtpParameters otp_parameters = 1;
  int32 version = 2;
  int32 batch_size = 3;
  int32 batch_index = 4;
  int32 batch_id = 5;
}
`;

// =============================================================================
// Type Definitions for Protobuf Decoded Output
// =============================================================================

/**
 * Raw protobuf decoded message structure
 * Before toObject() conversion, preserves raw field names
 */
interface RawProtobufPayload {
  otpParameters: Array<{
    secret: string; // base64 encoded
    name: string;
    issuer: string;
    algorithm: string;
    digits: string;
    type: string;
    counter: string | number;
    uniqueId?: string;
  }>;
  version: number | string;
  batchSize: number;
  batchIndex: number;
  batchId: number;
}

// =============================================================================
// Browser-Compatible Utilities
// =============================================================================

/**
 * Convert Base64 string to Uint8Array for browser
 * IMPORTANT: Do NOT use Buffer.from() - it's Node.js only!
 *
 * @param base64 - Base64 encoded string
 * @returns Uint8Array of decoded bytes
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert Base64 string to Base32 for TOTP apps
 * Most TOTP apps use Base32 encoded secrets
 *
 * @param base64String - Base64 encoded secret from protobuf
 * @returns RFC 4648 compliant Base32 string (without padding)
 */
function toBase32(base64String: string): string {
  const bytes = base64ToUint8Array(base64String);
  // hi-base32 encodes to uppercase Base32 with padding
  // Remove padding for cleaner output (most TOTP apps accept both)
  return base32.encode(bytes).replace(/=/g, '');
}

// =============================================================================
// Protobuf Decoding
// =============================================================================

/**
 * Decode protobuf payload from Google Authenticator export
 *
 * @param payload - Uint8Array of protobuf data
 * @returns Decoded MigrationPayload object
 * @throws Error if protobuf decoding fails
 */
function decodeProtobuf(payload: Uint8Array): RawProtobufPayload {
  // Parse the embedded proto definition
  const root = protobuf.parse(PROTO_DEFINITION).root;

  // Lookup the MigrationPayload message type
  const MigrationPayload = root.lookupType('googleauth.MigrationPayload');

  // Decode the binary payload
  const message = MigrationPayload.decode(payload);

  // Convert to plain JavaScript object with string enums
  return MigrationPayload.toObject(message, {
    longs: String,
    enums: String,
    bytes: String,
  }) as RawProtobufPayload;
}

/**
 * Map raw OTP parameters to Account interface
 *
 * @param params - Raw OTP parameters from protobuf
 * @returns Account with base32-encoded TOTP secret
 */
function mapOtpParametersToAccount(
  params: RawProtobufPayload['otpParameters'][0]
): Account {
  return {
    name: params.name || '',
    issuer: params.issuer || '',
    totpSecret: toBase32(params.secret),
    algorithm: (params.algorithm || 'SHA1') as AlgorithmString,
    digits: (params.digits || 'SIX') as DigitCountString,
    type: (params.type || 'TOTP') as OtpTypeString,
    counter:
      typeof params.counter === 'string'
        ? parseInt(params.counter, 10)
        : params.counter || 0,
    uniqueId: params.uniqueId,
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Create a DecoderError
 */
function createDecoderError(
  type: DecoderError['type'],
  message: string,
  originalError?: Error
): DecoderError {
  return { type, message, originalError };
}

/**
 * Validate that the URI is a valid Google Authenticator migration URI
 *
 * @param uri - URI string to validate
 * @returns true if valid, throws DecoderError if invalid
 */
export function validateMigrationUri(uri: string): boolean {
  if (!uri || typeof uri !== 'string') {
    throw createDecoderError('INVALID_URI', 'URI must be a non-empty string');
  }

  if (!uri.startsWith('otpauth-migration://')) {
    throw createDecoderError(
      'INVALID_FORMAT',
      'URI must start with otpauth-migration://'
    );
  }

  return true;
}

/**
 * Extract the data parameter from an otpauth-migration URI
 *
 * @param uri - The full migration URI
 * @returns The data parameter value (URL-encoded base64)
 * @throws DecoderError if data parameter is missing
 */
export function extractDataFromUri(uri: string): string {
  validateMigrationUri(uri);

  try {
    const url = new URL(uri);
    const data = url.searchParams.get('data');

    if (!data) {
      throw createDecoderError(
        'MISSING_DATA',
        'URI is missing the required "data" parameter'
      );
    }

    return data;
  } catch (error) {
    if ((error as DecoderError).type) {
      throw error;
    }
    throw createDecoderError(
      'INVALID_URI',
      `Failed to parse URI: ${(error as Error).message}`,
      error as Error
    );
  }
}

/**
 * Decode a Google Authenticator export URI and extract all accounts
 *
 * The URI format is: otpauth-migration://offline?data=<url-encoded-base64-protobuf>
 *
 * @param uri - The full otpauth-migration:// URI from QR code
 * @returns DecodeResult with accounts and batch information
 * @throws DecoderError if decoding fails
 *
 * @example
 * ```typescript
 * const result = decodeExportUri('otpauth-migration://offline?data=...');
 * result.accounts.forEach(account => {
 *   console.log(`${account.issuer}: ${account.name} - ${account.totpSecret}`);
 * });
 * ```
 */
export function decodeExportUri(uri: string): DecodeResult {
  // Extract and URL-decode the data parameter
  const data = extractDataFromUri(uri);

  try {
    // URL decode then Base64 decode to Uint8Array
    // IMPORTANT: Use atob() + Uint8Array for browser compatibility
    // Do NOT use Buffer.from() - it's Node.js only!
    const decodedData = decodeURIComponent(data);
    const buffer = base64ToUint8Array(decodedData);

    // Decode the protobuf payload
    const payload = decodeProtobuf(buffer);

    // Validate version (currently only version 1 is known)
    const version = Number(payload.version) || 1;
    if (version !== 1) {
      // Log warning but continue processing
      // Different versions might still be compatible
    }

    // Map OTP parameters to Account objects
    const accounts: Account[] = (payload.otpParameters || []).map(
      mapOtpParametersToAccount
    );

    // Extract batch information for multi-QR exports
    const batch: BatchInfo = {
      version,
      batchSize: payload.batchSize || 1,
      batchIndex: payload.batchIndex || 0,
      batchId: payload.batchId || 0,
    };

    return { accounts, batch };
  } catch (error) {
    if ((error as DecoderError).type) {
      throw error;
    }
    throw createDecoderError(
      'DECODE_FAILED',
      `Failed to decode migration data: ${(error as Error).message}`,
      error as Error
    );
  }
}

/**
 * Decode raw protobuf data directly (for advanced use cases)
 *
 * @param base64Data - Base64-encoded protobuf data (not URL-encoded)
 * @returns DecodeResult with accounts and batch information
 */
export function decodeBase64Data(base64Data: string): DecodeResult {
  try {
    const buffer = base64ToUint8Array(base64Data);
    const payload = decodeProtobuf(buffer);

    const version = Number(payload.version) || 1;
    const accounts: Account[] = (payload.otpParameters || []).map(
      mapOtpParametersToAccount
    );
    const batch: BatchInfo = {
      version,
      batchSize: payload.batchSize || 1,
      batchIndex: payload.batchIndex || 0,
      batchId: payload.batchId || 0,
    };

    return { accounts, batch };
  } catch (error) {
    throw createDecoderError(
      'DECODE_FAILED',
      `Failed to decode base64 data: ${(error as Error).message}`,
      error as Error
    );
  }
}

/**
 * Merge results from multiple QR codes in a batch
 *
 * When Google Authenticator exports many accounts, it splits them across
 * multiple QR codes. This function merges the results.
 *
 * @param results - Array of DecodeResult from multiple QR scans
 * @returns Merged accounts array (deduplicated by uniqueId if present)
 */
export function mergeBatchResults(results: DecodeResult[]): Account[] {
  const accountMap = new Map<string, Account>();

  for (const result of results) {
    for (const account of result.accounts) {
      // Use uniqueId for deduplication if available, otherwise use name+issuer
      const key = account.uniqueId || `${account.issuer}:${account.name}`;
      accountMap.set(key, account);
    }
  }

  return Array.from(accountMap.values());
}

/**
 * Check if a batch is complete (all QR codes scanned)
 *
 * @param results - Array of DecodeResult from scanned QR codes
 * @returns Object with isComplete flag and missing indices
 */
export function checkBatchComplete(results: DecodeResult[]): {
  isComplete: boolean;
  scannedCount: number;
  totalCount: number;
  missingIndices: number[];
} {
  if (results.length === 0) {
    return { isComplete: false, scannedCount: 0, totalCount: 0, missingIndices: [] };
  }

  // Get batch size from first result (should be same for all)
  // Non-null assertion is safe because we checked length > 0 above
  const batchSize = results[0]!.batch.batchSize;
  const scannedIndices = new Set(results.map((r) => r.batch.batchIndex));

  const missingIndices: number[] = [];
  for (let i = 0; i < batchSize; i++) {
    if (!scannedIndices.has(i)) {
      missingIndices.push(i);
    }
  }

  return {
    isComplete: missingIndices.length === 0,
    scannedCount: scannedIndices.size,
    totalCount: batchSize,
    missingIndices,
  };
}
