import { describe, expect, it } from 'vitest';
import testQrCodes from '../../test-assets/test-qr-codes.json';
import {
  decodeExportUri,
  validateMigrationUri,
  extractDataFromUri,
  mergeBatchResults,
  checkBatchComplete,
} from './decoder';

describe('Protobuf decoding of QR export data', () => {
  it('Should decode single QR export', () => {
    // Given
    const export1 =
      testQrCodes['Google-auth-test-qr.png' as keyof typeof testQrCodes];

    // When
    const result = decodeExportUri(export1 as string);
    const actualAccounts = result.accounts;

    // Then
    expect(actualAccounts).toHaveLength(3);

    expect(actualAccounts[0]).toEqual({
      algorithm: 'SHA1',
      counter: 0,
      digits: 'SIX',
      issuer: '',
      name: 'Test account 1',
      totpSecret: 'JBSWY3APEHPK3PXI',
      type: 'TOTP',
      uniqueId: undefined,
    });

    expect(actualAccounts[2]).toEqual({
      algorithm: 'SHA1',
      counter: 1,
      digits: 'SIX',
      issuer: '',
      name: 'Counter key 1',
      totpSecret: 'ABCI23DEF456GHI7',
      type: 'HOTP',
      uniqueId: undefined,
    });
  });

  it('Should decode payload exported as 2 QR codes', () => {
    // Given
    const export1 =
      testQrCodes['Google-auth-test2-qr1.png' as keyof typeof testQrCodes];
    const export2 =
      testQrCodes['Google-auth-test2-qr2.png' as keyof typeof testQrCodes];

    // When
    const result1 = decodeExportUri(export1 as string);
    const result2 = decodeExportUri(export2 as string);

    // Then
    expect(result1.accounts).toHaveLength(10);
    expect(result2.accounts).toHaveLength(2);

    // Verify batch information
    expect(result1.batch.batchIndex).toBe(0);
    expect(result1.batch.batchSize).toBe(2);
    expect(result2.batch.batchIndex).toBe(1);
    expect(result2.batch.batchSize).toBe(2);
  });

  it('Should decode export with SHA512 and 8 digit length code', () => {
    // Given
    const export1 =
      testQrCodes[
        'Google-auth-test-sha512-8digit.png' as keyof typeof testQrCodes
      ];

    // When
    const result = decodeExportUri(export1 as string);
    const actualAccounts = result.accounts;

    // Then
    expect(actualAccounts).toHaveLength(1);

    expect(actualAccounts[0]).toEqual({
      algorithm: 'SHA512',
      counter: 0,
      digits: 'EIGHT',
      issuer: 'TOTPgenerator',
      name: 'TOTPgenerator',
      totpSecret: 'HVR4CFHAFOWFGGFAGSA5JVTIMMPG6GMT',
      type: 'TOTP',
      uniqueId: undefined,
    });
  });
});

describe('validateMigrationUri', () => {
  it('Should validate correct URI format', () => {
    const uri = 'otpauth-migration://offline?data=test';
    expect(validateMigrationUri(uri)).toBe(true);
  });

  it('Should throw for empty string', () => {
    expect(() => validateMigrationUri('')).toThrow();
  });

  it('Should throw for invalid URI format', () => {
    expect(() => validateMigrationUri('https://example.com')).toThrow();
  });

  it('Should throw for null/undefined', () => {
    expect(() => validateMigrationUri(null as unknown as string)).toThrow();
    expect(() => validateMigrationUri(undefined as unknown as string)).toThrow();
  });
});

describe('extractDataFromUri', () => {
  it('Should extract data parameter from valid URI', () => {
    const uri = 'otpauth-migration://offline?data=testData123';
    expect(extractDataFromUri(uri)).toBe('testData123');
  });

  it('Should handle URL-encoded data parameter', () => {
    const uri = 'otpauth-migration://offline?data=test%2Bdata%3D%3D';
    expect(extractDataFromUri(uri)).toBe('test+data==');
  });

  it('Should throw for missing data parameter', () => {
    const uri = 'otpauth-migration://offline?other=value';
    expect(() => extractDataFromUri(uri)).toThrow();
  });
});

