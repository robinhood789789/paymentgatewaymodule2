// Encryption utilities for sensitive data
// Uses Web Crypto API for AES-GCM encryption

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

// Get or generate encryption key from environment
const getEncryptionKey = async (): Promise<CryptoKey> => {
  const keyString = Deno.env.get('ENCRYPTION_KEY');
  
  if (!keyString) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }
  
  // Convert base64 key to ArrayBuffer
  const keyData = Uint8Array.from(atob(keyString), c => c.charCodeAt(0));
  
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
};

/**
 * Encrypt sensitive data (e.g., webhook secrets)
 */
export const encrypt = async (plaintext: string): Promise<string> => {
  const key = await getEncryptionKey();
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );
  
  // Combine IV and ciphertext, then base64 encode
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  return btoa(String.fromCharCode(...combined));
};

/**
 * Decrypt sensitive data
 */
export const decrypt = async (encrypted: string): Promise<string> => {
  const key = await getEncryptionKey();
  
  // Decode from base64
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  
  // Extract IV and ciphertext
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
};

/**
 * Generate a secure random string for secrets
 */
export const generateSecret = (length = 32): string => {
  const randomBytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};
