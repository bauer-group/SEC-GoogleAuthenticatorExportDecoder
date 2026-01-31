import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Account } from '../types';
import {
  toCSV,
  toJSON,
  toBitwardenFormat,
  toBitwardenJSON,
  getFileExtension,
  getMimeType,
  generateFilename,
} from './exporters';

// =============================================================================
// Test Data
// =============================================================================

/**
 * Sample accounts for testing export functions
 */
const sampleAccounts: Account[] = [
  {
    name: 'user@example.com',
    issuer: 'GitHub',
    totpSecret: 'JBSWY3DPEHPK3PXP',
    algorithm: 'SHA1',
    digits: 'SIX',
    type: 'TOTP',
    counter: 0,
    uniqueId: 'abc123',
  },
  {
    name: 'admin@company.com',
    issuer: 'Google',
    totpSecret: 'HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ',
    algorithm: 'SHA256',
    digits: 'EIGHT',
    type: 'TOTP',
    counter: 0,
    uniqueId: 'def456',
  },
  {
    name: 'Counter Account',
    issuer: '',
    totpSecret: 'ABCD1234EFGH5678',
    algorithm: 'SHA512',
    digits: 'SEVEN',
    type: 'HOTP',
    counter: 5,
    uniqueId: 'ghi789',
  },
];

/**
 * Account with special characters for CSV escaping tests
 */
const specialCharAccount: Account = {
  name: 'user, with "quotes"',
  issuer: 'Company\nWith\nNewlines',
  totpSecret: 'TESTSPECIAL123',
  algorithm: 'SHA1',
  digits: 'SIX',
  type: 'TOTP',
  counter: 0,
  uniqueId: 'special',
};

// =============================================================================
// CSV Export Tests
// =============================================================================

describe('toCSV', () => {
  it('Should generate CSV with headers by default', () => {
    const csv = toCSV(sampleAccounts);
    const lines = csv.split('\n');

    // Should have header + 3 data rows
    expect(lines).toHaveLength(4);

    // Check header
    expect(lines[0]).toBe('name,issuer,totpSecret,algorithm,digits,type,counter');

    // Check first data row
    expect(lines[1]).toBe('user@example.com,GitHub,JBSWY3DPEHPK3PXP,SHA1,6,TOTP,0');
  });

  it('Should generate CSV without headers when option is false', () => {
    const csv = toCSV(sampleAccounts, { includeHeader: false });
    const lines = csv.split('\n');

    // Should have only data rows
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('user@example.com,GitHub,JBSWY3DPEHPK3PXP,SHA1,6,TOTP,0');
  });

  it('Should support custom delimiter', () => {
    const csv = toCSV(sampleAccounts.slice(0, 1), { delimiter: ';' });
    const lines = csv.split('\n');

    expect(lines[0]).toBe('name;issuer;totpSecret;algorithm;digits;type;counter');
    expect(lines[1]).toBe('user@example.com;GitHub;JBSWY3DPEHPK3PXP;SHA1;6;TOTP;0');
  });

  it('Should escape values containing commas', () => {
    const csv = toCSV([specialCharAccount]);
    const lines = csv.split('\n');

    // Name with comma should be quoted
    expect(lines[1]).toContain('"user, with ""quotes"""');
  });

  it('Should escape values containing double quotes', () => {
    const csv = toCSV([specialCharAccount]);

    // Quotes should be escaped by doubling
    expect(csv).toContain('""quotes""');
  });

  it('Should escape values containing newlines', () => {
    const csv = toCSV([specialCharAccount]);

    // Newlines should be preserved inside quotes
    expect(csv).toContain('"Company\nWith\nNewlines"');
  });

  it('Should handle empty accounts array', () => {
    const csv = toCSV([]);
    const lines = csv.split('\n');

    // Should only have header
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('name,issuer,totpSecret,algorithm,digits,type,counter');
  });

  it('Should convert algorithm enum to string', () => {
    const csv = toCSV(sampleAccounts);

    expect(csv).toContain('SHA1');
    expect(csv).toContain('SHA256');
    expect(csv).toContain('SHA512');
  });

  it('Should convert digit count to number', () => {
    const csv = toCSV(sampleAccounts);

    expect(csv).toContain(',6,');  // SIX
    expect(csv).toContain(',8,');  // EIGHT
    expect(csv).toContain(',7,');  // SEVEN
  });
});

