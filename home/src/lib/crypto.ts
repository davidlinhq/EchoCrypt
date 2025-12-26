const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveAesKeyFromAddress(address: string): Promise<CryptoKey> {
  const normalized = address.trim().toLowerCase();
  if (!normalized.startsWith('0x') || normalized.length !== 42) throw new Error('Invalid key address.');
  const raw = new Uint8Array(20);
  for (let i = 0; i < 20; i++) raw[i] = parseInt(normalized.slice(2 + i * 2, 4 + i * 2), 16);
  const digest = await crypto.subtle.digest('SHA-256', raw);
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptTextWithAddressKey(plaintext: string, addressKey: string): Promise<string> {
  const key = await deriveAesKeyFromAddress(addressKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = encoder.encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return `v1:${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(ciphertext))}`;
}

export async function decryptTextWithAddressKey(payload: string, addressKey: string): Promise<string> {
  const parts = payload.split(':');
  if (parts.length !== 3 || parts[0] !== 'v1') throw new Error('Unsupported ciphertext format.');
  const iv = base64ToBytes(parts[1]);
  const data = base64ToBytes(parts[2]);
  const key = await deriveAesKeyFromAddress(addressKey);
  const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return decoder.decode(clear);
}

