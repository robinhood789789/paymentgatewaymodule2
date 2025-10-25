# API Key Security Implementation

## Overview

This document describes the comprehensive security measures implemented for Owner-level API keys and webhook secrets.

## Security Features

### 1. Step-up MFA Protection

All sensitive operations require step-up MFA verification:
- **Create API Key**: Requires recent MFA verification
- **Revoke API Key**: Requires recent MFA verification
- **Rotate Webhook Secret**: Requires recent MFA verification
- **Send Webhook Test**: Requires recent MFA verification

The MFA step-up window is configurable per tenant (default: 300 seconds).

### 2. Secure Storage

#### API Keys (bcrypt hashing)
- API key secrets are hashed using **bcrypt** with a work factor of 12
- Only hashes are stored in the database (`api_keys.hashed_secret`)
- Plain text secrets are only shown once during creation
- Secrets are never logged in plain text

#### Webhook Secrets (AES-GCM encryption)
- Webhook signing secrets are encrypted using **AES-GCM-256**
- Encryption keys are stored securely in environment variables
- Secrets are only shown in plain text during rotation
- Encrypted values are stored in `webhooks.secret`

### 3. API Authentication

Tenant APIs accept Bearer token authentication:

```bash
curl -H "Authorization: Bearer sk_live_..." \
     -H "X-Tenant: <tenant-id>" \
     https://your-api.com/endpoint
```

**Authentication Flow:**
1. Extract API key from `Authorization: Bearer` header
2. Validate key format and prefix
3. Query database for matching key (by prefix)
4. Compare provided key against bcrypt hash
5. Check if key is revoked
6. Apply rate limiting (per key + per IP)
7. Update `last_used_at` timestamp
8. Log API usage in audit logs

### 4. Rate Limiting

Two-tier rate limiting system:

#### Per API Key
- **Limit**: 100 requests per minute
- **Identifier**: `api_key:{api_key_id}`
- **Response**: HTTP 429 when exceeded

#### Per IP Address
- **Limit**: 200 requests per minute
- **Identifier**: `ip:{client_ip}`
- **Response**: HTTP 429 when exceeded

Rate limit windows:
- Window size: 60 seconds (sliding window)
- Old entries automatically cleaned up
- Stored in `rate_limits` table

### 5. Comprehensive Audit Logging

All key operations are logged with complete before/after states:

#### API Key Operations
- `api_key.created`: Includes key ID, name, prefix, creation timestamp
- `api_key.revoked`: Includes before (active state) and after (revoked state)
- `api_key.used`: Logs each API key usage with endpoint and timestamp

#### Webhook Operations
- `webhook.created`: Full webhook configuration
- `webhook.secret_rotated`: Before/after states (no plaintext secrets)
- `webhook.deleted`: Complete webhook info before deletion

**Audit Log Fields:**
- `actor_user_id`: Who performed the action
- `tenant_id`: Which tenant
- `action`: What was done
- `target`: What resource was affected
- `before`: State before change (JSON)
- `after`: State after change (JSON)
- `ip`: Client IP address
- `user_agent`: Client user agent
- `created_at`: When it happened

### 6. Security Best Practices

#### Never Log Plaintext Secrets
- API key secrets are never logged after creation
- Webhook secrets are never logged in any state
- Audit logs only contain metadata, never sensitive values

#### Generic Error Messages
- Authentication failures return generic "Invalid credentials"
- No information leakage about which part of authentication failed
- Prevents enumeration attacks

#### Constant-Time Comparison
- bcrypt provides constant-time hash comparison
- Prevents timing attacks on API key validation

#### Automatic Cleanup
- Old rate limit entries automatically purged
- Revoked keys cannot be used but are kept for audit trail

## Usage Examples

### Creating an API Key (with MFA)

```javascript
// Frontend automatically triggers MFA challenge
const response = await invokeFunctionWithTenant('api-keys-create', {
  body: { name: 'Production API Key' }
});

// Save this key immediately - it won't be shown again
console.log('API Key:', response.api_key.secret);
```

### Using an API Key

```javascript
const response = await fetch('https://api.example.com/payments', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'X-Tenant': tenantId,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ amount: 1000, currency: 'THB' })
});
```

### Rotating Webhook Secret (with MFA)

```javascript
// Frontend automatically triggers MFA challenge
const response = await invokeFunctionWithTenant('webhooks-rotate-secret', {
  body: { webhook_id: 'xxx-xxx-xxx' }
});

// Save this secret immediately - it won't be shown again
console.log('New Secret:', response.new_secret);
```

## Environment Variables

Required secrets for encryption:

```bash
# Generate a 256-bit key and base64 encode it
ENCRYPTION_KEY=<base64-encoded-32-byte-key>
```

To generate a secure key:

```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Database Schema

### api_keys table
```sql
- id: uuid
- tenant_id: uuid
- name: text
- prefix: text (full API key for matching)
- hashed_secret: text (bcrypt hash)
- last_used_at: timestamp
- revoked_at: timestamp
- created_at: timestamp
```

### webhooks table
```sql
- id: uuid
- tenant_id: uuid
- url: text
- secret: text (AES-GCM encrypted)
- enabled: boolean
- created_at: timestamp
- updated_at: timestamp
```

### rate_limits table
```sql
- id: uuid
- identifier: text (api_key:xxx or ip:xxx)
- endpoint: text
- count: integer
- window_start: timestamp
- created_at: timestamp
- updated_at: timestamp
```

## Security Checklist

- [x] Step-up MFA for all sensitive operations
- [x] bcrypt hashing for API key secrets
- [x] AES-GCM encryption for webhook secrets
- [x] Bearer token authentication support
- [x] Per-key rate limiting
- [x] Per-IP rate limiting
- [x] Complete audit logging with before/after
- [x] No plaintext secrets in logs
- [x] Generic error messages
- [x] Automatic last_used_at updates
- [x] Secure secret generation
- [x] Constant-time comparison

## Compliance

This implementation follows industry best practices for:
- PCI DSS (secure key storage)
- GDPR (audit logging, data protection)
- OWASP (API security guidelines)
- SOC 2 (access controls, logging)