describe('mergeBatchResults', () => {
  it('Should merge results from multiple QR codes', () => {
    // Given
    const export1 =
      testQrCodes['Google-auth-test2-qr1.png' as keyof typeof testQrCodes];
    const export2 =
      testQrCodes['Google-auth-test2-qr2.png' as keyof typeof testQrCodes];
    const result1 = decodeExportUri(export1 as string);
    const result2 = decodeExportUri(export2 as string);

    // When
    const merged = mergeBatchResults([result1, result2]);

    // Then - should have 12 unique accounts (10 from first + 2 from second)
    expect(merged).toHaveLength(12);
  });

  it('Should deduplicate accounts with same name and issuer', () => {
    // Given - decode same QR twice (simulating duplicate scan)
    const export1 =
      testQrCodes['Google-auth-test-qr.png' as keyof typeof testQrCodes];
    const result1 = decodeExportUri(export1 as string);
    const result2 = decodeExportUri(export1 as string);

    // When
    const merged = mergeBatchResults([result1, result2]);

    // Then - should have 3 unique accounts (duplicates removed)
    expect(merged).toHaveLength(3);
  });
});

describe('checkBatchComplete', () => {
  it('Should identify complete batch', () => {
    // Given
    const export1 =
      testQrCodes['Google-auth-test2-qr1.png' as keyof typeof testQrCodes];
    const export2 =
      testQrCodes['Google-auth-test2-qr2.png' as keyof typeof testQrCodes];
    const result1 = decodeExportUri(export1 as string);
    const result2 = decodeExportUri(export2 as string);

    // When
    const status = checkBatchComplete([result1, result2]);

    // Then
    expect(status.isComplete).toBe(true);
    expect(status.scannedCount).toBe(2);
    expect(status.totalCount).toBe(2);
    expect(status.missingIndices).toHaveLength(0);
  });

  it('Should identify incomplete batch', () => {
    // Given - only first QR code scanned
    const export1 =
      testQrCodes['Google-auth-test2-qr1.png' as keyof typeof testQrCodes];
    const result1 = decodeExportUri(export1 as string);

    // When
    const status = checkBatchComplete([result1]);

    // Then
    expect(status.isComplete).toBe(false);
    expect(status.scannedCount).toBe(1);
    expect(status.totalCount).toBe(2);
    expect(status.missingIndices).toEqual([1]);
  });

  it('Should handle empty results', () => {
    const status = checkBatchComplete([]);

    expect(status.isComplete).toBe(false);
    expect(status.scannedCount).toBe(0);
    expect(status.totalCount).toBe(0);
    expect(status.missingIndices).toHaveLength(0);
  });

  it('Should handle single QR batch', () => {
    // Given - single QR code export (batch size 1)
    const export1 =
      testQrCodes['Google-auth-test-qr.png' as keyof typeof testQrCodes];
    const result1 = decodeExportUri(export1 as string);

    // When
    const status = checkBatchComplete([result1]);

    // Then
    expect(status.isComplete).toBe(true);
    expect(status.scannedCount).toBe(1);
    expect(status.totalCount).toBe(1);
  });
});

describe('Error handling', () => {
  it('Should throw for malformed base64 data', () => {
    const uri = 'otpauth-migration://offline?data=not-valid-base64!!!';
    expect(() => decodeExportUri(uri)).toThrow();
  });

  it('Should throw for invalid protobuf data', () => {
    // Valid base64 but not valid protobuf
    const uri = 'otpauth-migration://offline?data=SGVsbG8gV29ybGQ=';
    expect(() => decodeExportUri(uri)).toThrow();
  });
});
