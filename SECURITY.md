# Security Policy

## Overview

The Google Authenticator Export Decoder is designed with **privacy and security as core principles**. This document outlines the security architecture, guarantees, and best practices.

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User's Browser                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                 PWA Sandbox                           │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │              Application Logic                  │  │  │
│  │  │                                                 │  │  │
│  │  │  QR Scan ──► Decode ──► Display ──► Export     │  │  │
│  │  │     │          │          │           │        │  │  │
│  │  │     ▼          ▼          ▼           ▼        │  │  │
│  │  │   Camera    Memory     Memory     Download     │  │  │
│  │  │   (temp)    (RAM)      (RAM)      (local)     │  │  │
│  │  │                                                 │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                        ❌                             │  │
│  │              No external connections                  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ❌ No data leaves the browser
                            │
                    ┌───────▼───────┐
                    │    Internet   │
                    └───────────────┘
```

## Security Guarantees

### Data Processing

| Guarantee | Implementation |
|-----------|----------------|
| **Client-Side Only** | All QR decoding, protobuf parsing, and export generation happens in JavaScript within the browser |
| **No Server Communication** | Zero network requests for data processing - verifiable via browser DevTools |
| **No Data Storage** | Secrets are held only in RAM; nothing written to localStorage, IndexedDB, or cookies |
| **No Logging** | No analytics, telemetry, or error reporting services |
| **Ephemeral Data** | All data is lost when the tab is closed or refreshed |

### TOTP Secret Handling

```
QR Code → Base64 Decode → Protobuf Parse → Base32 Convert → RAM → Export File
    │           │              │               │           │         │
    ▼           ▼              ▼               ▼           ▼         ▼
  Camera     Memory         Memory          Memory     Memory    Download
  (temp)     (temp)         (temp)          (temp)     (temp)    (local)
```

**At no point are secrets:**
- Sent to any server
- Stored persistently
- Logged or tracked
- Shared with third parties

### Network Security

| Aspect | Implementation |
|--------|----------------|
| **HTTPS Only** | GitHub Pages enforces HTTPS; Docker deployment should use reverse proxy with TLS |
| **CSP Headers** | Strict Content Security Policy prevents XSS and injection attacks |
| **No External Scripts** | Only self-hosted JavaScript; Google Fonts loaded via CSS only |
| **CORS Restricted** | No cross-origin requests for sensitive data |

## Content Security Policy

The nginx configuration enforces:

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data: blob:;
connect-src 'self';
media-src 'self' blob:;
object-src 'none';
frame-ancestors 'self';
```

## Dependency Security

### Automated Monitoring

- **Dependabot**: Weekly scans for npm and GitHub Actions vulnerabilities
- **npm audit**: Run during CI/CD pipeline
- **Minimal Dependencies**: Only essential packages included

### Key Dependencies

| Package | Purpose | Risk Level |
|---------|---------|------------|
| `react` | UI Framework | Low - Meta maintained |
| `html5-qrcode` | QR Scanning | Low - Camera access only |
| `protobufjs` | Binary Parsing | Low - No network |
| `i18next` | Translations | Low - Static files |

### Verification

```bash
# Check for vulnerabilities
npm audit

# View dependency tree
npm ls --all

# Check for outdated packages
npm outdated
```

## Docker Security

### Container Hardening

| Feature | Implementation |
|---------|----------------|
| **Minimal Base Image** | `nginx:1.27-alpine-slim` (~25MB) |
| **Read-Only Filesystem** | Root filesystem is read-only |
| **No New Privileges** | `security_opt: no-new-privileges` |
| **Resource Limits** | 128MB RAM, 0.5 CPU max |
| **Non-Root Worker** | nginx workers run as `nginx` user |
| **Health Checks** | Automatic container monitoring |

### Tmpfs Mounts

```yaml
tmpfs:
  - /var/cache/nginx:mode=1777,size=10m
  - /var/run:mode=1777,size=1m
  - /tmp:mode=1777,size=10m
```

## Threat Model

### In Scope

| Threat | Mitigation |
|--------|------------|
| **XSS Attacks** | CSP headers, React's built-in escaping |
| **Data Exfiltration** | No network requests, CSP connect-src |
| **Malicious QR Codes** | Strict protobuf schema validation |
| **Man-in-the-Middle** | HTTPS enforcement |
| **Dependency Attacks** | Dependabot, npm audit, minimal deps |

### Out of Scope

| Threat | Reason |
|--------|--------|
| **Physical Device Access** | User responsibility |
| **Malware on User Device** | Beyond application control |
| **Browser Vulnerabilities** | Vendor responsibility |
| **Social Engineering** | User education required |

## Verification Steps

Users can verify the security claims:

### 1. Network Inspection

```
1. Open DevTools (F12)
2. Go to Network tab
3. Scan a QR code
4. Verify: No requests contain TOTP secrets
```

### 2. Storage Inspection

```
1. Open DevTools (F12)
2. Go to Application tab
3. Check: localStorage, sessionStorage, IndexedDB, Cookies
4. Verify: No TOTP secrets stored
```

### 3. Source Code Audit

```
1. Clone repository
2. Search for fetch(), XMLHttpRequest, navigator.sendBeacon
3. Verify: No data exfiltration endpoints
```

### 4. Build Verification

```bash
# Build locally
npm ci
npm run build

# Compare with deployed version
# (hashes should match for same version)
```

## Incident Response

### Reporting Vulnerabilities

**Email**: [karl.bauer@bauer-group.com](mailto:karl.bauer@bauer-group.com)

**Please include:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested fix (if any)

### Response Timeline

| Severity | Initial Response | Resolution Target |
|----------|------------------|-------------------|
| Critical | 24 hours | 48 hours |
| High | 48 hours | 1 week |
| Medium | 1 week | 2 weeks |
| Low | 2 weeks | Next release |

## Best Practices for Users

### Before Using

1. **Verify HTTPS**: Ensure the padlock icon is visible
2. **Check URL**: Confirm you're on the official domain
3. **Update Browser**: Use the latest browser version

### During Use

1. **Private Environment**: Use in a private location
2. **Clear After**: Close the tab when finished
3. **Verify Export**: Check exported file contents before importing

### After Use

1. **Secure Export Files**: Encrypt or delete after import
2. **Don't Share**: Never share export files via email/chat
3. **Secure Backup**: If keeping backups, encrypt them

## Compliance

### Privacy Regulations

| Regulation | Compliance |
|------------|------------|
| **GDPR** | No personal data collected or processed server-side |
| **CCPA** | No sale or sharing of personal information |
| **HIPAA** | No health data handling |

### Security Standards

| Standard | Alignment |
|----------|-----------|
| **OWASP Top 10** | Mitigations for applicable categories |
| **CWE/SANS Top 25** | No dangerous constructs |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2025-01 | Initial security documentation |

---

**Your secrets stay yours.**
