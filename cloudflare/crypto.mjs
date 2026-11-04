const encoder = new TextEncoder();
export async function keys(secret) {
  if (!/^[a-f\d]{64}$/i.test(secret || '')) throw new Error('encryption_not_configured');
  const raw = Uint8Array.from(secret.match(/../g), byte => parseInt(byte, 16));
  return {
    encryption: await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']),
    hashing: await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  };
}
export async function fingerprint(key, value) {
  const bytes = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function encrypt(key, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(value))));
  return JSON.stringify({ v: 1, iv: Array.from(iv), data: Array.from(bytes) });
}
export async function decrypt(key, value) {
  const envelope = JSON.parse(value);
  if (envelope.v !== 1) throw new Error('unsupported_encryption');
  const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(envelope.iv) }, key, new Uint8Array(envelope.data));
  return JSON.parse(new TextDecoder().decode(bytes));
}
