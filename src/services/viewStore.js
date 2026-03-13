const STORAGE_KEY = 'rda_saved_views';
const DEFAULT_KEY = 'rda_default_view';

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, val) {
  try { localStorage.setItem(key, val); } catch { /* storage blocked */ }
}

/**
 * Get all saved views.
 * @returns {{ id: string, name: string, state: object }[]}
 */
export function getSavedViews() {
  const raw = safeGet(STORAGE_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

/**
 * Save (or update) a view.
 */
export function saveView(view) {
  const views = getSavedViews();
  const idx = views.findIndex((v) => v.id === view.id);
  if (idx >= 0) {
    views[idx] = view;
  } else {
    views.push(view);
  }
  safeSet(STORAGE_KEY, JSON.stringify(views));
}

/**
 * Delete a view by ID.
 */
export function deleteView(id) {
  const views = getSavedViews().filter((v) => v.id !== id);
  safeSet(STORAGE_KEY, JSON.stringify(views));
  // If deleted view was the default, clear it
  if (getDefaultViewId() === id) {
    clearDefaultView();
  }
}

/**
 * Rename a view.
 */
export function renameView(id, newName) {
  const views = getSavedViews();
  const view = views.find((v) => v.id === id);
  if (view) {
    view.name = newName;
    safeSet(STORAGE_KEY, JSON.stringify(views));
  }
}

/**
 * Get the default view ID (auto-loads on startup).
 */
export function getDefaultViewId() {
  return safeGet(DEFAULT_KEY) || null;
}

/**
 * Set a view as the default.
 */
export function setDefaultView(id) {
  safeSet(DEFAULT_KEY, id);
}

/**
 * Clear the default view.
 */
export function clearDefaultView() {
  try { localStorage.removeItem(DEFAULT_KEY); } catch { /* */ }
}
