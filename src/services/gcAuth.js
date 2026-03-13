const CLIENT_ID = '5fe6ef2a-158f-4e28-9b80-4566e2724639';
const GC_AUTH_URL = 'https://login.usw2.pure.cloud/oauth/authorize';
const REDIRECT_URI = 'https://krb3qy.github.io/Reporting-Dashboard-App/';
const TOKEN_KEY = 'gc_access_token';
const EXPIRY_KEY = 'gc_token_expiry';

// Safe localStorage wrapper — cross-origin iframes may block storage access
function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, val) {
  try { localStorage.setItem(key, val); } catch { /* storage blocked */ }
}
function safeRemove(key) {
  try { localStorage.removeItem(key); } catch { /* storage blocked */ }
}

/**
 * Initialize auth on page load.
 * 1. Check URL hash for access_token (OAuth callback) → store and return authenticated
 * 2. Check localStorage for valid token → return authenticated
 * 3. If localhost → return dev mode (mock data, no redirect)
 * 4. Otherwise → auto-redirect to GC login (user never sees unauthenticated state)
 */
export function init() {
  // 1. OAuth callback — token in URL hash
  const hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    const expiresIn = parseInt(params.get('expires_in'), 10);
    if (token) {
      safeSet(TOKEN_KEY, token);
      safeSet(EXPIRY_KEY, String(Date.now() + expiresIn * 1000));
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return { authenticated: true };
    }
  }

  // 2. Existing valid token
  const token = safeGet(TOKEN_KEY);
  const expiry = parseInt(safeGet(EXPIRY_KEY) || '0', 10);
  if (token && Date.now() < expiry) {
    return { authenticated: true };
  }

  // 3. Dev mode — localhost gets mock data, no redirect
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return { authenticated: false, dev: true };
  }

  // 4. Auto-redirect to GC login
  const params = new URLSearchParams({
    response_type: 'token',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
  });
  window.location.href = `${GC_AUTH_URL}?${params.toString()}`;
  return { authenticated: false };
}

/**
 * Get stored token if still valid.
 */
export function getToken() {
  const token = safeGet(TOKEN_KEY);
  const expiry = parseInt(safeGet(EXPIRY_KEY) || '0', 10);
  if (token && Date.now() < expiry) return token;
  return null;
}

/**
 * Check if user is authenticated.
 */
export function isAuthenticated() {
  return getToken() !== null;
}

/**
 * Clear stored token and reload to trigger re-auth.
 */
export function logout() {
  safeRemove(TOKEN_KEY);
  safeRemove(EXPIRY_KEY);
  window.location.reload();
}
