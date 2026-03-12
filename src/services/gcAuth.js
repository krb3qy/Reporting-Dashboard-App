const GC_AUTH_URL = 'https://login.usw2.pure.cloud/oauth/authorize';
const REDIRECT_URI = 'https://krb3qy.github.io/Reporting-Dashboard-App/';
const TOKEN_KEY = 'gc_access_token';
const EXPIRY_KEY = 'gc_token_expiry';

// Client ID will be set after GC OAuth client creation
let CLIENT_ID = localStorage.getItem('gc_client_id') || '';

export function setClientId(id) {
  CLIENT_ID = id;
  localStorage.setItem('gc_client_id', id);
}

export function getClientId() {
  return CLIENT_ID;
}

/**
 * Check URL hash for token on page load (Implicit Grant callback).
 * Returns true if a token was parsed and stored.
 */
export function handleAuthCallback() {
  const hash = window.location.hash;
  if (!hash || !hash.includes('access_token')) return false;

  const params = new URLSearchParams(hash.substring(1));
  const token = params.get('access_token');
  const expiresIn = parseInt(params.get('expires_in'), 10);

  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresIn * 1000));
    // Clean hash from URL
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    return true;
  }
  return false;
}

/**
 * Get stored token if still valid.
 */
export function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = parseInt(localStorage.getItem(EXPIRY_KEY) || '0', 10);
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
 * Redirect to GC login for Implicit Grant.
 */
export function login() {
  if (!CLIENT_ID) {
    throw new Error('OAuth Client ID not configured. Set it in Settings.');
  }

  const params = new URLSearchParams({
    response_type: 'token',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
  });

  window.location.href = `${GC_AUTH_URL}?${params.toString()}`;
}

/**
 * Clear stored token.
 */
export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
}