// =============================================================================
// JSON Export Tests
// =============================================================================

describe('toJSON', () => {
  it('Should generate pretty-printed JSON by default', () => {
    const json = toJSON(sampleAccounts);
    const parsed = JSON.parse(json);

    // Should be valid JSON array
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(3);

    // Should be formatted with newlines
    expect(json).toContain('\n');
  });

  it('Should generate minified JSON when prettyPrint is false', () => {
    const json = toJSON(sampleAccounts, { prettyPrint: false });

    // Should be single line without extra spaces
    expect(json).not.toContain('\n');
    expect(json).not.toContain('  ');
  });

  it('Should use custom indent when specified', () => {
    const json = toJSON(sampleAccounts.slice(0, 1), { indent: 4 });

    // Should have 4-space indent
    expect(json).toContain('    "name"');
  });

  it('Should preserve all account fields', () => {
    const json = toJSON(sampleAccounts.slice(0, 1));
    const parsed = JSON.parse(json);

    expect(parsed[0]).toEqual({
      name: 'user@example.com',
      issuer: 'GitHub',
      totpSecret: 'JBSWY3DPEHPK3PXP',
      algorithm: 'SHA1',
      digits: 6,
      type: 'TOTP',
      counter: 0,
      uniqueId: 'abc123',
    });
  });

  it('Should convert digit count to number', () => {
    const json = toJSON(sampleAccounts);
    const parsed = JSON.parse(json);

    expect(parsed[0].digits).toBe(6);
    expect(parsed[1].digits).toBe(8);
    expect(parsed[2].digits).toBe(7);
  });

  it('Should handle empty accounts array', () => {
    const json = toJSON([]);
    const parsed = JSON.parse(json);

    expect(parsed).toEqual([]);
  });

  it('Should handle special characters in values', () => {
    const json = toJSON([specialCharAccount]);
    const parsed = JSON.parse(json);

    expect(parsed[0].name).toBe('user, with "quotes"');
    expect(parsed[0].issuer).toBe('Company\nWith\nNewlines');
  });
});

// =============================================================================
// Bitwarden Export Tests
// =============================================================================

