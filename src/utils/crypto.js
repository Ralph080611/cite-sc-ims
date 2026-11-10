// Demo-grade password hashing (salted SHA-256 via Web Crypto).
// NOT production-secure: it runs in the browser and the hash is visible in localStorage.
const SALT = 'citesc:';

export async function hashPassword(password) {
  const data = new TextEncoder().encode(SALT + password);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