describe('toBitwardenFormat', () => {
  it('Should generate valid Bitwarden export structure', () => {
    const result = toBitwardenFormat(sampleAccounts);

    expect(result).toHaveProperty('folders');
    expect(result).toHaveProperty('items');
    expect(Array.isArray(result.folders)).toBe(true);
    expect(Array.isArray(result.items)).toBe(true);
  });

  it('Should create one item per account', () => {
    const result = toBitwardenFormat(sampleAccounts);

    expect(result.items).toHaveLength(3);
  });

  it('Should set correct item type for login', () => {
    const result = toBitwardenFormat(sampleAccounts);

    for (const item of result.items) {
      expect(item.type).toBe(1); // 1 = login item
    }
  });

  it('Should generate unique IDs for each item', () => {
    const result = toBitwardenFormat(sampleAccounts);
    const ids = result.items.map((item) => item.id);

    // All IDs should be unique
    expect(new Set(ids).size).toBe(ids.length);

    // All IDs should be valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const id of ids) {
      expect(id).toMatch(uuidRegex);
    }
  });

  it('Should use issuer as item name when available', () => {
    const result = toBitwardenFormat(sampleAccounts);

    expect(result.items[0]!.name).toBe('GitHub');
    expect(result.items[1]!.name).toBe('Google');
  });

  it('Should use account name when issuer is empty', () => {
    const result = toBitwardenFormat(sampleAccounts);

    expect(result.items[2]!.name).toBe('Counter Account');
  });

  it('Should set username to account name', () => {
    const result = toBitwardenFormat(sampleAccounts);

    expect(result.items[0]!.login.username).toBe('user@example.com');
    expect(result.items[1]!.login.username).toBe('admin@company.com');
  });

  it('Should generate valid otpauth:// TOTP URI', () => {
    const result = toBitwardenFormat(sampleAccounts);
    const totpUri = result.items[0]!.login.totp;

    expect(totpUri).toMatch(/^otpauth:\/\/totp\//);
    expect(totpUri).toContain('secret=JBSWY3DPEHPK3PXP');
    expect(totpUri).toContain('issuer=GitHub');
    expect(totpUri).toContain('period=30');
  });

  it('Should generate valid otpauth:// HOTP URI with counter', () => {
    const result = toBitwardenFormat(sampleAccounts);
    const hotpUri = result.items[2]!.login.totp;

    expect(hotpUri).toMatch(/^otpauth:\/\/hotp\//);
    expect(hotpUri).toContain('counter=5');
  });

  it('Should include algorithm in URI when non-default', () => {
    const result = toBitwardenFormat(sampleAccounts);

    // SHA256 should be included
    expect(result.items[1]!.login.totp).toContain('algorithm=SHA256');

    // SHA512 should be included
    expect(result.items[2]!.login.totp).toContain('algorithm=SHA512');
  });

  it('Should include digits in URI when non-default', () => {
    const result = toBitwardenFormat(sampleAccounts);

    // 8 digits should be included
    expect(result.items[1]!.login.totp).toContain('digits=8');

    // 7 digits should be included
    expect(result.items[2]!.login.totp).toContain('digits=7');
  });

  it('Should not include algorithm in URI when SHA1 (default)', () => {
    const result = toBitwardenFormat(sampleAccounts);

    // First account uses SHA1, should not have algorithm param
    const uri = result.items[0]!.login.totp;
    expect(uri).not.toContain('algorithm=SHA1');
  });

  it('Should URL-encode special characters in URI', () => {
    const result = toBitwardenFormat([specialCharAccount]);
    const uri = result.items[0]!.login.totp;

    // Name with special characters should be encoded
    expect(uri).toContain(encodeURIComponent('user, with "quotes"'));
  });

  it('Should set default values for other fields', () => {
    const result = toBitwardenFormat(sampleAccounts);
    const item = result.items[0]!;

    expect(item.organizationId).toBeNull();
    expect(item.folderId).toBeNull();
    expect(item.reprompt).toBe(0);
    expect(item.notes).toBe('');
    expect(item.favorite).toBe(false);
    expect(item.collectionIds).toBeNull();
    expect(item.login.password).toBe('');
    expect(item.login.uris).toEqual([]);
  });

  it('Should handle empty accounts array', () => {
    const result = toBitwardenFormat([]);

    expect(result.folders).toEqual([]);
    expect(result.items).toEqual([]);
  });
});

describe('toBitwardenJSON', () => {
  it('Should return pretty-printed JSON by default', () => {
    const json = toBitwardenJSON(sampleAccounts);

    expect(json).toContain('\n');
    expect(JSON.parse(json)).toHaveProperty('items');
  });

  it('Should return minified JSON when prettyPrint is false', () => {
    const json = toBitwardenJSON(sampleAccounts, false);

    expect(json).not.toContain('\n');
    expect(JSON.parse(json)).toHaveProperty('items');
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('getFileExtension', () => {
  it('Should return .csv for csv format', () => {
    expect(getFileExtension('csv')).toBe('.csv');
  });

  it('Should return .json for json format', () => {
    expect(getFileExtension('json')).toBe('.json');
  });

  it('Should return .json for bitwarden format', () => {
    expect(getFileExtension('bitwarden')).toBe('.json');
  });
});

describe('getMimeType', () => {
  it('Should return text/csv for csv format', () => {
    expect(getMimeType('csv')).toBe('text/csv;charset=utf-8');
  });

  it('Should return application/json for json format', () => {
    expect(getMimeType('json')).toBe('application/json;charset=utf-8');
  });

  it('Should return application/json for bitwarden format', () => {
    expect(getMimeType('bitwarden')).toBe('application/json;charset=utf-8');
  });
});

describe('generateFilename', () => {
  beforeEach(() => {
    // Mock Date to have consistent timestamps in tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-15T14:30:45.123Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Should generate filename with timestamp and correct extension', () => {
    const filename = generateFilename('accounts', 'csv');

    expect(filename).toMatch(/^accounts-\d{8}-\d{6}\.csv$/);
  });

  it('Should use default prefix when not specified', () => {
    const filename = generateFilename();

    expect(filename).toMatch(/^totp-accounts-\d{8}-\d{6}\.json$/);
  });

  it('Should use .json for bitwarden format', () => {
    const filename = generateFilename('export', 'bitwarden');

    expect(filename).toMatch(/\.json$/);
  });

  it('Should generate unique timestamps', () => {
    const filename1 = generateFilename('test', 'json');

    // Advance time
    vi.advanceTimersByTime(1000);
    const filename2 = generateFilename('test', 'json');

    expect(filename1).not.toBe(filename2);
  });
});

// =============================================================================
// Edge Cases and Error Handling
// =============================================================================

describe('Edge cases', () => {
  it('Should handle account with empty name', () => {
    const account: Account = {
      name: '',
      issuer: 'TestIssuer',
      totpSecret: 'TESTSECRET123',
      algorithm: 'SHA1',
      digits: 'SIX',
      type: 'TOTP',
      counter: 0,
    };

    const csv = toCSV([account]);
    expect(csv).toContain(',TestIssuer,');

    const json = toJSON([account]);
    const parsed = JSON.parse(json);
    expect(parsed[0].name).toBe('');

    const bitwarden = toBitwardenFormat([account]);
    expect(bitwarden.items[0]!.name).toBe('TestIssuer');
  });

  it('Should handle account with empty issuer', () => {
    const account: Account = {
      name: 'TestName',
      issuer: '',
      totpSecret: 'TESTSECRET123',
      algorithm: 'SHA1',
      digits: 'SIX',
      type: 'TOTP',
      counter: 0,
    };

    const csv = toCSV([account]);
    expect(csv).toContain('TestName,,TESTSECRET123');

    const bitwarden = toBitwardenFormat([account]);
    expect(bitwarden.items[0]!.name).toBe('TestName');
  });

  it('Should handle account with both empty name and issuer', () => {
    const account: Account = {
      name: '',
      issuer: '',
      totpSecret: 'TESTSECRET123',
      algorithm: 'SHA1',
      digits: 'SIX',
      type: 'TOTP',
      counter: 0,
    };

    const bitwarden = toBitwardenFormat([account]);
    expect(bitwarden.items[0]!.name).toBe('Unnamed Account');
  });

  it('Should handle DIGIT_COUNT_UNSPECIFIED as 6 digits', () => {
    const account: Account = {
      name: 'Test',
      issuer: 'Test',
      totpSecret: 'TESTSECRET123',
      algorithm: 'SHA1',
      digits: 'DIGIT_COUNT_UNSPECIFIED',
      type: 'TOTP',
      counter: 0,
    };

    const json = toJSON([account]);
    const parsed = JSON.parse(json);
    expect(parsed[0].digits).toBe(6);
  });

  it('Should handle ALGORITHM_UNSPECIFIED as SHA1', () => {
    const account: Account = {
      name: 'Test',
      issuer: 'Test',
      totpSecret: 'TESTSECRET123',
      algorithm: 'ALGORITHM_UNSPECIFIED',
      digits: 'SIX',
      type: 'TOTP',
      counter: 0,
    };

    const csv = toCSV([account]);
    expect(csv).toContain('SHA1');

    // SHA1 is default, so it should not appear in Bitwarden URI
    const bitwarden = toBitwardenFormat([account]);
    expect(bitwarden.items[0]!.login.totp).not.toContain('algorithm=');
  });

  it('Should handle very long secret', () => {
    const longSecret = 'A'.repeat(256);
    const account: Account = {
      name: 'LongSecret',
      issuer: 'Test',
      totpSecret: longSecret,
      algorithm: 'SHA1',
      digits: 'SIX',
      type: 'TOTP',
      counter: 0,
    };

    const csv = toCSV([account]);
    expect(csv).toContain(longSecret);

    const json = toJSON([account]);
    const parsed = JSON.parse(json);
    expect(parsed[0].totpSecret).toBe(longSecret);
  });

  it('Should handle large counter value for HOTP', () => {
    const account: Account = {
      name: 'LargeCounter',
      issuer: 'Test',
      totpSecret: 'TESTSECRET123',
      algorithm: 'SHA1',
      digits: 'SIX',
      type: 'HOTP',
      counter: 999999999,
    };

    const bitwarden = toBitwardenFormat([account]);
    expect(bitwarden.items[0]!.login.totp).toContain('counter=999999999');
  });
});
